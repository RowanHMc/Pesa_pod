import uuid
from urllib.parse import urlencode, urlsplit, urlunsplit

from django.conf import settings
from django.core import signing
from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied, ValidationError

from . import daraja, services
from .models import Contribution, SavingsCycle, SavingsRound, Transaction


# Cancellation, an unreachable handset, or an invalid PIN.
FINAL_FAILURE_CODES = {"1032", "1037", "2001"}
CALLBACK_SALT = "transactions.daraja.stk-callback"


@transaction.atomic
def _reserve_checkout(user, contribution_id, phone):
    _, cycle, round_, contribution = services.lock_contribution(contribution_id)
    membership = contribution.membership

    if membership.user_id != user.pk or not membership.is_active:
        raise PermissionDenied("Only the active member can pay this contribution.")

    if (
        cycle.status != SavingsCycle.Status.ACTIVE
        or round_.status != SavingsRound.Status.ACTIVE
        or contribution.status != Contribution.Status.PENDING
    ):
        raise ValidationError("This contribution is no longer accepting payments.")

    existing = contribution.transactions.filter(
        status__in=services.ACTIVE_REPORT_STATUSES,
    ).first()
    if existing:
        if (
            existing.status == Transaction.Status.PENDING
            and existing.phone_number == phone
        ):
            return existing, False
        raise ValidationError("An active payment already exists for this contribution.")

    services.apply_penalty_if_due(contribution, round_, cycle)
    amount = contribution.total_due
    if amount < 1 or amount != amount.to_integral_value():
        raise ValidationError("STK Push requires a whole-shilling amount of at least KES 1.")

    payment_id = uuid.uuid4()
    payment = Transaction.objects.create(
        id=payment_id,
        contribution=contribution,
        reported_by=user,
        amount=amount,
        method=Transaction.Method.MPESA,
        reference=f"STK-{payment_id.hex.upper()}",
        phone_number=phone,
    )
    return payment, True


def start_checkout(user, contribution_id, phone):
    callback_url = urlsplit(settings.DARAJA_CALLBACK_URL)
    if callback_url.scheme != "https" or not callback_url.hostname:
        raise ValidationError("Configure a public HTTPS Daraja callback URL.")

    payment, created = _reserve_checkout(user, contribution_id, phone)
    if not created:
        return payment

    signer = signing.Signer(salt=CALLBACK_SALT)
    attempt = urlencode({"attempt": signer.sign(str(payment.pk))})
    query = "&".join(filter(None, (callback_url.query, attempt)))
    signed_url = urlunsplit(callback_url._replace(query=query, fragment=""))

    try:
        result = daraja.initiate_stk_push(
            payment.amount,
            phone,
            payment.id.hex,
            callback_url=signed_url,
        )
    except daraja.DarajaCheckoutRejected:
        Transaction.objects.filter(
            pk=payment.pk,
            status=Transaction.Status.PENDING,
            checkout_request_id__isnull=True,
        ).update(
            status=Transaction.Status.FAILED,
            completed_at=timezone.now(),
            daraja_result_description="Daraja declined to start the checkout.",
        )
    except daraja.DarajaAuthenticationError:
        # Daraja may have accepted the request before the connection timed out.
        Transaction.objects.filter(
            pk=payment.pk,
            status=Transaction.Status.PENDING,
            checkout_request_id__isnull=True,
        ).update(
            daraja_result_description="Checkout initiation outcome is unknown.",
        )
    else:
        Transaction.objects.filter(
            pk=payment.pk,
            status=Transaction.Status.PENDING,
            checkout_request_id__isnull=True,
        ).update(
            checkout_request_id=result["CheckoutRequestID"],
            merchant_request_id=result["MerchantRequestID"],
        )

    payment.refresh_from_db()
    return payment

def process_callback(attempt, checkout_id, merchant_id):
    signer = signing.Signer(salt=CALLBACK_SALT)
    try:
        payment_id = uuid.UUID(signer.unsign(attempt))
    except (signing.BadSignature, ValueError) as error:
        raise PermissionDenied("Invalid Daraja callback URL.") from error

    payment = Transaction.objects.filter(
        pk=payment_id,
        phone_number__isnull=False,
    ).first()
    if payment is None:
        raise PermissionDenied("Invalid Daraja callback URL.")

    if payment.checkout_request_id and (
        payment.checkout_request_id != checkout_id
        or payment.merchant_request_id != merchant_id
    ):
        raise ValidationError("Callback does not match the Daraja checkout.")

    if payment.status != Transaction.Status.PENDING:
        return payment

    result = daraja.query_stk_push(checkout_id)
    if result.get("MerchantRequestID") != merchant_id:
        raise ValidationError("Callback does not match the Daraja checkout.")

    # The callback can arrive before the STK initiation response is saved.
    if not payment.checkout_request_id:
        Transaction.objects.filter(
            pk=payment.pk,
            status=Transaction.Status.PENDING,
            checkout_request_id__isnull=True,
        ).update(
            checkout_request_id=checkout_id,
            merchant_request_id=merchant_id,
        )
        payment.refresh_from_db()

        if (
            payment.checkout_request_id != checkout_id
            or payment.merchant_request_id != merchant_id
        ):
            raise ValidationError("Callback does not match the Daraja checkout.")

    return _apply_checkout_result(payment, result)

def refresh_checkout(payment):
    """Verify a pending checkout directly with Daraja."""
    if (
        payment.status != Transaction.Status.PENDING
        or not payment.checkout_request_id
    ):
        return payment

    result = daraja.query_stk_push(payment.checkout_request_id)
    if result.get("MerchantRequestID") != payment.merchant_request_id:
        raise daraja.DarajaAuthenticationError(
            "Daraja returned a different merchant request."
        )

    return _apply_checkout_result(payment, result)


def _apply_checkout_result(payment, result):
    code = str(result.get("ResultCode"))
    if code != "0" and code not in FINAL_FAILURE_CODES:
        return payment

    description = str(result.get("ResultDesc") or "")[:255]
    return _settle_checkout(payment, code, description)


@transaction.atomic
def _settle_checkout(payment, code, description):
    chama, cycle, round_, contribution = services.lock_contribution(
        payment.contribution_id
    )
    payment = Transaction.objects.select_for_update().get(pk=payment.pk)

    # A repeated callback or status refresh may arrive after settlement.
    if payment.status != Transaction.Status.PENDING:
        return payment

    now = timezone.now()
    payment.status = (
        Transaction.Status.CONFIRMED if code == "0" else Transaction.Status.FAILED
    )
    payment.daraja_result_code = code
    payment.daraja_result_description = description
    payment.completed_at = now
    payment.save(update_fields=[
        "status",
        "daraja_result_code",
        "daraja_result_description",
        "completed_at",
    ])

    if payment.status == Transaction.Status.CONFIRMED:
        services.mark_contribution_paid(
            payment, contribution, round_, cycle, chama, now
        )

    return payment
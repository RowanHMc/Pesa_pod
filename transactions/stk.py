from django.db import transaction
from django.utils import timezone

from . import daraja, services
from .models import Transaction


# Cancellation, an unreachable handset, or an invalid PIN.
FINAL_FAILURE_CODES = {"1032", "1037", "2001"}


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
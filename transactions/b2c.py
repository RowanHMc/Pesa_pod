import re
import uuid
from urllib.parse import urlencode, urlsplit

from django.conf import settings
from django.core import signing
from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied, ValidationError

from pesapod.models import Membership

from . import daraja, services
from .models import Payout, SavingsCycle, SavingsRound, Transaction


CALLBACK_SALT = "transactions.daraja.b2c"


@transaction.atomic
def _reserve_payout(user, round_id):
    chama, cycle, round_ = services.lock_round(round_id)
    services.require_role(
        user,
        chama.pk,
        Membership.Role.TREASURER,
        "Only the treasurer can initiate a payout.",
    )

    if cycle.status != SavingsCycle.Status.ACTIVE:
        raise ValidationError("The savings cycle is not active.")
    if round_.status != SavingsRound.Status.COLLECTED:
        raise ValidationError("All contributions must be paid before a payout.")

    if round_.payouts.filter(status__in=services.ACTIVE_PAYOUT_STATUSES).exists():
        raise ValidationError("An active payout already exists for this round.")

    amount = services.round_pot(round_)
    if amount < 1 or amount != amount.to_integral_value():
        raise ValidationError("B2C requires a whole-shilling payout of at least KES 1.")

    recipient = round_.recipient
    phone = (recipient.user.phone_number or "").removeprefix("+")
    if not recipient.is_active or not recipient.user.is_active:
        raise ValidationError("The payout recipient is no longer active.")
    if not re.fullmatch(r"254[17][0-9]{8}", phone):
        raise ValidationError("The recipient needs a valid Kenyan mobile number.")

    payout_id = uuid.uuid4()
    return Payout.objects.create(
        id=payout_id,
        round=round_,
        recorded_by=user,
        recipient_phone=phone,
        amount=amount,
        method=Transaction.Method.MPESA,
        reference=f"B2C-{payout_id.hex.upper()}",
        status=Payout.Status.PENDING,
    )


def start_payout(user, round_id):
    if settings.DARAJA_ENVIRONMENT != "sandbox" or not all((
        settings.DARAJA_B2C_SHORTCODE,
        settings.DARAJA_B2C_INITIATOR_NAME,
        settings.DARAJA_B2C_SECURITY_CREDENTIAL,
    )):
        raise ValidationError("Configure the Daraja B2C sandbox credentials first.")

    base_url = settings.DARAJA_B2C_CALLBACK_BASE_URL.rstrip("/")
    parsed = urlsplit(base_url)
    if (
        parsed.scheme != "https"
        or not parsed.hostname
        or parsed.path
        or parsed.query
        or parsed.fragment
        or parsed.username is not None
    ):
        raise ValidationError("Configure a public HTTPS origin for B2C callbacks.")

    payout = _reserve_payout(user, round_id)

    signer = signing.Signer(salt=CALLBACK_SALT)
    result_query = urlencode({"attempt": signer.sign(f"{payout.pk}:result")})
    timeout_query = urlencode({"attempt": signer.sign(f"{payout.pk}:timeout")})
    callback_root = f"{base_url}/api/transactions/daraja"

    pending = Payout.objects.filter(pk=payout.pk, status=Payout.Status.PENDING)
    try:
        result = daraja.initiate_b2c_payout(
            amount=payout.amount,
            phone_number=payout.recipient_phone,
            result_url=f"{callback_root}/b2c-result/?{result_query}",
            timeout_url=f"{callback_root}/b2c-timeout/?{timeout_query}",
        )
    except daraja.DarajaCheckoutRejected:
        pending.filter(conversation_id__isnull=True).update(
            status=Payout.Status.FAILED,
            daraja_result_description="Daraja declined the payout request.",
            daraja_completed_at=timezone.now(),
        )
    except daraja.DarajaAuthenticationError:
        # Safaricom may have accepted the transfer before the response was lost.
        pending.filter(conversation_id__isnull=True).update(
            daraja_result_description="The payout submission outcome is unknown.",
        )
    else:
        pending.filter(conversation_id__isnull=True).update(
            conversation_id=result["ConversationID"],
            originator_conversation_id=result["OriginatorConversationID"],
        )

    payout.refresh_from_db()
    return payout

def _callback_payout_id(attempt, kind):
    signer = signing.Signer(salt=CALLBACK_SALT)
    try:
        signed_value = signer.unsign(attempt)
        raw_id, signed_kind = signed_value.rsplit(":", 1)
        payout_id = uuid.UUID(raw_id)
    except (signing.BadSignature, ValueError) as error:
        raise PermissionDenied("Invalid B2C callback URL.") from error

    if signed_kind != kind:
        raise PermissionDenied("Invalid B2C callback URL.")

    return payout_id


def process_result(attempt, payload):
    payout_id = _callback_payout_id(attempt, "result")

    result = payload.get("Result") if isinstance(payload, dict) else None
    if not isinstance(result, dict):
        raise ValidationError("Missing B2C result.")

    conversation_id = result.get("ConversationID")
    originator_id = result.get("OriginatorConversationID")
    if not all(
        isinstance(value, str) and 0 < len(value) <= 100
        for value in (conversation_id, originator_id)
    ):
        raise ValidationError("Invalid B2C conversation IDs.")

    raw_code = result.get("ResultCode")
    if type(raw_code) not in (int, str):
        raise ValidationError("Invalid B2C result code.")
    code = str(raw_code)
    if not re.fullmatch(r"[0-9]{1,20}", code):
        raise ValidationError("Invalid B2C result code.")

    receipt = result.get("TransactionID")
    if code == "0" and not (
        isinstance(receipt, str) and 0 < len(receipt.strip()) <= 100
    ):
        raise ValidationError("The successful B2C result is missing a receipt.")

    return _apply_result(
        payout_id, result, conversation_id, originator_id, code
    )


@transaction.atomic
def _apply_result(payout_id, result, conversation_id, originator_id, code):
    round_id = Payout.objects.filter(
        pk=payout_id,
        recipient_phone__isnull=False,
    ).values_list("round_id", flat=True).first()
    if round_id is None:
        raise PermissionDenied("Invalid B2C callback URL.")

    chama, _, round_ = services.lock_round(round_id)
    payout = Payout.objects.select_for_update().get(pk=payout_id)

    if (
        payout.conversation_id not in (None, conversation_id)
        or payout.originator_conversation_id not in (None, originator_id)
    ):
        raise ValidationError("The result does not match this B2C payout.")

    if payout.status != Payout.Status.PENDING:
        return payout

    # The result may arrive before start_payout saves the response IDs.
    payout.conversation_id = conversation_id
    payout.originator_conversation_id = originator_id
    payout.daraja_result_code = code
    payout.daraja_result_description = str(result.get("ResultDesc") or "")
    payout.daraja_callback_data = {"Result": result}
    payout.daraja_completed_at = timezone.now()

    if code == "0":
        payout.status = Payout.Status.SENT
        payout.mpesa_receipt = result["TransactionID"].strip().upper()
    else:
        payout.status = Payout.Status.FAILED

    payout.save(update_fields=[
        "conversation_id",
        "originator_conversation_id",
        "daraja_result_code",
        "daraja_result_description",
        "daraja_callback_data",
        "daraja_completed_at",
        "status",
        "mpesa_receipt",
    ])

    if payout.status == Payout.Status.SENT:
        services.events.payout_sent(payout, round_, chama, payout.recorded_by)

    return payout


def process_timeout(attempt):
    payout_id = _callback_payout_id(attempt, "timeout")

    # A queue timeout leaves the transfer outcome uncertain.
    Payout.objects.filter(
        pk=payout_id,
        recipient_phone__isnull=False,
        status=Payout.Status.PENDING,
    ).update(
        daraja_result_description=(
            "Daraja reported a queue timeout. The transfer outcome is unknown."
        ),
    )
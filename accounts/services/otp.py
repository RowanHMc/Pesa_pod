import secrets
from datetime import timedelta

from django.conf import settings
from django.contrib.auth.hashers import check_password, make_password
from django.db import transaction
from django.utils import timezone

from accounts.models import EmailOTP

# Results of check_code()
OK = "ok"
INVALID = "invalid"
LOCKED = "locked"


def otp_expiry_minutes():
    return getattr(settings, "ACCOUNTS_OTP_EXPIRY_MINUTES", 10)


def otp_max_attempts():
    return getattr(settings, "ACCOUNTS_OTP_MAX_ATTEMPTS", 5)


def issue_code(user, purpose):
    """Create a fresh code for the user, retiring any unused ones. Returns the plain code."""
    code = f"{secrets.randbelow(1_000_000):06d}"
    with transaction.atomic():
        EmailOTP.objects.filter(user=user, purpose=purpose, is_used=False).update(
            is_used=True
        )
        EmailOTP.objects.create(
            user=user,
            purpose=purpose,
            code_hash=make_password(code),
            expires_at=timezone.now() + timedelta(minutes=otp_expiry_minutes()),
        )
    return code


def check_code(user, purpose, code):
    """Check a submitted code. Returns OK, INVALID or LOCKED.

    Results are returned, not raised, so a wrong guess's attempt counter is
    committed even when the caller is inside a transaction.
    """
    with transaction.atomic():
        otp = (
            EmailOTP.objects.select_for_update()
            .filter(user=user, purpose=purpose, is_used=False)
            .order_by("-created_at")
            .first()
        )
        if otp is None or otp.expires_at <= timezone.now():
            return INVALID
        if otp.attempts >= otp_max_attempts():
            return LOCKED
        if not check_password(code, otp.code_hash):
            otp.attempts += 1
            otp.save(update_fields=["attempts"])
            return INVALID
        otp.is_used = True
        otp.save(update_fields=["is_used"])
        return OK

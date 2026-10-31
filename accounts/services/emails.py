import logging

from django.conf import settings
from django.core.mail import send_mail

from .otp import otp_expiry_minutes

logger = logging.getLogger(__name__)


def _send(subject, body, recipient):
    """Send one email. Never raises: a failed send must not turn into a 500,
    because the user can always ask for a new code."""
    try:
        send_mail(
            subject,
            body,
            getattr(settings, "DEFAULT_FROM_EMAIL", None),
            [recipient],
            fail_silently=False,
        )
        return True
    except Exception:
        logger.exception("Failed to send email to user")
        return False


def send_verification_code(user, code):
    minutes = otp_expiry_minutes()
    return _send(
        "Verify your email address",
        f"Hello {user.username},\n\n"
        f"Your verification code is {code}.\n"
        f"It expires in {minutes} minutes.\n\n"
        "If you did not create an account, you can ignore this email.",
        user.email,
    )


def send_password_reset_code(user, code):
    minutes = otp_expiry_minutes()
    return _send(
        "Your password reset code",
        f"Hello {user.username},\n\n"
        f"Your password reset code is {code}.\n"
        f"It expires in {minutes} minutes.\n\n"
        "If you did not ask to reset your password, you can ignore this email.",
        user.email,
    )

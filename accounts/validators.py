import phonenumbers
from django.conf import settings
from django.core.exceptions import ValidationError


def normalize_phone_number(value):
    """Return the number in E.164 form (e.g. +254712345678) or raise ValidationError.

    Numbers typed without a country code are read as belonging to
    settings.DEFAULT_PHONE_REGION (default "KE"), so 0712345678 and
    +254712345678 become the same stored value.
    """
    raw = (value or "").strip()
    region = getattr(settings, "DEFAULT_PHONE_REGION", "KE")
    try:
        parsed = phonenumbers.parse(raw, region)
    except phonenumbers.NumberParseException:
        raise ValidationError("Enter a valid phone number.", code="invalid_phone")
    if not phonenumbers.is_valid_number(parsed):
        raise ValidationError("Enter a valid phone number.", code="invalid_phone")
    return phonenumbers.format_number(parsed, phonenumbers.PhoneNumberFormat.E164)


def validate_phone_number(value):
    """Model/form validator wrapper around normalize_phone_number."""
    normalize_phone_number(value)
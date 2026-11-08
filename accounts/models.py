from django.conf import settings
from django.contrib.auth.models import AbstractUser
from django.db import models

from .managers import UserManager
from .validators import normalize_phone_number, validate_phone_number


class User(AbstractUser):
    # Username keeps AbstractUser's definition (150 chars, unique, validated).
    # Email is the verified contact; phone is a unique contact number only.
    email = models.EmailField(unique=True)
    phone_number = models.CharField(
        max_length=16,  # E.164: "+" plus up to 15 digits
        unique=True,
        validators=[validate_phone_number],
    )
    is_email_verified = models.BooleanField(default=False)

    REQUIRED_FIELDS = ["email", "phone_number"]

    objects = UserManager()

    def save(self, *args, **kwargs):
        # Normalise here as well as in the serializer so users created from
        # the admin, the shell or createsuperuser follow the same rules.
        self.username = self.username.strip().lower()
        self.email = self.email.strip().lower()
        if self.phone_number:
            self.phone_number = normalize_phone_number(self.phone_number)
        super().save(*args, **kwargs)




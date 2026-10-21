from django.db import models
from django.contrib.auth.models import AbstractUser
from django.conf import settings


class User(AbstractUser):
    username= models.CharField(
        unique=True,
        max_length=50,
        blank=False,
        )
    phone_number =models.CharField(
        max_length=15,
        blank= False,
    )
    is_phone_verified = models.BooleanField(default=False)

    email = models.EmailField(
        unique=True
    )
    USERNAME_FIELD = 'username'
    REQUIRED_FIELDS =["email","phone_number",]


# OTP 
class PhoneOTP(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete = models.CASCADE,
        related_name="phone_otps",
    )
    code_hash = models.CharField(max_length=130)
    created_at = models.DateTimeField(auto_now=True)
    expires_at = models.DateTimeField()
    attempts = models.PositiveSmallIntegerField(default=0)
    is_used =models.BooleanField(default=False)

    def __str__(self):
        return f"OTP for {self.user.phone_number}"
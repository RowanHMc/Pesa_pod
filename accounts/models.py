from django.db import models
from django.contrib.auth.models import AbstractUser


class User(AbstractUser):
    username= models.CharField(
        unique=True,
        max_length=50,
        blank=False,
        )
    phone_number =models.CharField(
        max_length=15,
        unique=True,
    )
    is_phone_verified = models.BooleanField(default=False)

    email = models.EmailField(
        unique=True
    )
    USERNAME_FIELD = 'username'
    REQUIRED_FIELDS =["email","phone_number",]
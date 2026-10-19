from django.db import models
from django.contrib.auth.models import AbstractUser


class User(AbstractUser):
    username= models.CharField(
        max_length=50,
        blank=True,
        )
    phone_number =models.CharField(
        max_length=15,
        unique=True,
    )
    is_phone_verified = models.BooleanField(default=False)
    
    email = models.EmailField(
        unique=True
    )
    USERNAME_FIELD = 'phone_number'
    REQUIRED_FIELDS =["email",]
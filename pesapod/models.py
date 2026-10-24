from django.db import models
import uuid
from django.conf import settings

# Create your models here.

class Chama(models.Model):
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    name = models.CharField(max_length=150)
    description = models.TextField(
        blank=True,
    )

    created_by = models.ForeignKey(
      settings.AUTH_USER_MODEL,  
      on_delete=models.PROTECT,
      related_name="created_chamas",
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
    )
    is_active = models.BooleanField(
        default=True,
    )
    def __str__(self):
        return self.name

class Membership(models.Model):
    class Role(models.TextChoices):
        CHAIRPERSON = "chairperson","Chairperson"
        TREASURER = "treasurer", "Treasurer"
        MEMBER = "member", "Member"

    chama = models.ForeignKey(
        Chama,
        on_delete=models.PROTECT,
        related_name="memberships",
    )

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="chama_memberships",
    )

    role =models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.MEMBER,
    )
    joined_at = models.DateTimeField(auto_now_add=True,)

    is_active = models.BooleanField(default=True,)

    left_at = models.DateTimeField(
        null=True,
        blank=True,
    )
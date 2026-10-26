from django.db import models
from django.db.models import Q
from django.conf import settings
from django.core.validators import MinValueValidator

from decimal import Decimal

import uuid

# Create your models here.
class SavingsCycle(models.Model):
    class Frequency(models.TextChoices):
        WEEKLY = "weekly", "Weekly"
        MONTHLY ="monthly", "Monthly"

    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        ACTIVE = "active", "Active"
        COMPLETED = "completed", "Completed"
        CANCELLED = "cancelled", "Cancelled"

    id =models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )

    chama = models.ForeignKey(
        "pesapod.Chama",
        on_delete=models.PROTECT,
        related_name="savings_cycle",
    )

    contribution_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[
            MinValueValidator(Decimal("0.01"))
        ],
    )

    frequency = models.CharField(
        max_length=10,
        choices=Frequency.choices,
    )
    start_date = models.DateField()

    status = models.DateField(
        max_length=15,
        choices=Status.choices,
        default=Status.DRAFT,
    )

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="created_saings_cycles",
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )
    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["chama"],
                condition=Q(status="active"),
                name="unique_active_savings_cycle",
            ),
            models.CheckConstraint(
                condition=Q(contribution_amount__gt=0),
                name ="positive_cycle_contribution",
            ),
        ]
    def __str__(self):
        return f"{self.name} - {self.frequency} ([self.status])"
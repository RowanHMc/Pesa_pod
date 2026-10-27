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

    status = models.CharField(
        max_length=15,
        choices=Status.choices,
        default=Status.DRAFT,
    )

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="created_savings_cycles",
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
        return f"{self.chama.name} - {self.frequency} ([self.status])"

class SavingsRound(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        ACTIVE = "active", "Active"
        COMPLETED = "completed", "Completed"
        CANCELLED = "cancelled", "Cancelled"

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )
    cycle = models.ForeignKey(
        SavingsCycle,
        on_delete=models.PROTECT,
        related_name="rounds",
    )
    round_number = models.PositiveIntegerField()

    recipient = models.ForeignKey(
        "pesapod.MEmbership",
        on_delete=models.PROTECT,
        related_name="payout_rounds",
    )

    due_date = models.DateField()

    status = models.DateField(
        max_length=15,
        choices=Status.choices,
        default=Status.PENDING,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )
    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["cycle","round_number"],
                name= "unique_cycle_round_number",
            ),
            models.CheckConstraint(
                condition=Q(round_number__gte=1),
                name="positive_round_number",
            ),
        ]
        ordering = ["round_number"]

    def __str__(self):
        return f"{self.cycle.chama.name} - Round {self.round_number}"
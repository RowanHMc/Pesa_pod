import uuid
from decimal import Decimal

from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models
from django.db.models import Q


class SavingsCycle(models.Model):
    class Frequency(models.TextChoices):
        WEEKLY = "weekly", "Weekly"
        MONTHLY = "monthly", "Monthly"

    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        ACTIVE = "active", "Active"
        COMPLETED = "completed", "Completed"
        CANCELLED = "cancelled", "Cancelled"

    # A chama may have only one cycle that is not finished.
    OPEN_STATUSES = (Status.DRAFT, Status.ACTIVE)

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    chama = models.ForeignKey(
        "pesapod.Chama",
        on_delete=models.PROTECT,
        related_name="savings_cycles",
    )
    contribution_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.01"))],
    )
    # Set from the number of active members when the cycle is created and
    # again when it is activated, so everyone is paid exactly once.
    number_of_rounds = models.PositiveIntegerField(
        default=1,
        validators=[MinValueValidator(1)],
    )
    frequency = models.CharField(max_length=10, choices=Frequency.choices)
    start_date = models.DateField()
    status = models.CharField(
        max_length=15,
        choices=Status.choices,
        default=Status.DRAFT,
    )
    payout_order = models.JSONField(default=list, blank=True, editable=False)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="created_savings_cycles",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    cancelled_at = models.DateTimeField(null=True, blank=True)
    cancellation_reason = models.CharField(max_length=200, blank=True, default="")

    class Meta:
        ordering = ["-created_at", "id"]
        constraints = [
            # Covers drafts as well as active cycles.
            models.UniqueConstraint(
                fields=["chama"],
                condition=Q(status__in=["draft", "active"]),
                name="unique_open_savings_cycle",
            ),
            models.CheckConstraint(
                condition=Q(contribution_amount__gt=0),
                name="positive_cycle_contribution",
            ),
            models.CheckConstraint(
                condition=Q(number_of_rounds__gte=1),
                name="positive_number_of_rounds",
            ),
        ]

    def __str__(self):
        return f"{self.chama.name} - {self.frequency} ({self.status})"


class SavingsRound(models.Model):
    class Status(models.TextChoices):
        ACTIVE = "active", "Active"  # collecting contributions
        COLLECTED = "collected", "Collected"  # all paid, waiting for the payout
        COMPLETED = "completed", "Completed"  # recipient confirmed the payout
        CANCELLED = "cancelled", "Cancelled"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    cycle = models.ForeignKey(
        SavingsCycle,
        on_delete=models.PROTECT,
        related_name="rounds",
    )
    round_number = models.PositiveIntegerField()
    recipient = models.ForeignKey(
        "pesapod.Membership",
        on_delete=models.PROTECT,
        related_name="payout_rounds",
    )
    due_date = models.DateField()
    status = models.CharField(
        max_length=15,
        choices=Status.choices,
        default=Status.ACTIVE,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    collected_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["round_number"]
        constraints = [
            models.UniqueConstraint(
                fields=["cycle", "round_number"],
                name="unique_cycle_round_number",
            ),
            models.CheckConstraint(
                condition=Q(round_number__gte=1),
                name="positive_round_number",
            ),
        ]

    def __str__(self):
        return f"{self.cycle.chama.name} - Round {self.round_number}"


class Contribution(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        PAID = "paid", "Paid"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    round = models.ForeignKey(
        SavingsRound,
        on_delete=models.PROTECT,
        related_name="contributions",
    )
    membership = models.ForeignKey(
        "pesapod.Membership",
        on_delete=models.PROTECT,
        related_name="contributions",
    )
    amount_due = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.01"))],
    )
    # Late penalty, added once after the due date (see services.py).
    penalty_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
    )
    penalty_applied_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(
        max_length=10,
        choices=Status.choices,
        default=Status.PENDING,
    )
    paid_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at", "id"]
        constraints = [
            models.UniqueConstraint(
                fields=["round", "membership"],
                name="unique_round_membership_contribution",
            ),
            models.CheckConstraint(
                condition=Q(amount_due__gt=0),
                name="positive_contribution_amount",
            ),
            models.CheckConstraint(
                condition=Q(penalty_amount__gte=0),
                name="non_negative_contribution_penalty",
            ),
        ]

    @property
    def total_due(self):
        return self.amount_due + self.penalty_amount

    def __str__(self):
        return f"{self.membership.user.username} - Round {self.round.round_number}"


class Transaction(models.Model):
    """A member's report that they paid a contribution. The treasurer
    confirms or rejects it."""

    class Method(models.TextChoices):
        MPESA = "mpesa", "M-Pesa"
        BANK = "bank", "Bank Transfer"
        CASH = "cash", "Cash"

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        CONFIRMED = "confirmed", "Confirmed"
        REJECTED = "rejected", "Rejected"
        # Set by the system when a cycle is cancelled while a report is open.
        VOIDED = "voided", "Voided"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    contribution = models.ForeignKey(
        Contribution,
        on_delete=models.PROTECT,
        related_name="transactions",
    )
    reported_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="reported_transactions",
    )
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="reviewed_transactions",
        null=True,
        blank=True,
    )
    amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.01"))],
    )
    method = models.CharField(max_length=10, choices=Method.choices)
    # Stored trimmed and upper-case. Only pending/confirmed reports hold on to
    # a reference, so a rejected one can be used again.
    reference = models.CharField(max_length=100)
    status = models.CharField(
        max_length=10,
        choices=Status.choices,
        default=Status.PENDING,
    )
    rejection_reason = models.CharField(max_length=200, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at", "id"]
        constraints = [
            models.CheckConstraint(
                condition=Q(amount__gt=0),
                name="positive_transaction_amount",
            ),
            models.UniqueConstraint(
                fields=["contribution"],
                condition=Q(status__in=["pending", "confirmed"]),
                name="one_active_transaction_per_contribution",
            ),
            models.UniqueConstraint(
                fields=["reference"],
                condition=Q(status__in=["pending", "confirmed"]),
                name="unique_active_transaction_reference",
            ),
            models.CheckConstraint(
                condition=(
                    Q(
                        status__in=["pending", "voided"],
                        reviewed_by__isnull=True,
                        reviewed_at__isnull=True,
                    )
                    | Q(
                        status__in=["confirmed", "rejected"],
                        reviewed_by__isnull=False,
                        reviewed_at__isnull=False,
                    )
                ),
                name="transaction_review_audit_consistency",
            ),
        ]

    def save(self, *args, **kwargs):
        self.reference = self.reference.strip().upper()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.reference} - {self.amount} ({self.status})"


class Payout(models.Model):
    """The treasurer's record of paying the collected money to the round's
    recipient. The recipient confirms receipt, which completes the round."""

    class Status(models.TextChoices):
        SENT = "sent", "Sent"  # recorded by the treasurer, awaiting the recipient
        CONFIRMED = "confirmed", "Confirmed"
        REJECTED = "rejected", "Rejected"  # the recipient says it did not arrive

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    round = models.ForeignKey(
        SavingsRound,
        on_delete=models.PROTECT,
        related_name="payouts",
    )
    recorded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="recorded_payouts",
    )
    confirmed_by = models.ForeignKey(
    settings.AUTH_USER_MODEL,
    on_delete=models.PROTECT,
    related_name="confirmed_payouts",
    null=True,
    blank=True,
)

    confirmation_note = models.CharField(
    max_length=200,
    blank=True,
    default="",
)
    # Worked out by the system from the confirmed contributions.
    amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.01"))],
    )
    method = models.CharField(max_length=10, choices=Transaction.Method.choices)
    reference = models.CharField(max_length=100)
    status = models.CharField(
        max_length=10,
        choices=Status.choices,
        default=Status.SENT,
    )
    rejection_reason = models.CharField(max_length=200, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    responded_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at", "id"]
        constraints = [
            models.CheckConstraint(
                condition=Q(amount__gt=0),
                name="positive_payout_amount",
            ),
            models.UniqueConstraint(
                fields=["round"],
                condition=Q(status__in=["sent", "confirmed"]),
                name="one_active_payout_per_round",
            ),
            models.UniqueConstraint(
                fields=["reference"],
                condition=Q(status__in=["sent", "confirmed"]),
                name="unique_active_payout_reference",
            ),
            models.CheckConstraint(
                condition=(
                    Q(status="sent", responded_at__isnull=True)
                    | Q(
                        status__in=["confirmed", "rejected"],
                        responded_at__isnull=False,
                    )
                ),
                name="payout_response_consistency",
            ),
            models.CheckConstraint(
                condition=(
                Q(status="confirmed", confirmed_by__isnull=False)
                | Q(status__in=["sent", "rejected"], confirmed_by__isnull=True)
    ),
    name="payout_confirmation_audit_consistency",
),
        ]

    def save(self, *args, **kwargs):
        self.reference = self.reference.strip().upper()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Payout {self.reference} - {self.amount} ({self.status})"

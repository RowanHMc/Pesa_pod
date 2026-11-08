import uuid
from django.db import models
from django.conf import settings
from django.db import models
from django.db.models import Q

# Create your models here.

class Notification(models.Model):
    """One message to one person. This table is the in-app history; email is
    only a delivery channel on top of it."""

    class Category(models.TextChoices):
        # Someone is waiting on you. Emailed straight away.
        TASK = "task", "Task"
        # Due and overdue nudges. Go into the daily email.
        REMINDER = "reminder", "Reminder"
        # Things that happened. Go into the daily email.
        UPDATE = "update", "Update"

    class Kind(models.TextChoices):
        # --- tasks
        PAYMENT_REPORTED = "payment_reported", "Payment awaiting review"
        PAYMENT_REJECTED = "payment_rejected", "Payment rejected"
        PAYOUT_TO_RECORD = "payout_to_record", "Payout to record"
        PAYOUT_SENT = "payout_sent", "Payout to confirm"
        PAYOUT_REJECTED = "payout_rejected", "Payout rejected"
        PAYOUT_STALLED = "payout_stalled", "Payout not confirmed"
        # --- reminders
        CONTRIBUTION_DUE_SOON = "contribution_due_soon", "Contribution due soon"
        CONTRIBUTION_DUE_TODAY = "contribution_due_today", "Contribution due today"
        CONTRIBUTION_OVERDUE = "contribution_overdue", "Contribution overdue"
        CONTRIBUTION_LAST_FREE_DAY = "contribution_last_free_day", "Last day before penalty"
        PENALTY_APPLIED = "penalty_applied", "Late penalty added"
        OVERDUE_SUMMARY = "overdue_summary", "Overdue contributions"
        REVIEW_REMINDER = "review_reminder", "Payments waiting for review"
        PAYOUT_RECORD_REMINDER = "payout_record_reminder", "Payout waiting to be recorded"
        PAYOUT_CONFIRM_REMINDER = "payout_confirm_reminder", "Payout waiting for you"
        # --- updates
        CYCLE_ACTIVATED = "cycle_activated", "Cycle started"
        ROUND_OPENED = "round_opened", "Round opened"
        PAYMENT_CONFIRMED = "payment_confirmed", "Payment confirmed"
        ROUND_COLLECTED = "round_collected", "Round collected"
        PAYOUT_CONFIRMED = "payout_confirmed", "Payout confirmed"
        CYCLE_COMPLETED = "cycle_completed", "Cycle completed"
        CYCLE_CANCELLED = "cycle_cancelled", "Cycle cancelled"

    class EmailStatus(models.TextChoices):
        PENDING = "pending", "Waiting to be emailed"
        SENT = "sent", "Emailed"
        FAILED = "failed", "Email failed (will retry)"
        SKIPPED = "skipped", "Not emailed"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notifications",
    )
    kind = models.CharField(max_length=40, choices=Kind.choices)
    category = models.CharField(max_length=10, choices=Category.choices)
    title = models.CharField(max_length=120)
    body = models.CharField(max_length=500)
    chama = models.ForeignKey(
        "pesapod.Chama",
        on_delete=models.PROTECT,
        related_name="notifications",
        null=True,
        blank=True,
    )
    # Ids for deep links in the app (cycle_id, round_id, payment_id, ...).
    data = models.JSONField(default=dict, blank=True)
    # What this notification is about, e.g. "payment_reported:<payment id>".
    # Unique per recipient, so rerunning a job can never notify twice.
    dedupe_key = models.CharField(max_length=200)
    read_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    email_status = models.CharField(
        max_length=10,
        choices=EmailStatus.choices,
        default=EmailStatus.SKIPPED,
    )
    email_attempts = models.PositiveSmallIntegerField(default=0)
    emailed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at", "id"]
        constraints = [
            models.UniqueConstraint(
                fields=["recipient", "dedupe_key"],
                name="unique_notification_per_recipient_event",
            ),
        ]
        indexes = [
            models.Index(fields=["recipient", "-created_at"], name="notif_recipient_recent"),
            models.Index(fields=["recipient", "read_at"], name="notif_recipient_read"),
            models.Index(
                fields=["email_status", "category"],
                name="notif_email_queue",
                condition=Q(email_status__in=["pending", "failed"]),
            ),
        ]

    @property
    def is_read(self):
        return self.read_at is not None

    def __str__(self):
        return f"{self.recipient_id} - {self.kind}"


CATEGORY_BY_KIND = {
    Notification.Kind.PAYMENT_REPORTED: Notification.Category.TASK,
    Notification.Kind.PAYMENT_REJECTED: Notification.Category.TASK,
    Notification.Kind.PAYOUT_TO_RECORD: Notification.Category.TASK,
    Notification.Kind.PAYOUT_SENT: Notification.Category.TASK,
    Notification.Kind.PAYOUT_REJECTED: Notification.Category.TASK,
    Notification.Kind.PAYOUT_STALLED: Notification.Category.TASK,
    Notification.Kind.CONTRIBUTION_DUE_SOON: Notification.Category.REMINDER,
    Notification.Kind.CONTRIBUTION_DUE_TODAY: Notification.Category.REMINDER,
    Notification.Kind.CONTRIBUTION_OVERDUE: Notification.Category.REMINDER,
    Notification.Kind.CONTRIBUTION_LAST_FREE_DAY: Notification.Category.REMINDER,
    Notification.Kind.PENALTY_APPLIED: Notification.Category.REMINDER,
    Notification.Kind.OVERDUE_SUMMARY: Notification.Category.REMINDER,
    Notification.Kind.REVIEW_REMINDER: Notification.Category.REMINDER,
    Notification.Kind.PAYOUT_RECORD_REMINDER: Notification.Category.REMINDER,
    Notification.Kind.PAYOUT_CONFIRM_REMINDER: Notification.Category.REMINDER,
    Notification.Kind.CYCLE_ACTIVATED: Notification.Category.UPDATE,
    Notification.Kind.ROUND_OPENED: Notification.Category.UPDATE,
    Notification.Kind.PAYMENT_CONFIRMED: Notification.Category.UPDATE,
    Notification.Kind.ROUND_COLLECTED: Notification.Category.UPDATE,
    Notification.Kind.PAYOUT_CONFIRMED: Notification.Category.UPDATE,
    Notification.Kind.CYCLE_COMPLETED: Notification.Category.UPDATE,
    Notification.Kind.CYCLE_CANCELLED: Notification.Category.UPDATE,
}


class NotificationPreference(models.Model):
    """Which kinds of notification are also emailed. The in-app notification
    is always created, whatever these say. Created on first use."""

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notification_preferences",
    )
    email_tasks = models.BooleanField(default=True)
    email_reminders = models.BooleanField(default=True)
    email_updates = models.BooleanField(default=True)
    updated_at = models.DateTimeField(auto_now=True)

    def wants_email(self, category):
        return {
            Notification.Category.TASK: self.email_tasks,
            Notification.Category.REMINDER: self.email_reminders,
            Notification.Category.UPDATE: self.email_updates,
        }[category]

    def __str__(self):
        return f"Preferences of {self.user_id}"

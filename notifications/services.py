"""The notification engine. Other apps call notify() and nothing else here.

- notify() writes the in-app notification in the caller's transaction, so there
  is never a notification without the event (and never an event whose
  notification was lost).
- Tasks are emailed right after the transaction commits. Reminders and updates
  wait for the daily digest, which sends one email per person.
- Email problems never break the action that caused the notification.
"""
import logging
from datetime import timedelta

from django.conf import settings
from django.core.mail import send_mail
from django.db import transaction
from django.db.models import F, Q
from django.utils import timezone

from .models import CATEGORY_BY_KIND, Notification, NotificationPreference

logger = logging.getLogger(__name__)

Category = Notification.Category
EmailStatus = Notification.EmailStatus

MAX_EMAIL_ATTEMPTS = 3
DIGEST_MAX_AGE_DAYS = 7
DIGEST_MAX_LINES = 20


# --- helpers -----------------------------------------------------------------


def retention_days():
    return int(getattr(settings, "NOTIFICATION_RETENTION_DAYS", 90))


def app_url():
    return getattr(settings, "FRONTEND_URL", "").rstrip("/")


def _can_email(user):
    return bool(user.email) and user.is_active and getattr(user, "is_email_verified", True)


_LOOK_UP = object()


def _wants_email(user, category, preferences=_LOOK_UP):
    """Whether this person should get this category by email. Preferences are
    read again when sending, so switching a category off takes effect at once.
    Pass None for "this person has no preferences row" (nothing switched off)."""
    if not _can_email(user):
        return False
    if preferences is _LOOK_UP:
        preferences = NotificationPreference.objects.filter(user=user).first()
    return True if preferences is None else preferences.wants_email(category)


# --- creating ----------------------------------------------------------------


def notify(recipients, kind, title, body, *, dedupe_key, chama=None, data=None, exclude=()):
    """Create the notification for each recipient (once per recipient and
    dedupe_key). Call it inside the transaction that changes the data.

    `exclude` lists people who should not hear about their own action.
    Returns the notifications that were newly created."""
    category = CATEGORY_BY_KIND[kind]
    excluded = {user.pk for user in exclude}
    users = {user.pk: user for user in recipients if user.pk not in excluded}
    if not users:
        return []

    preferences = {
        p.user_id: p for p in NotificationPreference.objects.filter(user_id__in=users)
    }
    created = []
    for user in users.values():
        wants_email = _wants_email(user, category, preferences.get(user.pk))
        notification, was_created = Notification.objects.get_or_create(
            recipient=user,
            dedupe_key=dedupe_key,
            defaults={
                "kind": kind,
                "category": category,
                "title": title[:120],
                "body": body[:500],
                "chama": chama,
                "data": {key: str(value) for key, value in (data or {}).items()},
                "email_status": EmailStatus.PENDING if wants_email else EmailStatus.SKIPPED,
            },
        )
        if not was_created:
            continue
        created.append(notification)
        if wants_email and category == Category.TASK:
            transaction.on_commit(lambda pk=notification.pk: _send_task_email_safely(pk))
    return created


# --- sending -----------------------------------------------------------------


def _record_attempt(ids, sent):
    if sent:
        Notification.objects.filter(pk__in=ids).update(
            email_status=EmailStatus.SENT,
            emailed_at=timezone.now(),
            email_attempts=F("email_attempts") + 1,
        )
    else:
        Notification.objects.filter(pk__in=ids).update(
            email_status=EmailStatus.FAILED,
            email_attempts=F("email_attempts") + 1,
        )


def _send(user, subject, lines, ids):
    """One email. Never raises; records the outcome on the notifications."""
    link = app_url()
    body = "\n".join(
        [f"Hello {user.username},", ""]
        + lines
        + ["", f"Open Pesapod to see the details{': ' + link if link else '.'}"]
    )
    try:
        send_mail(subject, body, getattr(settings, "DEFAULT_FROM_EMAIL", None), [user.email])
    except Exception:
        logger.exception("Could not email notification(s) %s", ids)
        _record_attempt(ids, sent=False)
        return False
    _record_attempt(ids, sent=True)
    return True


def _line(notification):
    chama = notification.chama.name if notification.chama_id else None
    return f"- {notification.title}" + (f" ({chama})" if chama else "")


def send_task_email(notification_id):
    """Email one task notification. Runs after commit and by the retry job.
    The email carries the title only; amounts and names stay in the app."""
    notification = (
        Notification.objects.select_related("recipient", "chama")
        .filter(
            pk=notification_id,
            category=Category.TASK,
            email_status__in=[EmailStatus.PENDING, EmailStatus.FAILED],
            email_attempts__lt=MAX_EMAIL_ATTEMPTS,
        )
        .first()
    )
    if notification is None:
        return False
    user = notification.recipient
    if not _wants_email(user, notification.category):
        Notification.objects.filter(pk=notification.pk).update(email_status=EmailStatus.SKIPPED)
        return False
    return _send(
        user,
        f"Pesapod: {notification.title}",
        [_line(notification)],
        [notification.pk],
    )


def _send_task_email_safely(notification_id):
    """After-commit hook: whatever goes wrong here must not turn a committed
    action into an error for the person who made it."""
    try:
        send_task_email(notification_id)
    except Exception:
        logger.exception("Task email for notification %s failed", notification_id)


def send_daily_digests(now=None):
    """One email per person listing their reminders and updates. Returns how
    many emails went out."""
    now = now or timezone.now()
    queue = (
        Notification.objects.select_related("recipient", "chama")
        .filter(
            category__in=[Category.REMINDER, Category.UPDATE],
            email_status__in=[EmailStatus.PENDING, EmailStatus.FAILED],
            email_attempts__lt=MAX_EMAIL_ATTEMPTS,
            created_at__gte=now - timedelta(days=DIGEST_MAX_AGE_DAYS),
        )
        .order_by("recipient_id", "created_at")
    )
    by_user = {}
    for notification in queue:
        by_user.setdefault(notification.recipient_id, []).append(notification)

    sent = 0
    for items in by_user.values():
        user = items[0].recipient
        preferences = NotificationPreference.objects.filter(user=user).first()
        wanted = [n for n in items if _wants_email(user, n.category, preferences)]
        unwanted = [n.pk for n in items if n not in wanted]
        if unwanted:
            Notification.objects.filter(pk__in=unwanted).update(email_status=EmailStatus.SKIPPED)
        if not wanted:
            continue
        shown = wanted[:DIGEST_MAX_LINES]
        lines = [_line(n) for n in shown]
        if len(wanted) > len(shown):
            lines.append(f"- and {len(wanted) - len(shown)} more")
        count = len(wanted)
        subject = "Pesapod: 1 update for you" if count == 1 else f"Pesapod: {count} updates for you"
        if _send(user, subject, lines, [n.pk for n in wanted]):
            sent += 1
    return sent


def retry_task_emails(now=None):
    """Retry task emails that failed, and ones whose after-commit send never
    ran (for example the server restarted). Returns how many were sent."""
    now = now or timezone.now()
    ids = list(
        Notification.objects.filter(
            category=Category.TASK,
            email_attempts__lt=MAX_EMAIL_ATTEMPTS,
            created_at__gte=now - timedelta(days=2),
        )
        .filter(
            # PENDING ones get ten minutes before they count as missed.
            Q(email_status=EmailStatus.FAILED)
            | Q(
                email_status=EmailStatus.PENDING,
                created_at__lte=now - timedelta(minutes=10),
            )
        )
        .values_list("pk", flat=True)
    )
    return sum(1 for pk in ids if send_task_email(pk))


# --- reading and housekeeping -------------------------------------------------


def mark_read(queryset, now=None):
    """Mark the given notifications read. Returns how many changed."""
    return queryset.filter(read_at__isnull=True).update(read_at=now or timezone.now())


def cleanup_old_notifications(now=None):
    """Delete notifications older than the retention period (90 days by
    default). Returns how many were deleted."""
    cutoff = (now or timezone.now()) - timedelta(days=retention_days())
    deleted, _ = Notification.objects.filter(created_at__lt=cutoff).delete()
    return deleted

"""Everything that has to happen once a day, in order. Run by the daily-jobs
endpoint (called from GitHub Actions) or `manage.py run_daily_jobs`.

Each step is idempotent and isolated: one failing never stops the others, and
running the whole thing twice does no harm."""
import logging

from . import services

logger = logging.getLogger(__name__)


def run_daily_jobs():
    # Imported here so this app does not depend on transactions at load time.
    from transactions import reminders
    from transactions import services as transaction_services

    steps = [
        # Penalties first so the penalty notices land in today's digest.
        ("penalties", transaction_services.apply_late_penalties),
        ("contribution_reminders", reminders.send_contribution_reminders),
        ("overdue_summaries", reminders.send_overdue_summaries),
        ("review_reminders", reminders.send_review_reminders),
        ("payout_reminders", reminders.send_payout_reminders),
        # The digest goes after every step that creates notifications.
        ("daily_digests", services.send_daily_digests),
        ("email_retries", services.retry_task_emails),
        ("cleanup", services.cleanup_old_notifications),
    ]
    results = {}
    for name, step in steps:
        try:
            results[name] = {"ok": True, "count": step()}
        except Exception as exc:
            logger.exception("Daily job step %s failed", name)
            results[name] = {"ok": False, "error": f"{type(exc).__name__}: {exc}"}
    return results

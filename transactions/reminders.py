# after notifications
"""Daily checks that create reminder notifications. Each function works out
what is due from the data, so it is safe to run more than once a day: the
notification's dedupe key makes a repeat a no-op. Each returns how many
notifications it created.

Dates are Africa/Nairobi dates (timezone.localdate), so "due in 3 days" means
three days in Nairobi whatever time the scheduler fires."""
from datetime import timedelta

from django.db.models import Count
from django.utils import timezone

from notifications.models import Notification
from notifications.services import notify
from pesapod.models import Chama, Membership

from . import services
from .events import _day, _ids, chama_users
from .models import Contribution, Payout, SavingsCycle, SavingsRound, Transaction

Kind = Notification.Kind
Role = Membership.Role

LIVE_REPORTS = [Transaction.Status.PENDING, Transaction.Status.CONFIRMED]


def _contribution_reminder_days():
    """Days from today to the due date (negative = overdue) -> notification
    kind: 3 and 1 days before, the due date, 1 day overdue, and the last
    penalty-free day."""
    days = {
        3: Kind.CONTRIBUTION_DUE_SOON,
        1: Kind.CONTRIBUTION_DUE_SOON,
        0: Kind.CONTRIBUTION_DUE_TODAY,
        -1: Kind.CONTRIBUTION_OVERDUE,
    }
    percent, grace_days = services.penalty_rule()
    if percent > 0 and grace_days >= 1:
        days[-grace_days] = Kind.CONTRIBUTION_LAST_FREE_DAY
    return days


def _reminder_text(kind, days, contribution, chama):
    round_number = contribution.round.round_number
    owed = contribution.total_due
    due = _day(contribution.round.due_date)
    if kind == Kind.CONTRIBUTION_DUE_SOON:
        when = "tomorrow" if days == 1 else f"in {days} days"
        return (
            f"Contribution due {when}",
            f"{chama.name}: your round {round_number} contribution of {owed} is due {due}.",
        )
    if kind == Kind.CONTRIBUTION_DUE_TODAY:
        return (
            "Contribution due today",
            f"{chama.name}: your round {round_number} contribution of {owed} is due today.",
        )
    if kind == Kind.CONTRIBUTION_LAST_FREE_DAY:
        penalty = services.penalty_amount_for(contribution)
        return (
            "Last day before a late penalty",
            f"{chama.name}: pay your round {round_number} contribution of {owed} by the "
            f"end of today. After that a late penalty of {penalty} is added.",
        )
    return (
        "Contribution overdue",
        f"{chama.name}: your round {round_number} contribution of {owed} was due {due}.",
    )


def send_contribution_reminders(today=None):
    today = today or timezone.localdate()
    kinds = _contribution_reminder_days()
    by_due_date = {today + timedelta(days=days): days for days in kinds}

    contributions = (
        Contribution.objects.filter(
            status=Contribution.Status.PENDING,
            round__status=SavingsRound.Status.ACTIVE,
            round__cycle__status=SavingsCycle.Status.ACTIVE,
            membership__is_active=True,
            round__due_date__in=list(by_due_date),
        )
        # Someone who already reported payment is waiting on the treasurer,
        # not late.
        .exclude(transactions__status__in=LIVE_REPORTS)
        .select_related("membership__user", "round__cycle__chama")
    )
    count = 0
    for contribution in contributions:
        days = by_due_date[contribution.round.due_date]
        kind = kinds[days]
        chama = contribution.round.cycle.chama
        title, body = _reminder_text(kind, days, contribution, chama)
        count += len(
            notify(
                [contribution.membership.user],
                kind,
                title,
                body,
                dedupe_key=f"contribution_reminder:{contribution.pk}:{days}",
                chama=chama,
                data=_ids(
                    chama, contribution.round.cycle, contribution.round, contribution
                ),
            )
        )
    return count


def send_overdue_summaries(today=None):
    """Tell the treasurer and chairperson who is overdue, once a day."""
    today = today or timezone.localdate()
    rounds = SavingsRound.objects.filter(
        status=SavingsRound.Status.ACTIVE,
        cycle__status=SavingsCycle.Status.ACTIVE,
        due_date__lt=today,
    ).select_related("cycle__chama")
    count = 0
    for round_ in rounds:
        overdue = list(
            Contribution.objects.filter(
                round=round_,
                status=Contribution.Status.PENDING,
                membership__is_active=True,
            )
            .exclude(transactions__status__in=LIVE_REPORTS)
            .select_related("membership__user")
        )
        if not overdue:
            continue
        chama = round_.cycle.chama
        names = sorted(c.membership.user.username for c in overdue)
        shown = ", ".join(names[:10]) + (" and others" if len(names) > 10 else "")
        count += len(
            notify(
                chama_users(chama.pk, Role.TREASURER) + chama_users(chama.pk, Role.CHAIRPERSON),
                Kind.OVERDUE_SUMMARY,
                "Overdue contributions",
                f"{chama.name}: {len(overdue)} member(s) have not paid round "
                f"{round_.round_number}, due {_day(round_.due_date)}: {shown}.",
                dedupe_key=f"overdue_summary:{round_.pk}:{today}",
                chama=chama,
                data=_ids(chama, round_.cycle, round_),
            )
        )
    return count


def send_review_reminders(now=None):
    """Nudge a treasurer who has left payment reports waiting over a day."""
    now = now or timezone.now()
    today = timezone.localdate(now)
    waiting = (
        Transaction.objects.filter(
            status=Transaction.Status.PENDING,
            created_at__lte=now - timedelta(hours=24),
            contribution__round__status=SavingsRound.Status.ACTIVE,
            contribution__round__cycle__status=SavingsCycle.Status.ACTIVE,
        )
        .values("contribution__round__cycle__chama_id")
        .annotate(total=Count("pk"))
    )
    count = 0
    for row in waiting:
        chama = Chama.objects.get(pk=row["contribution__round__cycle__chama_id"])
        count += len(
            notify(
                chama_users(chama.pk, Role.TREASURER),
                Kind.REVIEW_REMINDER,
                "Payments waiting for review",
                f"{chama.name}: {row['total']} payment report(s) have been waiting "
                "more than a day for your review.",
                dedupe_key=f"review_reminder:{chama.pk}:{today}",
                chama=chama,
                data={"chama_id": chama.pk},
            )
        )
    return count


def send_payout_reminders(now=None):
    """Payout chores that can hold up a whole chama:
    - the treasurer has not recorded a payout for a collected round;
    - the recipient has not answered a payout (reminded on each day before the
      escalation period ends);
    - the recipient still has not answered after the escalation period, so the
      chairperson is told they can confirm on the recipient's behalf."""
    now = now or timezone.now()
    today = timezone.localdate(now)
    count = 0

    unrecorded = (
        SavingsRound.objects.filter(
            status=SavingsRound.Status.COLLECTED,
            cycle__status=SavingsCycle.Status.ACTIVE,
            collected_at__lte=now - timedelta(hours=24),
        )
        .exclude(payouts__status__in=services.ACTIVE_PAYOUT_STATUSES)
        .select_related("cycle__chama", "recipient__user")
    )
    for round_ in unrecorded:
        chama = round_.cycle.chama
        count += len(
            notify(
                chama_users(chama.pk, Role.TREASURER),
                Kind.PAYOUT_RECORD_REMINDER,
                "Payout waiting to be recorded",
                f"{chama.name}: round {round_.round_number} has been fully collected "
                f"for over a day. Pay {round_.recipient.user.username} and record it.",
                dedupe_key=f"payout_record_reminder:{round_.pk}:{today}",
                chama=chama,
                data=_ids(chama, round_.cycle, round_),
            )
        )

    escalation_days = services.payout_escalation_days()
    waiting = Payout.objects.filter(
        status=Payout.Status.SENT,
        round__status=SavingsRound.Status.COLLECTED,
        round__cycle__status=SavingsCycle.Status.ACTIVE,
    ).select_related("round__cycle__chama", "round__recipient__user")
    for payout in waiting:
        round_ = payout.round
        chama = round_.cycle.chama
        recipient = round_.recipient.user
        waited = (today - timezone.localtime(payout.created_at).date()).days
        ids = _ids(chama, round_.cycle, round_, payout=payout)
        if 1 <= waited < escalation_days:
            count += len(
                notify(
                    [recipient],
                    Kind.PAYOUT_CONFIRM_REMINDER,
                    "Payout waiting for you",
                    f"{chama.name}: please confirm or reject the round "
                    f"{round_.round_number} payout recorded for you.",
                    dedupe_key=f"payout_confirm_reminder:{payout.pk}:{waited}",
                    chama=chama,
                    data=ids,
                )
            )
        elif waited >= escalation_days:
            count += len(
                notify(
                    chama_users(chama.pk, Role.CHAIRPERSON),
                    Kind.PAYOUT_STALLED,
                    "Payout not confirmed",
                    f"{chama.name}: {recipient.username} has not answered the round "
                    f"{round_.round_number} payout after {waited} days. The cycle is "
                    "waiting. You can confirm it on their behalf in the app.",
                    dedupe_key=f"payout_stalled:{payout.pk}",
                    chama=chama,
                    data=ids,
                    exclude=[recipient],
                )
            )
    return count

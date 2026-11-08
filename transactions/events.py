"""services.py calls these inside its transactions, so a notification exists exactly when its event does."""
from notifications.models import Notification
from notifications.services import notify
from pesapod.models import Membership

Kind = Notification.Kind
Role = Membership.Role


def chama_users(chama_id, role=None):
    memberships = Membership.objects.filter(chama_id=chama_id, is_active=True)
    if role is not None:
        memberships = memberships.filter(role=role)
    return [m.user for m in memberships.select_related("user")]


def _day(value):
    return f"{value:%d %b %Y}"


def _ids(chama, cycle=None, round_=None, contribution=None, payment=None, payout=None):
    ids = {"chama_id": chama.pk}
    if cycle is not None:
        ids["cycle_id"] = cycle.pk
    if round_ is not None:
        ids["round_id"] = round_.pk
    if contribution is not None:
        ids["contribution_id"] = contribution.pk
    if payment is not None:
        ids["payment_id"] = payment.pk
    if payout is not None:
        ids["payout_id"] = payout.pk
    return ids


# cycle 
def cycle_activated(cycle, chama, first_round):
    notify(
        chama_users(chama.pk),
        Kind.CYCLE_ACTIVATED,
        "Savings cycle started",
        f"{chama.name}: the savings cycle has started. Your first contribution of "
        f"{cycle.contribution_amount} is due {_day(first_round.due_date)}.",
        dedupe_key=f"cycle_activated:{cycle.pk}",
        chama=chama,
        data=_ids(chama, cycle, first_round),
    )


def cycle_completed(cycle, chama):
    notify(
        chama_users(chama.pk),
        Kind.CYCLE_COMPLETED,
        "Savings cycle completed",
        f"{chama.name}: every round is paid out. The savings cycle is complete.",
        dedupe_key=f"cycle_completed:{cycle.pk}",
        chama=chama,
        data=_ids(chama, cycle),
    )


def cycle_cancelled(cycle, chama, actor, reason):
    notify(
        chama_users(chama.pk),
        Kind.CYCLE_CANCELLED,
        "Savings cycle cancelled",
        f"{chama.name}: the chairperson cancelled the savings cycle. Reason: {reason}",
        dedupe_key=f"cycle_cancelled:{cycle.pk}",
        chama=chama,
        data=_ids(chama, cycle),
        exclude=[actor],
    )


# rounds 
def round_opened(round_, cycle, chama):
    notify(
        chama_users(chama.pk),
        Kind.ROUND_OPENED,
        f"Round {round_.round_number} opened",
        f"{chama.name}: round {round_.round_number} is open. Contribute "
        f"{cycle.contribution_amount} by {_day(round_.due_date)}. "
        f"{round_.recipient.user.username} is paid this round.",
        dedupe_key=f"round_opened:{round_.pk}",
        chama=chama,
        data=_ids(chama, cycle, round_),
    )


def round_collected(round_, cycle, chama):
    recipient = round_.recipient.user
    notify(
        chama_users(chama.pk, Role.TREASURER),
        Kind.PAYOUT_TO_RECORD,
        "Record the payout",
        f"{chama.name}: round {round_.round_number} is fully collected. Pay "
        f"{recipient.username} and record the payout.",
        dedupe_key=f"payout_to_record:{round_.pk}",
        chama=chama,
        data=_ids(chama, cycle, round_),
    )
    notify(
        [recipient],
        Kind.ROUND_COLLECTED,
        "Your round is fully collected",
        f"{chama.name}: every contribution for your round has been confirmed. "
        "The treasurer will pay you out.",
        dedupe_key=f"round_collected:{round_.pk}",
        chama=chama,
        data=_ids(chama, cycle, round_),
    )


# contributions 
def penalty_applied(contribution, round_, chama):
    notify(
        [contribution.membership.user],
        Kind.PENALTY_APPLIED,
        "Late penalty added",
        f"{chama.name}: a late penalty of {contribution.penalty_amount} was added to "
        f"your round {round_.round_number} contribution. You now owe "
        f"{contribution.total_due}.",
        dedupe_key=f"penalty_applied:{contribution.pk}",
        chama=chama,
        data=_ids(chama, round_.cycle, round_, contribution),
    )


#  payment

def payment_reported(payment, contribution, round_, chama):
    notify(
        chama_users(chama.pk, Role.TREASURER),
        Kind.PAYMENT_REPORTED,
        "Payment awaiting review",
        f"{chama.name}: {payment.reported_by.username} reported a payment of "
        f"{payment.amount} for round {round_.round_number}. Review it in the app.",
        dedupe_key=f"payment_reported:{payment.pk}",
        chama=chama,
        data=_ids(chama, round_.cycle, round_, contribution, payment),
        exclude=[payment.reported_by],
    )


def payment_confirmed(payment, round_, chama):
    notify(
        [payment.reported_by],
        Kind.PAYMENT_CONFIRMED,
        "Payment confirmed",
        f"{chama.name}: your payment of {payment.amount} for round "
        f"{round_.round_number} was confirmed.",
        dedupe_key=f"payment_confirmed:{payment.pk}",
        chama=chama,
        data=_ids(chama, round_.cycle, round_, payment.contribution, payment),
        exclude=[payment.reviewed_by],
    )


def payment_rejected(payment, round_, chama):
    notify(
        [payment.reported_by],
        Kind.PAYMENT_REJECTED,
        "Payment rejected",
        f"{chama.name}: your payment report for round {round_.round_number} was "
        f"rejected: {payment.rejection_reason}. Please check it and report again.",
        dedupe_key=f"payment_rejected:{payment.pk}",
        chama=chama,
        data=_ids(chama, round_.cycle, round_, payment.contribution, payment),
        exclude=[payment.reviewed_by],
    )


#  payouts 

def payout_sent(payout, round_, chama, actor):
    notify(
        [round_.recipient.user],
        Kind.PAYOUT_SENT,
        "Confirm your payout",
        f"{chama.name}: the treasurer recorded a payout of {payout.amount} to you for "
        f"round {round_.round_number}. Confirm once you have received it.",
        dedupe_key=f"payout_sent:{payout.pk}",
        chama=chama,
        data=_ids(chama, round_.cycle, round_, payout=payout),
        exclude=[actor],
    )


def payout_confirmed(payout, round_, chama, actor, on_behalf=False):
    recipient = round_.recipient.user
    people = chama_users(chama.pk, Role.TREASURER) + chama_users(chama.pk, Role.CHAIRPERSON)
    if on_behalf:
        people.append(recipient)
        body = (
            f"{chama.name}: the chairperson confirmed the round {round_.round_number} "
            f"payout on {recipient.username}'s behalf. Note: {payout.confirmation_note}"
        )
    else:
        body = (
            f"{chama.name}: {recipient.username} confirmed receiving the round "
            f"{round_.round_number} payout."
        )
    notify(
        people,
        Kind.PAYOUT_CONFIRMED,
        "Payout confirmed",
        body,
        dedupe_key=f"payout_confirmed:{payout.pk}",
        chama=chama,
        data=_ids(chama, round_.cycle, round_, payout=payout),
        exclude=[actor],
    )


def payout_rejected(payout, round_, chama):
    recipient = round_.recipient.user
    people = chama_users(chama.pk, Role.TREASURER) + chama_users(chama.pk, Role.CHAIRPERSON)
    notify(
        people,
        Kind.PAYOUT_REJECTED,
        "Payout rejected",
        f"{chama.name}: {recipient.username} says the round {round_.round_number} "
        f"payout did not arrive: {payout.rejection_reason}. Check it and record it again.",
        dedupe_key=f"payout_rejected:{payout.pk}",
        chama=chama,
        data=_ids(chama, round_.cycle, round_, payout=payout),
        exclude=[recipient],
    )

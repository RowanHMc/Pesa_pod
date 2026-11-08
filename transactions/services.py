import calendar
import secrets
from datetime import timedelta
from decimal import Decimal

from django.conf import settings
from django.db import IntegrityError, transaction
from django.db.models import Count, Sum
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied, ValidationError

from pesapod.models import Membership
from pesapod.services import lock_chama

from .models import Contribution, Payout, SavingsCycle, SavingsRound, Transaction
from .permissions import require_role

Role = Membership.Role

ACTIVE_REPORT_STATUSES = (Transaction.Status.PENDING, Transaction.Status.CONFIRMED)
ACTIVE_PAYOUT_STATUSES = (Payout.Status.SENT, Payout.Status.CONFIRMED)


def lock_cycle(cycle_id):
    chama_id = SavingsCycle.objects.values_list("chama_id", flat=True).get(pk=cycle_id)
    chama = lock_chama(chama_id)
    cycle = SavingsCycle.objects.select_for_update().get(pk=cycle_id)
    return chama, cycle


def lock_round(round_id):
    cycle_id = SavingsRound.objects.values_list("cycle_id", flat=True).get(pk=round_id)
    chama, cycle = lock_cycle(cycle_id)
    round_ = SavingsRound.objects.select_for_update().get(pk=round_id)
    return chama, cycle, round_


def lock_contribution(contribution_id):
    round_id = Contribution.objects.values_list("round_id", flat=True).get(
        pk=contribution_id
    )
    chama, cycle, round_ = lock_round(round_id)
    contribution = Contribution.objects.select_for_update().get(pk=contribution_id)
    return chama, cycle, round_, contribution




def due_date_for_round(cycle, round_number):
    """Weekly: every 7 days. Monthly: the same day each month, clamped to the
    month's length (Jan 31 -> Feb 28 -> Mar 31)."""
    if cycle.frequency == SavingsCycle.Frequency.WEEKLY:
        return cycle.start_date + timedelta(weeks=round_number - 1)
    month_index = cycle.start_date.month - 1 + round_number - 1
    year = cycle.start_date.year + month_index // 12
    month = month_index % 12 + 1
    day = min(cycle.start_date.day, calendar.monthrange(year, month)[1])
    return cycle.start_date.replace(year=year, month=month, day=day)


def _active_member_count(chama_id):
    return Membership.objects.filter(chama_id=chama_id, is_active=True).count()


@transaction.atomic
def create_cycle(user, *, chama, contribution_amount, frequency, start_date):
    chama = lock_chama(chama.pk)
    require_role(
        user, chama.pk, Role.CHAIRPERSON, "Only the chairperson can create a savings cycle."
    )
    if not chama.is_active:
        raise ValidationError("This chama is inactive.")
    if SavingsCycle.objects.filter(
        chama=chama, status__in=SavingsCycle.OPEN_STATUSES
    ).exists():
        raise ValidationError("This chama already has an unfinished cycle.")
    return SavingsCycle.objects.create(
        chama=chama,
        contribution_amount=contribution_amount,
        frequency=frequency,
        start_date=start_date,
        number_of_rounds=max(_active_member_count(chama.pk), 1),
        created_by=user,
    )


@transaction.atomic
def update_draft_cycle(user, cycle_id, changes):
    chama, cycle = lock_cycle(cycle_id)
    require_role(
        user, chama.pk, Role.CHAIRPERSON, "Only the chairperson can edit a savings cycle."
    )
    if cycle.status != SavingsCycle.Status.DRAFT:
        raise ValidationError("Only a draft cycle can be edited.")
    # Apply to the locked row, never to a copy read before the lock.
    for field, value in changes.items():
        setattr(cycle, field, value)
    cycle.save(update_fields=list(changes))
    return cycle


def _open_round(cycle, chama, round_number):
    """Create a round and a contribution for every active member."""

    order = cycle.payout_order

    members = {
        m.id: m
        for m in Membership.objects.filter(
            chama=chama,
            id__in=order,
        ).select_related("user")
    }

    # Inactive members cannot be part of a cycle.
    if len(members) != len(order) or any(
        not (m.is_active and m.user.is_active)
        for m in members.values()
    ):
        raise ValidationError(
            "A member in the payout order is no longer active. "
            "Cancel this cycle and start a new one."
        )

    recipient_id = order[round_number - 1]
    round_ = SavingsRound.objects.create(
        cycle=cycle,
        round_number=round_number,
        recipient_id=recipient_id,
        due_date=due_date_for_round(cycle, round_number),
        status=SavingsRound.Status.ACTIVE,
    )

# Every member contributes, including the payout recipient.
    Contribution.objects.bulk_create(
        [
            Contribution(
                round=round_,
                membership=member,
                amount_due=cycle.contribution_amount,
            )
            for member in members.values()
        ]
    )

    return round_


@transaction.atomic
def activate_cycle(user, cycle_id):
    chama, cycle = lock_cycle(cycle_id)
    require_role(
        user, chama.pk, Role.CHAIRPERSON, "Only the chairperson can activate a cycle."
    )
    if cycle.status != SavingsCycle.Status.DRAFT:
        raise ValidationError("Cycle must be in draft status to be activated.")
    if cycle.rounds.exists():
        raise ValidationError("This cycle already has rounds. Use a new draft cycle.")
    if not chama.is_active:
        raise ValidationError("This chama is inactive.")
    if cycle.start_date < timezone.localdate():
        raise ValidationError(
            "The start date is in the past. Update the draft's start date first."
        )

    members = list(
        Membership.objects.filter(chama=chama, is_active=True)
        .select_related("user")
        .order_by("id")
    )
    if len(members) < 2:
        raise ValidationError("At least two members are required.")
    if any(not m.user.is_active for m in members):
        raise ValidationError(
            "Some members have deactivated accounts. Remove them from the chama "
            "before activating the cycle."
        )
    if not any(m.role == Role.TREASURER for m in members):
        raise ValidationError("Appoint a treasurer before activating the cycle.")

    payout_order = [m.id for m in members]
    # The system picks the order, not the members.
    secrets.SystemRandom().shuffle(payout_order)

    cycle.payout_order = payout_order
    cycle.number_of_rounds = len(payout_order)
    cycle.status = SavingsCycle.Status.ACTIVE
    cycle.save(update_fields=["payout_order", "number_of_rounds", "status"])

    first_round = _open_round(cycle, chama, 1)
    return cycle, first_round


@transaction.atomic
def cancel_cycle(user, cycle_id, reason=""):
    chama, cycle = lock_cycle(cycle_id)
    require_role(
        user, chama.pk, Role.CHAIRPERSON, "Only the chairperson can cancel a cycle."
    )
    if cycle.status not in SavingsCycle.OPEN_STATUSES:
        raise ValidationError("Only a draft or active cycle can be cancelled.")

    was_active = cycle.status == SavingsCycle.Status.ACTIVE
    reason = (reason or "").strip()
    summary = {"voided_reports": 0, "confirmed_payments": 0, "confirmed_total": "0.00"}

    if was_active:
        if not reason:
            raise ValidationError("A reason is required to cancel an active cycle.")
        if Payout.objects.filter(
            round__cycle=cycle, status=Payout.Status.SENT
        ).exists():
            raise ValidationError(
                "A payout is waiting for its recipient to confirm or reject it. "
                "Wait for that first."
            )
        open_round_ids = [
            r.pk
            for r in SavingsRound.objects.select_for_update().filter(
                cycle=cycle,
                status__in=[SavingsRound.Status.ACTIVE, SavingsRound.Status.COLLECTED],
            )
        ]
        pending_ids = [
            t.pk
            for t in Transaction.objects.select_for_update(of=("self",)).filter(
                contribution__round__cycle=cycle, status=Transaction.Status.PENDING
            )
        ]
        summary["voided_reports"] = Transaction.objects.filter(
            pk__in=pending_ids
        ).update(status=Transaction.Status.VOIDED)
        SavingsRound.objects.filter(pk__in=open_round_ids).update(
            status=SavingsRound.Status.CANCELLED
        )
        # Money already confirmed stays on record. 
        totals = Transaction.objects.filter(
            contribution__round__cycle=cycle, status=Transaction.Status.CONFIRMED
        ).aggregate(count=Count("pk"), total=Sum("amount"))
        summary["confirmed_payments"] = totals["count"] or 0
        summary["confirmed_total"] = str(
            (totals["total"] or Decimal("0")).quantize(Decimal("0.01"))
        )

    cycle.status = SavingsCycle.Status.CANCELLED
    cycle.cancelled_at = timezone.now()
    cycle.cancellation_reason = reason
    cycle.save(update_fields=["status", "cancelled_at", "cancellation_reason"])
    return cycle, summary


def penalty_rule():
    amount = Decimal(str(getattr(settings, "SAVINGS_LATE_PENALTY_AMOUNT", "0")))
    grace_days = int(getattr(settings, "SAVINGS_LATE_PENALTY_GRACE_DAYS", 0))
    return amount, grace_days


def apply_penalty_if_due(contribution, round_, cycle, today=None):
    """Add the late penalty if it is due. The caller holds the locks."""
    amount, grace_days = penalty_rule()
    if amount <= 0:
        return False
    today = today or timezone.localdate()
    if (
        cycle.status != SavingsCycle.Status.ACTIVE
        or round_.status != SavingsRound.Status.ACTIVE
        or contribution.status != Contribution.Status.PENDING
        or contribution.penalty_applied_at is not None
        or today <= round_.due_date + timedelta(days=grace_days)
    ):
        return False
    # A member who reported in time is not penalised for a slow review.
    if Transaction.objects.filter(
        contribution=contribution, status__in=ACTIVE_REPORT_STATUSES
    ).exists():
        return False
    contribution.penalty_amount = amount
    contribution.penalty_applied_at = timezone.now()
    contribution.save(update_fields=["penalty_amount", "penalty_applied_at"])
    return True


def apply_late_penalties(today=None):
    """Daily job (see the apply_late_penalties command). Returns how many
    contributions were penalised."""
    amount, grace_days = penalty_rule()
    if amount <= 0:
        return 0
    today = today or timezone.localdate()
    ids = list(
        Contribution.objects.filter(
            status=Contribution.Status.PENDING,
            penalty_applied_at__isnull=True,
            round__status=SavingsRound.Status.ACTIVE,
            round__cycle__status=SavingsCycle.Status.ACTIVE,
            round__due_date__lt=today - timedelta(days=grace_days),
        ).values_list("pk", flat=True)
    )
    count = 0
    for contribution_id in ids:
        with transaction.atomic():
            _, cycle, round_, contribution = lock_contribution(contribution_id)
            if apply_penalty_if_due(contribution, round_, cycle, today):
                count += 1
    return count

@transaction.atomic
def report_payment(user, contribution_id, amount, method, reference):
    chama, cycle, round_, contribution = lock_contribution(contribution_id)

    # A member can only report payment for their own contribution.
    if contribution.membership.user_id != user.pk:
        raise ValidationError(
            "You can only report payment for your own contribution."
        )

    if cycle.status != SavingsCycle.Status.ACTIVE:
        raise ValidationError("The savings cycle is not active.")

    if round_.status != SavingsRound.Status.ACTIVE:
        raise ValidationError("This round is no longer accepting payments.")

    if contribution.status != Contribution.Status.PENDING:
        raise ValidationError("This contribution has already been paid.")

    # Members must pay the full amount, including any applicable penalty.
    if amount != contribution.total_due:
        raise ValidationError(
            {
                "amount": [
                    f"The required payment amount is "
                    f"{contribution.total_due}."
                ]
            }
        )

    reference = reference.strip().upper()

    if not reference:
        raise ValidationError(
            {"reference": ["A payment reference is required."]}
        )

    active_statuses = [
        Transaction.Status.PENDING,
        Transaction.Status.CONFIRMED,
    ]

    if Transaction.objects.filter(
        contribution=contribution,
        status__in=active_statuses,
    ).exists():
        raise ValidationError(
            "A payment report already exists for this contribution."
        )

    if Transaction.objects.filter(
        reference=reference,
        status__in=active_statuses,
    ).exists():
        raise ValidationError(
            {"reference": ["This payment reference has already been used."]}
        )

    try:
        with transaction.atomic():
            return Transaction.objects.create(
                contribution=contribution,
                reported_by=user,
                amount=amount,
                method=method,
                reference=reference,
            )

    except IntegrityError:
        if Transaction.objects.filter(
            reference=reference,
            status__in=active_statuses,
        ).exists():
            raise ValidationError(
                {"reference": ["This payment reference has already been used."]}
            )

        raise ValidationError(
            "A payment report already exists for this contribution."
        )
    
@transaction.atomic
def review_payment(user, transaction_id, *, confirm, reason=""):
    contribution_id = Transaction.objects.values_list(
        "contribution_id", flat=True
    ).get(pk=transaction_id)
    chama, cycle, round_, contribution = lock_contribution(contribution_id)
    payment = Transaction.objects.select_for_update().get(pk=transaction_id)

    # Only the treasurer reviews payments, their own included.
    require_role(
        user, chama.pk, Role.TREASURER, "Only the treasurer can review payment reports."
    )
    if cycle.status != SavingsCycle.Status.ACTIVE:
        raise ValidationError("The savings cycle is not active.")
    if round_.status != SavingsRound.Status.ACTIVE:
        raise ValidationError("This round can no longer be reviewed.")
    if contribution.status != Contribution.Status.PENDING:
        raise ValidationError("This contribution is no longer pending.")
    if payment.status != Transaction.Status.PENDING:
        raise ValidationError("This payment report has already been reviewed.")

    now = timezone.now()
    payment.reviewed_by = user
    payment.reviewed_at = now
    if not confirm:
        payment.status = Transaction.Status.REJECTED
        payment.rejection_reason = reason
        payment.save(
            update_fields=["status", "reviewed_by", "reviewed_at", "rejection_reason"]
        )
        return payment

    payment.status = Transaction.Status.CONFIRMED
    payment.rejection_reason = ""
    payment.save(
        update_fields=["status", "reviewed_by", "reviewed_at", "rejection_reason"]
    )
    contribution.status = Contribution.Status.PAID
    contribution.paid_at = now
    contribution.save(update_fields=["status", "paid_at"])

    # Everything collected: the round now waits for the payout.
    if not Contribution.objects.filter(
        round=round_, status=Contribution.Status.PENDING
    ).exists():
        round_.status = SavingsRound.Status.COLLECTED
        round_.collected_at = now
        round_.save(update_fields=["status", "collected_at"])
    return payment


def round_pot(round_):
    """What the recipient is owed: the contributions, not the penalties
    (those stay with the chama)."""
    return Contribution.objects.filter(
        round=round_, status=Contribution.Status.PAID
    ).aggregate(total=Sum("amount_due"))["total"] or Decimal("0.00")


@transaction.atomic
def record_payout(user, round_id, method, reference):
    chama, cycle, round_ = lock_round(round_id)
    require_role(
        user, chama.pk, Role.TREASURER, "Only the treasurer can record a payout."
    )
    if cycle.status != SavingsCycle.Status.ACTIVE:
        raise ValidationError("The savings cycle is not active.")
    if round_.status != SavingsRound.Status.COLLECTED:
        raise ValidationError(
            "This round is not ready for a payout. Every contribution must be "
            "confirmed first."
        )
    if Payout.objects.filter(round=round_, status__in=ACTIVE_PAYOUT_STATUSES).exists():
        raise ValidationError("A payout has already been recorded for this round.")

    try:
        with transaction.atomic():
            return Payout.objects.create(
                round=round_,
                recorded_by=user,
                amount=round_pot(round_),
                method=method,
                reference=reference,
            )
    except IntegrityError:
        raise ValidationError(
            {"reference": ["This payout reference has already been used."]}
        )
def _complete_round_and_advance(cycle, chama, round_, now):
    """Complete a round and open the next one, or complete the cycle."""

    round_.status = SavingsRound.Status.COMPLETED
    round_.completed_at = now

    round_.save(
        update_fields=["status", "completed_at"]
    )

    next_round_number = round_.round_number + 1

    if next_round_number <= cycle.number_of_rounds:
        _open_round(
            cycle,
            chama,
            next_round_number,
        )
    else:
        cycle.status = SavingsCycle.Status.COMPLETED
        cycle.save(update_fields=["status"])

@transaction.atomic
def respond_to_payout(user, payout_id, *, accept, reason=""):
    round_id = Payout.objects.values_list(
        "round_id",
        flat=True,
    ).get(pk=payout_id)

    chama, cycle, round_ = lock_round(round_id)

    payout = Payout.objects.select_for_update().get(pk=payout_id)
    recipient = Membership.objects.get(pk=round_.recipient_id)

    if recipient.user_id != user.id:
        raise PermissionDenied(
            "Only the recipient of this payout can respond to it."
        )

    if not recipient.is_active:
        raise PermissionDenied("Your membership is not active.")

    if cycle.status != SavingsCycle.Status.ACTIVE:
        raise ValidationError("The savings cycle is not active.")

    if round_.status != SavingsRound.Status.COLLECTED:
        raise ValidationError("This round is not waiting for a payout.")

    if payout.status != Payout.Status.SENT:
        raise ValidationError("This payout has already been answered.")

    now = timezone.now()
    payout.responded_at = now

    if not accept:
        payout.status = Payout.Status.REJECTED
        payout.rejection_reason = reason
        payout.confirmed_by = None
        payout.confirmation_note = ""

        payout.save(
            update_fields=[
                "status",
                "responded_at",
                "rejection_reason",
                "confirmed_by",
                "confirmation_note",
            ]
        )

        return payout

    payout.status = Payout.Status.CONFIRMED
    payout.confirmed_by = user
    payout.confirmation_note = ""

    payout.save(
        update_fields=[
            "status",
            "responded_at",
            "confirmed_by",
            "confirmation_note",
        ]
    )

    _complete_round_and_advance(
        cycle,
        chama,
        round_,
        now,
    )

    return payout

@transaction.atomic
def confirm_payout_on_behalf(user, payout_id, note):
    round_id = Payout.objects.values_list(
        "round_id",
        flat=True,
    ).get(pk=payout_id)

    chama, cycle, round_ = lock_round(round_id)

    payout = Payout.objects.select_for_update().get(pk=payout_id)

    require_role(
        user,
        chama.pk,
        Role.CHAIRPERSON,
        "Only the chairperson can confirm a payout on behalf of a recipient.",
    )

    if cycle.status != SavingsCycle.Status.ACTIVE:
        raise ValidationError("The savings cycle is not active.")

    if round_.status != SavingsRound.Status.COLLECTED:
        raise ValidationError("This round is not waiting for a payout.")

    if payout.status != Payout.Status.SENT:
        raise ValidationError("This payout has already been answered.")

    note = note.strip()

    if not note:
        raise ValidationError(
            {"note": ["A confirmation note is required."]}
        )

    escalation_days = payout_escalation_days()

    now = timezone.now()
    escalation_time = payout.created_at + timedelta(days=escalation_days)

    if now < escalation_time:
        raise ValidationError(
            f"The chairperson can only confirm this payout after "
            f"{escalation_days} days without a recipient response."
        )

    payout.status = Payout.Status.CONFIRMED
    payout.confirmed_by = user
    payout.confirmation_note = note
    payout.responded_at = now

    payout.save(
        update_fields=[
            "status",
            "confirmed_by",
            "confirmation_note",
            "responded_at",
        ]
    )

    _complete_round_and_advance(
        cycle,
        chama,
        round_,
        now,
    )

    return payout

def payout_escalation_days():
    """Return the configured payout escalation period."""
    try:
        days = int(getattr(settings, "PAYOUT_ESCALATION_DAYS", 3))
    except (TypeError, ValueError):
        days = 3

    return max(days, 1)

    
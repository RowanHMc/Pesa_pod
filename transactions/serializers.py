from django.utils import timezone
from rest_framework import serializers

from pesapod.models import Chama, Membership

from .models import Contribution, Payout, SavingsCycle, SavingsRound, Transaction
from .services import due_date_for_round


# --- ID fields limited to what the user may use ------------------------------

class _ScopedPKField(serializers.PrimaryKeyRelatedField):
    def __init__(self, **kwargs):
        kwargs.setdefault("pk_field", serializers.UUIDField())
        super().__init__(**kwargs)

    def _user(self):
        return self.context["request"].user


class MyChamaField(_ScopedPKField):
    """Active chamas the user is an active member of (the role is checked by
    the service, which answers 403 rather than pretending it does not exist)."""

    def get_queryset(self):
        return Chama.objects.filter(
            is_active=True,
            memberships__user=self._user(),
            memberships__is_active=True,
        )


class MyContributionField(_ScopedPKField):
    def get_queryset(self):
        return Contribution.objects.filter(membership__user=self._user())


class MyRoundField(_ScopedPKField):
    def get_queryset(self):
        return SavingsRound.objects.filter(
            cycle__chama__memberships__user=self._user(),
            cycle__chama__memberships__is_active=True,
        )



def _not_in_the_past(value):
    if value < timezone.localdate():
        raise serializers.ValidationError("The start date cannot be in the past.")
    return value


class SavingsCycleSerializer(serializers.ModelSerializer):
    chama = MyChamaField()
    chama_name = serializers.CharField(source="chama.name", read_only=True)
    current_round = serializers.SerializerMethodField()

    class Meta:
        model = SavingsCycle
        fields = [
            "id",
            "chama",
            "chama_name",
            "contribution_amount",
            "frequency",
            "start_date",
            "number_of_rounds",
            "status",
            "current_round",
            "created_by",
            "created_at",
            "cancelled_at",
            "cancellation_reason",
        ]
        read_only_fields = [
            "id",
            "number_of_rounds",
            "status",
            "created_by",
            "created_at",
            "cancelled_at",
            "cancellation_reason",
        ]

    def get_current_round(self, obj):
        # Annotated by the viewset's queryset.
        return getattr(obj, "current_round", None)

    def validate_start_date(self, value):
        return _not_in_the_past(value)


class SavingsCycleUpdateSerializer(serializers.ModelSerializer):
    """What a chairperson may change on a draft."""

    class Meta:
        model = SavingsCycle
        fields = ["contribution_amount", "frequency", "start_date"]

    def validate_start_date(self, value):
        return _not_in_the_past(value)


class SavingsCycleDetailSerializer(SavingsCycleSerializer):
    payout_schedule = serializers.SerializerMethodField()

    class Meta(SavingsCycleSerializer.Meta):
        fields = SavingsCycleSerializer.Meta.fields + ["payout_schedule"]

    def get_payout_schedule(self, cycle):
        """Who is paid in which round. Empty until the cycle is activated."""
        order = cycle.payout_order or []
        if not order:
            return []
        members = {
            m.id: m
            for m in Membership.objects.filter(pk__in=order).select_related("user")
        }
        round_statuses = dict(cycle.rounds.values_list("round_number", "status"))
        return [
            {
                "round_number": number,
                "membership_id": membership_id,
                "username": members[membership_id].user.username
                if membership_id in members
                else None,
                "due_date": due_date_for_round(cycle, number),
                "round_status": round_statuses.get(number),
            }
            for number, membership_id in enumerate(order, start=1)
        ]


class CycleCancelSerializer(serializers.Serializer):
    # Required for an active cycle; the service enforces that.
    reason = serializers.CharField(max_length=200, required=False, allow_blank=True)



class SavingsRoundSerializer(serializers.ModelSerializer):
    recipient_username = serializers.CharField(
        source="recipient.user.username", read_only=True
    )
    contribution_count = serializers.SerializerMethodField()
    paid_count = serializers.SerializerMethodField()
    payout_status = serializers.SerializerMethodField()

    class Meta:
        model = SavingsRound
        fields = [
            "id",
            "cycle",
            "round_number",
            "recipient",
            "recipient_username",
            "due_date",
            "status",
            "contribution_count",
            "paid_count",
            "payout_status",
            "collected_at",
            "completed_at",
        ]
        read_only_fields = fields

    # The three below are annotated by the viewset's queryset.
    def get_contribution_count(self, obj):
        return getattr(obj, "contribution_count", None)

    def get_paid_count(self, obj):
        return getattr(obj, "paid_count", None)

    def get_payout_status(self, obj):
        return getattr(obj, "payout_status", None)


class ContributionSerializer(serializers.ModelSerializer):
    chama_name = serializers.CharField(
        source="round.cycle.chama.name", read_only=True
    )
    round_number = serializers.IntegerField(source="round.round_number", read_only=True)
    due_date = serializers.DateField(source="round.due_date", read_only=True)
    member_username = serializers.CharField(
        source="membership.user.username", read_only=True
    )
    total_due = serializers.DecimalField(
        max_digits=12, decimal_places=2, read_only=True
    )

    class Meta:
        model = Contribution
        fields = [
            "id",
            "chama_name",
            "round",
            "round_number",
            "due_date",
            "membership",
            "member_username",
            "amount_due",
            "penalty_amount",
            "total_due",
            "status",
            "paid_at",
            "created_at",
        ]
        read_only_fields = fields


def _normalise_reference(value):
    value = value.strip().upper()
    if not value:
        raise serializers.ValidationError("This field may not be blank.")
    return value


class TransactionSerializer(serializers.ModelSerializer):
    contribution = MyContributionField()
    reported_by_username = serializers.CharField(
        source="reported_by.username", read_only=True
    )
    reviewed_by_username = serializers.CharField(
        source="reviewed_by.username", read_only=True, allow_null=True
    )
    chama_name = serializers.CharField(
        source="contribution.round.cycle.chama.name", read_only=True
    )
    round_number = serializers.IntegerField(
        source="contribution.round.round_number", read_only=True
    )

    class Meta:
        model = Transaction
        fields = [
            "id",
            "contribution",
            "chama_name",
            "round_number",
            "reported_by",
            "reported_by_username",
            "reviewed_by",
            "reviewed_by_username",
            "amount",
            "method",
            "reference",
            "status",
            "rejection_reason",
            "created_at",
            "reviewed_at",
        ]
        read_only_fields = [
            "id",
            "reported_by",
            "reported_by_username",
            "reviewed_by",
            "reviewed_by_username",
            "chama_name",
            "round_number",
            "status",
            "rejection_reason",
            "created_at",
            "reviewed_at",
        ]
        validators = []
        
    def validate_reference(self, value):
        value = _normalise_reference(value)
        # Friendly early answer; the database constraint settles any race.
        if Transaction.objects.filter(
            reference=value, status__in=[Transaction.Status.PENDING, Transaction.Status.CONFIRMED]
        ).exists():
            raise serializers.ValidationError(
                "This payment reference has already been used."
            )
        return value

    # The amount is checked against the full amount due (penalty included) by
    # services.report_payment, under the lock.


class RejectionSerializer(serializers.Serializer):
    rejection_reason = serializers.CharField(max_length=200, allow_blank=False)


class PayoutSerializer(serializers.ModelSerializer):
    round = MyRoundField()
    round_number = serializers.IntegerField(source="round.round_number", read_only=True)
    chama_name = serializers.CharField(
        source="round.cycle.chama.name", read_only=True,
    )
    recipient = serializers.IntegerField(source="round.recipient_id", read_only=True,)
    recipient_username = serializers.CharField(
        source="round.recipient.user.username", read_only=True,
    )
    recorded_by_username = serializers.CharField(
        source="recorded_by.username", read_only=True,
    )
    confirmed_by_username = serializers.CharField(
        source="confirmed_by.username", read_only=True, allow_null=True,
    )

    class Meta:
        model = Payout
        fields = [
            "id",
            "round",
            "round_number",
            "chama_name",
            "recipient",
            "recipient_username",
            "recorded_by",
            "recorded_by_username",
            "amount",
            "method",
            "reference",
            "status",
            "rejection_reason",
            'confirmed_by',
            'confirmed_by_username',
            'confirmation_note',
            "created_at",
            "responded_at",
        ]
        read_only_fields = [
            "id",
            "round_number",
            "chama_name",
            "recipient",
            "recipient_username",
            "recorded_by",
            "recorded_by_username",
            "amount",
            "status",
            "rejection_reason",
            'confirmed_by',
            'confirmed_by_username',
            'confirmation_note',
            "created_at",
            "responded_at",
        ]

    def validate_reference(self, value):
        value = _normalise_reference(value)
        if Payout.objects.filter(
            reference=value, status__in=[Payout.Status.SENT, Payout.Status.CONFIRMED]
        ).exists():
            raise serializers.ValidationError(
                "This payout reference has already been used."
            )
        return value

class ConfirmOnBehalfSerializer(serializers.Serializer):
    note = serializers.CharField(max_length=200, allow_blank=False)
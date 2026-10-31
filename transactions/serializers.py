from rest_framework import serializers
from .models import SavingsCycle, SavingsRound, Contribution, Transaction


class SavingsCycleSerializer(serializers.ModelSerializer):
    class Meta:
        model = SavingsCycle
        fields = [
            "id",
            "chama",
            "contribution_amount",
            "frequency",
            "start_date",
            "number_of_rounds",
            "status",
            "created_by",
            "created_at",
        ]

        read_only_fields = [
            "id",
            "status",
            "created_by",
            "created_at",
        ]

class SavingsRoundSerializer(serializers.ModelSerializer):
    recipient_username = serializers.CharField(
        source="recipient.user.username",
        read_only=True,
    )

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
        ]
        read_only_fields = fields

class ContributionSerializer(serializers.ModelSerializer):
    chama_name = serializers.CharField(
        source = "round.cycle.chama.name",
        read_only = True,
    )
    round_number = serializers.IntegerField(
        source=  "round.round_number",
        read_only = True,
    )
    class Meta:
        model = Contribution
        fields = [
            "id",
            "chama_name",
            "round",
            "round_number",
            "membership",
            "amount_due",
            "status",
            "created_at",
        ]
        read_only_fields = fields

class TransactionSerializer(serializers.ModelSerializer):
    reported_by_username = serializers.CharField(
        source = "reported_by.username",
        read_only = True,
    )
    reviewed_by_username = serializers.CharField(
        source = "reviewed_by.username",
        read_only = True,
        allow_null = True,
    )
    chama_name = serializers.CharField(
        source = "contribution.round.cycle.chama.name",
        read_only = True,
    )
    round_number = serializers.IntegerField(
        source ="contribution.round.round_number",
        read_only = True,
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

    def validate(self, attrs):
        contribution = attrs["contribution"]
        amount = attrs["amount"]

        if amount != contribution.amount_due:
            raise serializers.ValidationError({
                "amount": "The reported payment must equal the full contribution amount."
            })

        return attrs

class TransactionRejectionSerializer(serializers.Serializer):
    rejection_reason = serializers.CharField(
        max_length=200,
        allow_blank=False,
    )
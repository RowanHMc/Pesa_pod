from rest_framework import serializers
from .models import SavingsCycle, SavingsRound


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

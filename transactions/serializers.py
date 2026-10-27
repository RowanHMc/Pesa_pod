from rest_framework import serializers
from .models import SavingsCycle


class SavingsCycleSerializer(serializers.ModelSerializer):
    class Meta:
        model = SavingsCycle
        fields = [
            "id",
            "chama",
            "contribution_amount",
            "frequency",
            "start_date",
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

from rest_framework import serializers

from .models import Notification, NotificationPreference


class NotificationSerializer(serializers.ModelSerializer):
    chama_name = serializers.CharField(source="chama.name", read_only=True, default=None)
    is_read = serializers.BooleanField(read_only=True)

    class Meta:
        model = Notification
        fields = [
            "id",
            "kind",
            "category",
            "title",
            "body",
            "chama",
            "chama_name",
            "data",
            "is_read",
            "read_at",
            "created_at",
        ]
        read_only_fields = fields


class NotificationPreferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotificationPreference
        fields = ["email_tasks", "email_reminders", "email_updates"]

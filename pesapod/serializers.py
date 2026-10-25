from django.db import transaction
from rest_framework import serializers
from .models import Chama, Membership

class ChamaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Chama
        fields = [
            "id",
            "name",
            "description",
            "created_by",
            "created_at",
            "updated_at",
            "is_active",
        ]
        read_only_fields =[
            "id",
            "created_at",
            "updated_at",
            "is_active",
        ]

        
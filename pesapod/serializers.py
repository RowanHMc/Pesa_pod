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

        @transaction.atomic
        def create(self, validated_data):
            user = self.context["request"].user
            chama =Chama.objects.create(
                created_by = user,
                **validated_data,
            )

            Membership.objects.create(
                chama = chama,
                user = user,
                role = Membership.Role.CHAIRPERSON,
            )
            return chama
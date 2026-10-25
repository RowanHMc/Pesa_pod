from django.db import transaction
from rest_framework import serializers
from .models import Chama, Membership

from datetime import timedelta
from django.contrib.auth import get_user_model
from django.utils import timezone
from .models import ChamaInvitation

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
            "created_by",
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

class ChamaInvitationSerializer(serializers.ModelSerializer):
    username = serializers.CharField(write_only=True)
    class Meta:
        model=  ChamaInvitation
        fields =[
            "id",
            "username",
            "invited_user",
            "invited_by",
            "status",
            "created_at",
            "expires_at",        
        ]
        read_only_fields = [
            "id",
            "invited_user",
            "invited_by",
            "status",
            "created_at",
            "expires_at",
        ]

    def validate_username(self, value):
        User = get_user_model()

        try:
            user =User.objects.get(username=value.strip())
        except User.DoesNotExist:
            raise serializers.ValidationError(
                "User does not exist"
            )
        self.invited_user = user
        return value

    def validate(self, attrs):
        chama = self.comtect["chama"]
        user = self.invited_user

        if Membership.objects.filter(
            chama=chama,
            user=user,
        ).exists():
            raise serializers.ValidationError(
                "This user is already in this chama"
            )
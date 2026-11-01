from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction
from django.utils import timezone
from rest_framework import serializers

from .models import Chama, ChamaInvitation, Membership
from .services import expire_overdue, invitation_lifetime

User = get_user_model()


class ChamaSerializer(serializers.ModelSerializer):
    chama_id = serializers.UUIDField(source="id", read_only=True)
    created_by_id = serializers.IntegerField(read_only=True)
    created_by_username = serializers.CharField(
        source="created_by.username", read_only=True
    )
    my_role = serializers.SerializerMethodField()
    member_count = serializers.SerializerMethodField()

    class Meta:
        model = Chama
        fields = [
            "chama_id",
            "name",
            "description",
            "created_by_id",
            "created_by_username",
            "my_role",
            "member_count",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "is_active",
            "created_at",
            "updated_at",
        ]

    def get_my_role(self, obj):
        # Annotated by the viewset's queryset (and set in create()).
        return getattr(obj, "my_role", None)

    def get_member_count(self, obj):
        return getattr(obj, "member_count", None)

    @transaction.atomic
    def create(self, validated_data):
        user = self.context["request"].user
        chama = Chama.objects.create(created_by=user, **validated_data)
        Membership.objects.create(
            chama=chama,
            user=user,
            role=Membership.Role.CHAIRPERSON,
        )
        chama.my_role = Membership.Role.CHAIRPERSON
        chama.member_count = 1
        return chama


class MembershipSerializer(serializers.ModelSerializer):
    membership_id = serializers.IntegerField(source="id", read_only=True)
    user_id = serializers.IntegerField(read_only=True)
    username = serializers.CharField(source="user.username", read_only=True)
    is_me = serializers.SerializerMethodField()

    class Meta:
        model = Membership
        fields = [
            "membership_id",
            "user_id",
            "username",
            "is_me",
            "role",
            "is_active",
            "joined_at",
            "left_at",
            "left_reason",
        ]
        read_only_fields = fields

    def get_is_me(self, obj):
        request = self.context.get("request")
        return bool(request and obj.user_id == request.user.id)


class ChamaInvitationSerializer(serializers.ModelSerializer):
    invitation_id = serializers.UUIDField(source="id", read_only=True)
    chama_id = serializers.UUIDField(read_only=True)
    chama_name = serializers.CharField(source="chama.name", read_only=True)
    invited_user_id = serializers.IntegerField(read_only=True)
    invited_user_username = serializers.CharField(
        source="invited_user.username", read_only=True
    )
    invited_by_id = serializers.IntegerField(read_only=True)
    invited_by_username = serializers.CharField(
        source="invited_by.username", read_only=True
    )
    reviewed_by_id = serializers.IntegerField(read_only=True, allow_null=True)
    reviewed_by_username = serializers.CharField(
        source="reviewed_by.username", read_only=True, allow_null=True
    )

    class Meta:
        model = ChamaInvitation
        fields = [
            "invitation_id",
            "chama_id",
            "chama_name",
            "invited_user_id",
            "invited_user_username",
            "invited_by_id",
            "invited_by_username",
            "status",
            "reviewed_by_id",
            "reviewed_by_username",
            "reviewed_at",
            "responded_at",
            "created_at",
            "expires_at",
        ]
        read_only_fields = fields


class InvitationProposalSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)

    def validate(self, attrs):
        chama = self.context["chama"]

        # One message for "no such user", "not verified" and "inactive", so
        # the endpoint cannot be used to probe which usernames exist.
        invited_user = User.objects.filter(
            username=attrs["username"].strip().lower(),
            is_active=True,
            is_email_verified=True,
        ).first()
        if invited_user is None:
            raise serializers.ValidationError("No eligible user found with that username.")

        if Membership.objects.filter(
            chama=chama, user=invited_user, is_active=True
        ).exists():
            raise serializers.ValidationError(
                "This user is already an active member of this chama."
            )

        expire_overdue(
            ChamaInvitation.objects.filter(chama=chama, invited_user=invited_user)
        )
        if ChamaInvitation.objects.filter(
            chama=chama,
            invited_user=invited_user,
            status__in=ChamaInvitation.OPEN_STATUSES,
        ).exists():
            raise serializers.ValidationError(
                "This user already has an open invitation to this chama."
            )

        attrs["invited_user"] = invited_user
        return attrs

    def create(self, validated_data):
        try:
            # Savepoint, so a lost race becomes a clean error instead of a 500.
            with transaction.atomic():
                return ChamaInvitation.objects.create(
                    chama=self.context["chama"],
                    invited_user=validated_data["invited_user"],
                    invited_by=self.context["request"].user,
                    expires_at=timezone.now() + invitation_lifetime(),
                )
        except IntegrityError:
            raise serializers.ValidationError(
                "This user already has an open invitation to this chama."
            )


class InvitationReviewSerializer(serializers.Serializer):
    decision = serializers.ChoiceField(
        choices=["approve", "reject"],
        error_messages={"invalid_choice": "Decision must be 'approve' or 'reject'."},
    )


class InvitationResponseSerializer(serializers.Serializer):
    decision = serializers.ChoiceField(
        choices=["accept", "decline"],
        error_messages={"invalid_choice": "Decision must be 'accept' or 'decline'."},
    )


class MembershipTargetSerializer(serializers.Serializer):
    membership_id = serializers.IntegerField(min_value=1)

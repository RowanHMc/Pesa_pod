from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.validators import UnicodeUsernameValidator
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db.models import ProtectedError
from rest_framework import serializers

from .validators import normalize_phone_number

User = get_user_model()


def _password_errors(password, user=None):
    """Run Django's AUTH_PASSWORD_VALIDATORS; return a list of messages."""
    try:
        validate_password(password, user=user)
    except DjangoValidationError as exc:
        return list(exc.messages)
    return []


class RegistrationSerializer(serializers.Serializer):
    username = serializers.CharField(
        max_length=150, validators=[UnicodeUsernameValidator()]
    )
    email = serializers.EmailField(max_length=254)
    phone_number = serializers.CharField(max_length=20)
    password = serializers.CharField(write_only=True, trim_whitespace=False)
    password2 = serializers.CharField(write_only=True, trim_whitespace=False)

    def validate_username(self, value):
        return value.strip().lower()

    def validate_email(self, value):
        return value.strip().lower()

    def validate_phone_number(self, value):
        try:
            return normalize_phone_number(value)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(exc.messages)

    def validate(self, attrs):
        errors = {}

        password = attrs["password"]
        if password != attrs.pop("password2"):
            errors["password2"] = ["The passwords do not match."]

        candidate = User(
            username=attrs["username"],
            email=attrs["email"],
            phone_number=attrs["phone_number"],
        )
        password_errors = _password_errors(password, user=candidate)
        if password_errors:
            errors["password"] = password_errors

        # Uniqueness. A verified (or staff) account blocks the value. An
        # unverified one does not: its owner never proved they control the
        # email, so it is replaced rather than blocking the real owner.
        stale_ids = set()
        for field, label, lookup in (
            ("username", "username", "username__iexact"),
            ("email", "email address", "email__iexact"),
            ("phone_number", "phone number", "phone_number"),
        ):
            for existing in User.objects.filter(**{lookup: attrs[field]}):
                if (
                    existing.is_email_verified
                    or existing.is_staff
                    or existing.is_superuser
                ):
                    errors[field] = [f"A user with this {label} already exists."]
                else:
                    stale_ids.add(existing.pk)

        if errors:
            raise serializers.ValidationError(errors)

        attrs["_stale_user_ids"] = stale_ids
        return attrs

    def create(self, validated_data):
        stale_ids = validated_data.pop("_stale_user_ids", set())
        password = validated_data.pop("password")

        if stale_ids:
            try:
                User.objects.filter(
                    pk__in=stale_ids,
                    is_email_verified=False,
                    is_staff=False,
                    is_superuser=False,
                ).delete()
            except ProtectedError:
                raise serializers.ValidationError(
                    {"detail": "These details are already in use."}
                )

        return User.objects.create_user(password=password, **validated_data)


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True, trim_whitespace=False)

    def validate_username(self, value):
        return value.strip().lower()


class EmailSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def validate_email(self, value):
        return value.strip().lower()


class VerifyEmailSerializer(EmailSerializer):
    code = serializers.RegexField(
        regex=r"^\d{6}$",
        error_messages={"invalid": "Enter the six-digit code."},
    )


class PasswordResetConfirmSerializer(VerifyEmailSerializer):
    new_password = serializers.CharField(write_only=True, trim_whitespace=False)
    new_password2 = serializers.CharField(write_only=True, trim_whitespace=False)

    def validate(self, attrs):
        if attrs["new_password"] != attrs.pop("new_password2"):
            raise serializers.ValidationError(
                {"new_password2": ["The passwords do not match."]}
            )
        # Validated without the user object on purpose: looking the user up
        # first would let the error messages reveal which emails exist.
        errors = _password_errors(attrs["new_password"])
        if errors:
            raise serializers.ValidationError({"new_password": errors})
        return attrs


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True, trim_whitespace=False)
    new_password = serializers.CharField(write_only=True, trim_whitespace=False)
    new_password2 = serializers.CharField(write_only=True, trim_whitespace=False)

    def validate(self, attrs):
        user = self.context["request"].user
        errors = {}

        if not user.check_password(attrs["old_password"]):
            errors["old_password"] = ["Incorrect password."]
        if attrs["new_password"] != attrs["new_password2"]:
            errors["new_password2"] = ["The passwords do not match."]
        elif attrs["new_password"] == attrs["old_password"]:
            errors["new_password"] = [
                "The new password must be different from the old one."
            ]
        else:
            password_errors = _password_errors(attrs["new_password"], user=user)
            if password_errors:
                errors["new_password"] = password_errors

        if errors:
            raise serializers.ValidationError(errors)
        attrs.pop("new_password2")
        return attrs


class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "phone_number",
            "is_email_verified",
            "date_joined",
        ]
        read_only_fields = fields


class LogoutSerializer(serializers.Serializer):
    refresh = serializers.CharField()

from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.models import update_last_login
from django.db import IntegrityError, transaction
from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.generics import RetrieveAPIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken

from .models import EmailOTP
from .serializers import (
    ChangePasswordSerializer,
    EmailSerializer,
    LoginSerializer,
    LogoutSerializer,
    PasswordResetConfirmSerializer,
    RegistrationSerializer,
    UserProfileSerializer,
    VerifyEmailSerializer,
)
from .services import otp
from .services.emails import send_password_reset_code, send_verification_code
from .services.tokens import revoke_all_refresh_tokens
from .throttles import (
    EmailConfirmThrottle,
    EmailCooldownThrottle,
    EmailDailyThrottle,
    LoginUsernameThrottle,
)

User = get_user_model()


class PublicAPIView(APIView):
    """Base for endpoints anyone can call.

    authentication_classes is empty so a stale or expired Authorization
    header cannot make a public endpoint answer 401.
    """

    permission_classes = [AllowAny]
    authentication_classes = []


def _invalid_code_response():
    # One message for "no such account", "already verified", "wrong code" and
    # "expired", so the response never reveals which emails are registered.
    return Response(
        {"detail": "Invalid or expired code."},
        status=status.HTTP_400_BAD_REQUEST,
    )


def _locked_response():
    return Response(
        {"detail": "Too many incorrect attempts. Request a new code."},
        status=status.HTTP_429_TOO_MANY_REQUESTS,
    )


class RegisterView(PublicAPIView):
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "register"

    def post(self, request):
        serializer = RegistrationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            with transaction.atomic():
                user = serializer.save()
                code = otp.issue_code(user, EmailOTP.Purpose.VERIFY_EMAIL)
                # Send only once the user and code are safely committed.
                transaction.on_commit(lambda: send_verification_code(user, code))
        except IntegrityError:
            # Two sign-ups raced for the same username/email/phone.
            raise ValidationError(
                {"detail": "An account with these details already exists."}
            )

        return Response(
            {
                "detail": "Account created. Check your email for a verification code.",
                "email": user.email,
            },
            status=status.HTTP_201_CREATED,
        )


class VerifyEmailView(PublicAPIView):
    throttle_classes = [ScopedRateThrottle, EmailConfirmThrottle]
    throttle_scope = "verify_email"

    def post(self, request):
        serializer = VerifyEmailSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"]
        code = serializer.validated_data["code"]

        user = User.objects.filter(email=email).first()
        if user is None or user.is_email_verified:
            return _invalid_code_response()

        with transaction.atomic():
            result = otp.check_code(user, EmailOTP.Purpose.VERIFY_EMAIL, code)
            if result == otp.OK:
                user.is_email_verified = True
                user.save(update_fields=["is_email_verified"])

        if result == otp.LOCKED:
            return _locked_response()
        if result != otp.OK:
            return _invalid_code_response()
        return Response({"detail": "Email verified. You can now log in."})


class ResendVerificationView(PublicAPIView):
    throttle_classes = [
        ScopedRateThrottle,
        EmailCooldownThrottle,
        EmailDailyThrottle,
    ]
    throttle_scope = "resend_verification"

    def post(self, request):
        serializer = EmailSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"]

        user = User.objects.filter(email=email, is_active=True).first()
        if user is not None and not user.is_email_verified:
            code = otp.issue_code(user, EmailOTP.Purpose.VERIFY_EMAIL)
            transaction.on_commit(lambda: send_verification_code(user, code))

        # Same answer whether or not the account exists.
        return Response(
            {
                "detail": "If that email belongs to an unverified account, "
                "a new code has been sent."
            }
        )


class LoginView(PublicAPIView):
    throttle_classes = [ScopedRateThrottle, LoginUsernameThrottle]
    throttle_scope = "login"

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = authenticate(
            request=request,
            username=serializer.validated_data["username"],
            password=serializer.validated_data["password"],
        )
        if user is None:
            # Explicit 401: DRF falls back to 403 when a view has no
            # authentication classes, and 403 is reserved for "not verified".
            return Response(
                {"detail": "Invalid username or password."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        if not user.is_email_verified:
            return Response(
                {
                    "detail": "Verify your email address before logging in.",
                    "code": "email_not_verified",
                    "email": user.email,
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        update_last_login(None, user)
        refresh = RefreshToken.for_user(user)
        return Response(
            {
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "user": UserProfileSerializer(user).data,
            }
        )


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = LogoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            token = RefreshToken(serializer.validated_data["refresh"])
            if str(token["user_id"]) != str(request.user.id):
                return Response(
                    {"detail": "This token does not belong to you."},
                    status=status.HTTP_403_FORBIDDEN,
                )
            token.blacklist()
        except TokenError:
            return Response(
                {"detail": "Invalid or expired token."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response({"detail": "Logged out successfully."})


class MeView(RetrieveAPIView):
    serializer_class = UserProfileSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user


class PasswordResetRequestView(PublicAPIView):
    throttle_classes = [
        ScopedRateThrottle,
        EmailCooldownThrottle,
        EmailDailyThrottle,
    ]
    throttle_scope = "password_reset_request"

    def post(self, request):
        serializer = EmailSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"]

        user = User.objects.filter(
            email=email, is_active=True, is_email_verified=True
        ).first()
        if user is not None:
            code = otp.issue_code(user, EmailOTP.Purpose.PASSWORD_RESET)
            transaction.on_commit(lambda: send_password_reset_code(user, code))

        return Response(
            {
                "detail": "If that email belongs to an account, "
                "a password reset code has been sent."
            }
        )


class PasswordResetConfirmView(PublicAPIView):
    throttle_classes = [ScopedRateThrottle, EmailConfirmThrottle]
    throttle_scope = "password_reset_confirm"

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        user = User.objects.filter(
            email=data["email"], is_active=True, is_email_verified=True
        ).first()
        if user is None:
            return _invalid_code_response()

        with transaction.atomic():
            result = otp.check_code(
                user, EmailOTP.Purpose.PASSWORD_RESET, data["code"]
            )
            if result == otp.OK:
                user.set_password(data["new_password"])
                user.save(update_fields=["password"])
                revoke_all_refresh_tokens(user)

        if result == otp.LOCKED:
            return _locked_response()
        if result != otp.OK:
            return _invalid_code_response()
        return Response({"detail": "Password reset. You can now log in."})


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "password_change"

    def post(self, request):
        serializer = ChangePasswordSerializer(
            data=request.data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)

        user = request.user
        with transaction.atomic():
            user.set_password(serializer.validated_data["new_password"])
            user.save(update_fields=["password"])
            revoke_all_refresh_tokens(user)

        # Other sessions are signed out; hand this one a fresh pair.
        refresh = RefreshToken.for_user(user)
        return Response(
            {
                "detail": "Password changed.",
                "access": str(refresh.access_token),
                "refresh": str(refresh),
            }
        )

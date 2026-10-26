from django.shortcuts import render
from rest_framework import mixins, viewsets, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from .serializers import RegistrationSerializer, LoginSerializer, UserProfileSerializer, LogoutSerializer
import secrets
from datetime import timedelta
from .otp_serializers import OTPVerificationSerializer
from .models import PhoneOTP, User
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction
from django.contrib.auth.hashers import make_password, check_password
from django.utils import timezone
from .services.sms import send_otp_sms

# Create your views here.
class RegistrationViewSet(
    mixins.CreateModelMixin, # handles reg data, sanitize, save user
    viewsets.GenericViewSet, # CRUD handling
):
    serializer_class = RegistrationSerializer
    permission_classes = [AllowAny]

    def perform_create(self, serializer):
        user = serializer.save()

        code = f"{secrets.randbelow(1_000_000):06d}"
# find unused and mark as expired
        PhoneOTP.objects.filter(
            user =user,
            is_used =False,
        ).update(is_used=True)
# save hashed otp
        PhoneOTP.objects.create(
            user=user,
            code_hash = make_password(code),
            expires_at = timezone.now() + timedelta(minutes=3),
        )
        """ service provider"""
        send_otp_sms(user.phone_number, code)

# create custom url for unauyhenticated
    @action(
        detail = False,
        methods=["post"],
        permission_classes=[AllowAny],
        serializer_class=OTPVerificationSerializer,
        url_path="verify-phone",
    )
    # sanitize user input
    def verify_phone(self, request):
        serializer = OTPVerificationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
# extract and store sanitized verified input
        phone_number = serializer.validated_data["phone_number"]
        code = serializer.validated_data["code"]

        try:
            user =User.objects.get(phone_number=phone_number)
        except User.DoesNotExist:
            return Response(
                {'detail': "invalid phone number or OTP"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if user.is_phone_verified:
            return Response(
                {"detail": "Phone number is already verified"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        with transaction.atomic():
            otp = (
                PhoneOTP.objects.select_for_update()
                .filter(user=user, is_used=False)
                .order_by("-created_at")
                .first()
            )

            if otp is None or otp.expires_at<= timezone.now():
                return Response(
                    {"detail": "OTP is invalid or expired"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if otp.attempts >=5:
                return Response(
                    {"detail": "Too many attempts. Request New OTP"},
                    status=status.HTTP_429_TOO_MANY_REQUESTS,

                )
            if not check_password(code, otp.code_hash):
                otp.attempts += 1
                otp.save(update_fields=["attempts"])
                return Response(
                    {"detail": "OTP is invalid or expired"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            otp.is_used = True
            otp.save(update_fields=["is_used"])

            user.is_phone_verified = True
            user.save(update_fields=["is_phone_verified"])

            return Response(
                {"detail":"Phone number Verified Successfully"},
                status=status.HTTP_200_OK,
            )

    @action(
        detail =False,
        methods=["post"],
        permission_classes = [AllowAny],
        serializer_class=LoginSerializer,
        url_path="login",
    )
    def login(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        return Response(
            serializer.validated_data,
            status=status.HTTP_200_OK
        ) 


    @action(
        detail=False,
        methods=["get"],
        permission_classes=[IsAuthenticated],
        serializer_class=UserProfileSerializer,
        url_path="users",
    )
    def users(self, request):
        serializer = self.get_serializer(request.user)

        return Response(
            serializer.data,
            status=status.HTTP_200_OK
        )


    @action(
        detail=False,
        methods=["post"],
        permission_classes=[IsAuthenticated],
        serializer_class=LogoutSerializer,
        url_path="logout",
    )
    def logout(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        refresh_token = serializer.validated_data["refresh"]

        try:
            token = RefreshToken(refresh_token)
            if str(token["user_id"]) != str(request.user.id):
                return Response(
                    {"detail": "Token doesnt belong to this user"},
                    status=status.HTTP_403_FORBIDDEN,
                )
            token.blacklist()

        except TokenError:
            return Response(
                {"detail": "Invalid or expired token"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {"detail": "Logged out successfully"},
            status=status.HTTP_200_OK,
        )
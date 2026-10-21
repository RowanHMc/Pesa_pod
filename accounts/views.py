from django.shortcuts import render
from rest_framework import mixins, viewsets, status
from rest_framework.permissions import AllowAny
from .serializers import RegistrationSerializer
import secrets
from datetime import timedelta
from otp_serializers import OTPVerificationSerializer
from .models import PhoneOTP, User
from rest_framework.decorators import action
from rest_framework.response import Response


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
            expires_at = timezone.now + timedelta(minutes=3),
        )
        """prints otp in console needs to be replaced with service provider"""
        print(f"OTP for {user.phone_number}: {code}") 

# create custom url for unauyhenticated
    @action(
        detail = False,
        methods=["post"],
        permission_classes=[AllowAny],
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
            return self.response(
                {'detail': "invalid phone number or OTP"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if user.is_phone_verified:
            return Response(
                {"detail": "Phone number is already verified"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        
        
from rest_framework import serializers

class OTPVerificationSerializer(serializers.Serializer):
    phone_number = serializers.CharField(max_length=20)
    code = serializers.RegexField(
        regex=r"^\d{6}$",
        error_messages={
            "Invalid": "Enter a Valid six-digit OTP"
        },    
    )
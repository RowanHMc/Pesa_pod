from django.contrib.auth import get_user_model
from rest_framework import serializers

User = get_user_model()

class RegistrationSerializer(serializers.ModelSerializer):
    username = serializers.CharField(max_length=150)
    password = serializers.CharField(
        write_only=True,
        min_length=8,
    )
    password2 = serializers.CharField(
        write_only=True,
        min_length=8,
    )

    class Meta: 
        model = User
        fields = [
            "username",
            "email",
            "phone_number",
            "pasword",
            "password2"
        ]
    
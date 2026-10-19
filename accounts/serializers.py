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
        write_only=True, # passsords cannot be included in output
        min_length=8,
    )

    class Meta: 
        model = User
        fields = [
            "username",
            "email",
            "phone_number",
            "password",
            "password2"
        ]

    def validate(self, attrs):
        if attrs["password"] != attrs["password2"]:
            raise serializers.ValidationError({
                "password2": "The Passwords do not match."
            })
        return attrs
    
    def create(self, validated_data):
        validated_data.pop("password2")
        password= validated_data.pop("password")

        user = User.objects.create_user(
            password= password,
            **validated_data,
        )
        return user
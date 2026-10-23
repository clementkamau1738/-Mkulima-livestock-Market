from rest_framework import serializers

from config.serializer_fields import KenyanPhoneField

from .models import User


class RegisterSerializer(serializers.Serializer):
    full_name = serializers.CharField(min_length=3, max_length=100)
    # Email doubles as the username, which is limited to 150 characters.
    email = serializers.EmailField(max_length=150)
    phone = KenyanPhoneField()
    password = serializers.CharField(write_only=True, max_length=128, trim_whitespace=False)


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField(max_length=150)
    password = serializers.CharField(write_only=True, max_length=128, trim_whitespace=False)


class UserSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(source="get_full_name", read_only=True)
    is_reviewer = serializers.BooleanField(read_only=True)

    class Meta:
        model = User
        fields = ["id", "email", "full_name", "phone", "role", "is_reviewer", "date_joined"]
        read_only_fields = fields

from rest_framework import serializers

from config.serializer_fields import HistorySerializer, KenyanPhoneField

from .models import PurchaseInquiry


class InquiryInputSerializer(serializers.Serializer):
    listing = serializers.IntegerField(min_value=1)
    full_name = serializers.CharField(min_length=3, max_length=100)
    phone = KenyanPhoneField()
    email = serializers.EmailField(required=False, allow_blank=True, default="")
    message = serializers.CharField(min_length=10, max_length=1000)


class InquiryTrackInputSerializer(serializers.Serializer):
    reference = serializers.RegexField(
        r"^\s*[Ii][Nn][Qq]-[A-Za-z0-9]{8}\s*$",
        error_messages={"invalid": "Enter the reference from your confirmation, e.g. INQ-7KQ2M9XP."},
    )
    phone = KenyanPhoneField()


class InquiryCancelSerializer(serializers.Serializer):
    reason = serializers.CharField(required=False, allow_blank=True, max_length=500, default="")


class ListingRefSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    slug = serializers.CharField()
    title = serializers.CharField()


class InquirySerializer(serializers.ModelSerializer):
    listing = ListingRefSerializer(read_only=True)
    history = HistorySerializer(many=True, read_only=True)

    class Meta:
        model = PurchaseInquiry
        fields = ["reference", "listing", "full_name", "phone", "email", "message", "status", "created_at", "updated_at", "history"]
        read_only_fields = fields


class InquiryTrackSerializer(serializers.ModelSerializer):
    """What a guest sees after proving reference + phone: progress only, not
    the contact details or message they sent."""

    listing = ListingRefSerializer(read_only=True)
    history = HistorySerializer(many=True, read_only=True)

    class Meta:
        model = PurchaseInquiry
        fields = ["reference", "listing", "status", "created_at", "updated_at", "history"]
        read_only_fields = fields

from rest_framework import serializers

from config.serializer_fields import HistorySerializer, KenyanPhoneField

from .models import PurchaseInquiry


class InquiryInputSerializer(serializers.Serializer):
    listing = serializers.IntegerField(min_value=1)
    full_name = serializers.CharField(min_length=3, max_length=100)
    phone = KenyanPhoneField()
    email = serializers.EmailField(required=False, allow_blank=True, default="")
    message = serializers.CharField(min_length=10, max_length=1000)


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

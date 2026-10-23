from rest_framework import serializers

from config.serializer_fields import AdminHistorySerializer, AllowedTransitionsField, PersonRefSerializer

from .models import PurchaseInquiry
from .serializers import ListingRefSerializer
from .services import INQUIRY_WORKFLOW


class AdminInquirySerializer(serializers.ModelSerializer):
    listing = ListingRefSerializer(read_only=True)
    user = PersonRefSerializer(read_only=True, allow_null=True)
    allowed_transitions = AllowedTransitionsField(INQUIRY_WORKFLOW)

    class Meta:
        model = PurchaseInquiry
        fields = [
            "reference",
            "listing",
            "user",
            "full_name",
            "phone",
            "email",
            "message",
            "status",
            "allowed_transitions",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields


class AdminInquiryDetailSerializer(AdminInquirySerializer):
    history = AdminHistorySerializer(many=True, read_only=True)

    class Meta(AdminInquirySerializer.Meta):
        fields = [*AdminInquirySerializer.Meta.fields, "history"]
        read_only_fields = fields

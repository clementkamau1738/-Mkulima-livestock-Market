from rest_framework import serializers

from .models import User


class CustomerSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(source="get_full_name", read_only=True)

    class Meta:
        model = User
        fields = ["id", "email", "full_name", "phone", "role", "is_active", "date_joined", "last_login"]
        read_only_fields = fields


class CustomerDetailSerializer(CustomerSerializer):
    request_counts = serializers.SerializerMethodField()
    can_change_access = serializers.SerializerMethodField()

    class Meta(CustomerSerializer.Meta):
        fields = [*CustomerSerializer.Meta.fields, "request_counts", "can_change_access"]
        read_only_fields = fields

    def get_request_counts(self, user):
        from inquiries.models import PurchaseInquiry
        from payments.models import DepositRequest, WithdrawalRequest

        return {
            "inquiries": PurchaseInquiry.objects.filter(user=user).count(),
            "deposits": DepositRequest.objects.filter(user=user).count(),
            "withdrawals": WithdrawalRequest.objects.filter(user=user).count(),
        }

    def get_can_change_access(self, user):
        actor = self.context["request"].user
        return actor.role == User.Role.ADMIN and user.pk != actor.pk and user.role != User.Role.ADMIN and not user.is_superuser


class AccessSerializer(serializers.Serializer):
    is_active = serializers.BooleanField()
    reason = serializers.CharField(required=False, allow_blank=True, max_length=500, default="")

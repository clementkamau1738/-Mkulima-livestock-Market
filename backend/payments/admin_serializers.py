from rest_framework import serializers

from config.serializer_fields import AdminHistorySerializer, AllowedTransitionsField, PersonRefSerializer

from .models import DepositRequest, WithdrawalRequest
from .services import DEPOSIT_WORKFLOW, WITHDRAWAL_WORKFLOW

REVIEW_FIELDS = [
    "reference",
    "user",
    "full_name",
    "phone",
    "amount",
    "status",
    "reviewer",
    "reviewed_at",
    "review_note",
    "created_at",
    "updated_at",
]


class AdminRequestSerializer(serializers.ModelSerializer):
    user = PersonRefSerializer(read_only=True, allow_null=True)
    reviewer = PersonRefSerializer(read_only=True, allow_null=True)
    transaction = serializers.SerializerMethodField()

    def get_transaction(self, obj):
        txn = getattr(obj, "transaction", None)
        if txn is None:
            return None
        return {"reference": txn.reference, "amount": str(txn.amount), "external_reference": txn.external_reference, "occurred_at": txn.occurred_at}


class AdminDepositSerializer(AdminRequestSerializer):
    allowed_transitions = AllowedTransitionsField(DEPOSIT_WORKFLOW)

    class Meta:
        model = DepositRequest
        fields = [*REVIEW_FIELDS, "payment_reference", "notes", "allowed_transitions", "transaction"]
        read_only_fields = fields


class AdminDepositDetailSerializer(AdminDepositSerializer):
    history = AdminHistorySerializer(many=True, read_only=True)

    class Meta(AdminDepositSerializer.Meta):
        fields = [*AdminDepositSerializer.Meta.fields, "history"]
        read_only_fields = fields


class AdminWithdrawalSerializer(AdminRequestSerializer):
    allowed_transitions = AllowedTransitionsField(WITHDRAWAL_WORKFLOW)
    destination = serializers.CharField(source="masked_destination", read_only=True)

    class Meta:
        model = WithdrawalRequest
        fields = [*REVIEW_FIELDS, "method", "destination", "reason", "allowed_transitions", "transaction"]
        read_only_fields = fields


class AdminWithdrawalDetailSerializer(AdminWithdrawalSerializer):
    """Staff need the full destination to send the payout."""

    history = AdminHistorySerializer(many=True, read_only=True)

    class Meta(AdminWithdrawalSerializer.Meta):
        fields = [
            *AdminWithdrawalSerializer.Meta.fields,
            "mpesa_number",
            "bank_name",
            "account_name",
            "account_number",
            "history",
        ]
        read_only_fields = fields

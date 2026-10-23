from decimal import Decimal

from rest_framework import serializers

from config.serializer_fields import HistorySerializer, KenyanPhoneField

from .models import DepositRequest, WithdrawalRequest

MIN_AMOUNT = Decimal("1")
MAX_AMOUNT = Decimal("10000000")


def amount_field():
    return serializers.DecimalField(max_digits=12, decimal_places=2, min_value=MIN_AMOUNT, max_value=MAX_AMOUNT)


class DepositInputSerializer(serializers.Serializer):
    full_name = serializers.CharField(min_length=3, max_length=100)
    phone = KenyanPhoneField()
    amount = amount_field()
    payment_reference = serializers.RegexField(
        r"^[A-Za-z0-9-]{6,30}$", error_messages={"invalid": "Use 6 to 30 letters, numbers or hyphens."}
    )
    notes = serializers.CharField(required=False, allow_blank=True, max_length=500, default="")


class DepositSerializer(serializers.ModelSerializer):
    history = HistorySerializer(many=True, read_only=True)

    class Meta:
        model = DepositRequest
        fields = [
            "reference",
            "full_name",
            "phone",
            "amount",
            "payment_reference",
            "notes",
            "status",
            "review_note",
            "reviewed_at",
            "created_at",
            "history",
        ]
        read_only_fields = fields


class WithdrawalInputSerializer(serializers.Serializer):
    full_name = serializers.CharField(min_length=3, max_length=100)
    phone = KenyanPhoneField()
    amount = amount_field()
    method = serializers.ChoiceField(choices=WithdrawalRequest.Method.choices)
    mpesa_number = KenyanPhoneField(required=False, allow_blank=True)
    bank_name = serializers.CharField(required=False, allow_blank=True, max_length=100)
    account_name = serializers.CharField(required=False, allow_blank=True, max_length=100)
    account_number = serializers.RegexField(
        r"^\d{6,20}$", required=False, allow_blank=True, error_messages={"invalid": "Use 6 to 20 digits."}
    )
    reason = serializers.CharField(required=False, allow_blank=True, max_length=500, default="")

    DESTINATION_FIELDS = {
        "mpesa": ("mpesa_number",),
        "bank": ("bank_name", "account_name", "account_number"),
    }

    def validate(self, attrs):
        required = self.DESTINATION_FIELDS[attrs["method"]]
        missing = {f: "This field is required for the selected payout method." for f in required if not attrs.get(f)}
        if missing:
            raise serializers.ValidationError(missing)
        # Keep only the destination that matches the chosen method.
        for method, fields in self.DESTINATION_FIELDS.items():
            for f in fields:
                attrs[f] = attrs.get(f, "") if method == attrs["method"] else ""
        return attrs


class WithdrawalSerializer(serializers.ModelSerializer):
    history = HistorySerializer(many=True, read_only=True)
    destination = serializers.CharField(source="masked_destination", read_only=True)

    class Meta:
        model = WithdrawalRequest
        fields = [
            "reference",
            "full_name",
            "phone",
            "amount",
            "method",
            "destination",
            "reason",
            "status",
            "review_note",
            "reviewed_at",
            "created_at",
            "history",
        ]
        read_only_fields = fields


class PaymentInstructionsSerializer(serializers.Serializer):
    is_placeholder = serializers.BooleanField()
    title = serializers.CharField()
    steps = serializers.SerializerMethodField()
    methods = serializers.SerializerMethodField()
    note = serializers.CharField()
    updated_at = serializers.DateTimeField(allow_null=True)

    def get_steps(self, obj):
        return [line.strip() for line in obj.steps.splitlines() if line.strip()]

    def get_methods(self, obj):
        return obj.method_rows()

from django.conf import settings
from django.db import models
from django.db.models import Q
from django.db.models.functions import Upper

PLACEHOLDER = "[To be provided by administrator]"


class ReviewedRequest(models.Model):
    """Fields shared by customer money requests. A request records what the
    customer claims; it never proves that money moved."""

    reference = models.CharField(max_length=20, unique=True, editable=False)
    idempotency_key = models.UUIDField(
        null=True, blank=True, unique=True, editable=False, help_text="Client token that makes retried submissions safe."
    )
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="+")
    full_name = models.CharField(max_length=100)
    phone = models.CharField(max_length=20)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    reviewer = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    review_note = models.TextField(blank=True, help_text="Reason shown to the customer.")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True
        ordering = ["-created_at"]

    def __str__(self):
        return self.reference


class DepositRequest(ReviewedRequest):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"

    payment_reference = models.CharField(max_length=30, help_text="Customer-supplied; unverified until reviewed.")
    notes = models.TextField(max_length=500, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING, db_index=True)

    class Meta(ReviewedRequest.Meta):
        indexes = [
            models.Index(fields=["status", "-created_at"], name="deposit_status_created_idx"),
            models.Index(fields=["user", "-created_at"], name="deposit_user_created_idx"),
        ]
        constraints = [
            models.CheckConstraint(condition=Q(amount__gt=0), name="deposit_amount_positive"),
            models.CheckConstraint(
                condition=Q(status="pending", reviewed_at__isnull=True) | (~Q(status="pending") & Q(reviewed_at__isnull=False)),
                name="deposit_review_fields_consistent",
            ),
            # The same payment cannot be claimed twice unless an earlier claim was rejected.
            models.UniqueConstraint(
                Upper("payment_reference"), condition=~Q(status="rejected"), name="deposit_active_payment_reference_unique"
            ),
        ]


class WithdrawalRequest(ReviewedRequest):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"
        PROCESSING = "processing", "Processing"
        COMPLETED = "completed", "Completed"
        FAILED = "failed", "Failed"

    class Method(models.TextChoices):
        MPESA = "mpesa", "M-Pesa"
        BANK = "bank", "Bank account"

    method = models.CharField(max_length=10, choices=Method.choices)
    mpesa_number = models.CharField(max_length=20, blank=True)
    bank_name = models.CharField(max_length=100, blank=True)
    account_name = models.CharField(max_length=100, blank=True)
    account_number = models.CharField(max_length=20, blank=True)
    reason = models.TextField(max_length=500, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING, db_index=True)

    class Meta(ReviewedRequest.Meta):
        indexes = [
            models.Index(fields=["status", "-created_at"], name="withdrawal_status_created_idx"),
            models.Index(fields=["user", "-created_at"], name="withdrawal_user_created_idx"),
        ]
        constraints = [
            models.CheckConstraint(condition=Q(amount__gt=0), name="withdrawal_amount_positive"),
            models.CheckConstraint(
                condition=Q(status="pending", reviewed_at__isnull=True) | (~Q(status="pending") & Q(reviewed_at__isnull=False)),
                name="withdrawal_review_fields_consistent",
            ),
            models.CheckConstraint(
                condition=(Q(method="mpesa") & ~Q(mpesa_number=""))
                | (Q(method="bank") & ~Q(bank_name="") & ~Q(account_name="") & ~Q(account_number="")),
                name="withdrawal_destination_complete",
            ),
        ]

    @property
    def masked_destination(self):
        if self.method == self.Method.MPESA:
            return f"M-Pesa ending {self.mpesa_number[-3:]}"
        return f"{self.bank_name} account ending {self.account_number[-4:]}"


class PaymentInstructions(models.Model):
    """Single row of administrator-editable deposit instructions. Blank method
    fields are shown as placeholders; never fill them with invented details."""

    SINGLETON_ID = 1

    title = models.CharField(max_length=120, default="How to pay a deposit")
    steps = models.TextField(
        default=(
            "Send the deposit using the official payment method listed below.\n"
            "Keep the confirmation message or receipt you receive from your provider.\n"
            "Submit this form with the exact payment reference from that confirmation.\n"
            "An administrator checks the payment independently before approving your request."
        ),
        help_text="One step per line.",
    )
    mpesa_paybill = models.CharField("M-Pesa Paybill number", max_length=20, blank=True)
    mpesa_account = models.CharField("Account number", max_length=40, blank=True)
    bank_details = models.TextField("Bank transfer details", blank=True)
    note = models.TextField(
        default=(
            "Only pay using details published here by the Mkulima team. "
            "We will never ask you to send money to a personal number."
        )
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "payment instructions"
        verbose_name_plural = "payment instructions"
        constraints = [models.CheckConstraint(condition=Q(id=1), name="payment_instructions_singleton")]

    def __str__(self):
        return self.title

    def save(self, *args, **kwargs):
        self.pk = self.SINGLETON_ID
        super().save(*args, **kwargs)

    @classmethod
    def load(cls):
        """The saved instructions, or unsaved placeholder defaults (no write on read)."""
        return cls.objects.filter(pk=cls.SINGLETON_ID).first() or cls(pk=cls.SINGLETON_ID)

    @property
    def is_placeholder(self):
        return not (self.mpesa_paybill or self.bank_details)

    def method_rows(self):
        return [
            {"label": "M-Pesa Paybill number", "value": self.mpesa_paybill or PLACEHOLDER},
            {"label": "Account number", "value": self.mpesa_account or PLACEHOLDER},
            {"label": "Bank transfer details", "value": self.bank_details or PLACEHOLDER},
        ]

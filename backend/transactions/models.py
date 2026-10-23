from django.conf import settings
from django.db import models
from django.db.models import Q


class ImmutableModel(models.Model):
    """Append-only records: saving an existing row is refused."""

    class Meta:
        abstract = True

    def save(self, *args, **kwargs):
        if not self._state.adding:
            raise ValueError(f"{type(self).__name__} records cannot be modified.")
        super().save(*args, **kwargs)


class Transaction(ImmutableModel):
    """An independently verified money movement, created by staff review of an
    approved deposit or a completed withdrawal. Never created from a customer
    claim alone. One-to-one links make duplicate records for a request impossible."""

    class Kind(models.TextChoices):
        DEPOSIT = "deposit", "Deposit"
        WITHDRAWAL = "withdrawal", "Withdrawal"

    reference = models.CharField(max_length=20, unique=True, editable=False)
    kind = models.CharField(max_length=20, choices=Kind.choices)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    deposit = models.OneToOneField(
        "payments.DepositRequest", on_delete=models.PROTECT, null=True, blank=True, related_name="transaction"
    )
    withdrawal = models.OneToOneField(
        "payments.WithdrawalRequest", on_delete=models.PROTECT, null=True, blank=True, related_name="transaction"
    )
    external_reference = models.CharField(max_length=60, blank=True, help_text="Provider reference that was verified.")
    recorded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="+")
    occurred_at = models.DateTimeField()
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.CheckConstraint(condition=Q(amount__gt=0), name="transaction_amount_positive"),
            models.CheckConstraint(
                condition=(Q(kind="deposit") & Q(deposit__isnull=False) & Q(withdrawal__isnull=True))
                | (Q(kind="withdrawal") & Q(withdrawal__isnull=False) & Q(deposit__isnull=True)),
                name="transaction_links_one_request",
            ),
        ]

    def __str__(self):
        return self.reference


class RequestStatusHistory(ImmutableModel):
    inquiry = models.ForeignKey(
        "inquiries.PurchaseInquiry", on_delete=models.PROTECT, null=True, blank=True, related_name="history"
    )
    deposit = models.ForeignKey(
        "payments.DepositRequest", on_delete=models.PROTECT, null=True, blank=True, related_name="history"
    )
    withdrawal = models.ForeignKey(
        "payments.WithdrawalRequest", on_delete=models.PROTECT, null=True, blank=True, related_name="history"
    )
    from_status = models.CharField(max_length=20, blank=True)
    to_status = models.CharField(max_length=20)
    changed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="+")
    reason = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at", "id"]
        verbose_name_plural = "request status history"
        constraints = [
            models.CheckConstraint(
                condition=(Q(inquiry__isnull=False) & Q(deposit__isnull=True) & Q(withdrawal__isnull=True))
                | (Q(inquiry__isnull=True) & Q(deposit__isnull=False) & Q(withdrawal__isnull=True))
                | (Q(inquiry__isnull=True) & Q(deposit__isnull=True) & Q(withdrawal__isnull=False)),
                name="status_history_one_request",
            ),
        ]

    def __str__(self):
        return f"{self.from_status or 'new'} -> {self.to_status}"


class AuditLog(ImmutableModel):
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="+")
    action = models.CharField(max_length=64, db_index=True)
    target_type = models.CharField(max_length=100)
    target_id = models.CharField(max_length=64)
    summary = models.CharField(max_length=255, blank=True)
    changes = models.JSONField(default=dict, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["target_type", "target_id"], name="audit_target_idx")]

    def __str__(self):
        return f"{self.action} {self.target_type}:{self.target_id}"

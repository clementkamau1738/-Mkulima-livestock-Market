from django.contrib import admin

from transactions.admin import HistoryInline

from .models import DepositRequest, PaymentInstructions, WithdrawalRequest

REVIEW_FIELDS = ("status", "reviewer", "reviewed_at", "review_note", "created_at", "updated_at")


class RequestAdmin(admin.ModelAdmin):
    """Read-only in Phase 2: approvals arrive with the audited review workflow in Phase 4."""

    list_filter = ("status",)
    date_hierarchy = "created_at"
    inlines = [HistoryInline]

    def get_readonly_fields(self, request, obj=None):
        return [f.name for f in self.model._meta.fields]

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(DepositRequest)
class DepositRequestAdmin(RequestAdmin):
    list_display = ("reference", "full_name", "phone", "amount", "payment_reference", "status", "created_at")
    search_fields = ("reference", "full_name", "phone", "payment_reference")


@admin.register(WithdrawalRequest)
class WithdrawalRequestAdmin(RequestAdmin):
    list_display = ("reference", "full_name", "phone", "amount", "method", "status", "created_at")
    list_filter = ("status", "method")
    search_fields = ("reference", "full_name", "phone", "mpesa_number", "account_number")


@admin.register(PaymentInstructions)
class PaymentInstructionsAdmin(admin.ModelAdmin):
    list_display = ("title", "mpesa_paybill", "updated_by", "updated_at")
    readonly_fields = ("updated_by", "updated_at")

    def has_add_permission(self, request):
        return not PaymentInstructions.objects.exists()

    def has_delete_permission(self, request, obj=None):
        return False

    def save_model(self, request, obj, form, change):
        obj.updated_by = request.user
        super().save_model(request, obj, form, change)

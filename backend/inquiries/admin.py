from django.contrib import admin

from transactions.admin import HistoryInline

from .models import PurchaseInquiry


@admin.register(PurchaseInquiry)
class PurchaseInquiryAdmin(admin.ModelAdmin):
    list_display = ("reference", "listing", "full_name", "phone", "status", "created_at")
    list_filter = ("status",)
    search_fields = ("reference", "full_name", "phone", "email", "listing__title")
    list_select_related = ("listing",)
    date_hierarchy = "created_at"
    inlines = [HistoryInline]
    # Status changes go through the review workflow (Phase 4) so they are
    # recorded in history and the audit log; they are not edited here.
    readonly_fields = ("reference", "listing", "user", "full_name", "phone", "email", "message", "status", "created_at", "updated_at")

    def has_add_permission(self, request):
        return False

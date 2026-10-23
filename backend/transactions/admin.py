from django.contrib import admin

from .models import AuditLog, RequestStatusHistory, Transaction


class ReadOnlyAdmin(admin.ModelAdmin):
    """Records written only by the services layer; viewable, never editable."""

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(Transaction)
class TransactionAdmin(ReadOnlyAdmin):
    list_display = ("reference", "kind", "amount", "deposit", "withdrawal", "recorded_by", "occurred_at", "created_at")
    list_filter = ("kind",)
    search_fields = ("reference", "external_reference", "deposit__reference", "withdrawal__reference")
    date_hierarchy = "created_at"


@admin.register(RequestStatusHistory)
class RequestStatusHistoryAdmin(ReadOnlyAdmin):
    list_display = ("created_at", "inquiry", "deposit", "withdrawal", "from_status", "to_status", "changed_by")
    list_filter = ("to_status",)
    search_fields = ("inquiry__reference", "deposit__reference", "withdrawal__reference")


@admin.register(AuditLog)
class AuditLogAdmin(ReadOnlyAdmin):
    list_display = ("created_at", "actor", "action", "target_type", "target_id", "summary")
    list_filter = ("action", "target_type")
    search_fields = ("target_id", "summary", "actor__username")
    date_hierarchy = "created_at"


class HistoryInline(admin.TabularInline):
    model = RequestStatusHistory
    extra = 0
    fields = ("created_at", "from_status", "to_status", "changed_by", "reason")
    readonly_fields = fields
    can_delete = False

    def has_add_permission(self, request, obj=None):
        return False

from django.contrib import admin
from django.utils.html import format_html

from config.api import client_ip
from transactions.services import record_audit

from .models import Category, LivestockImage, LivestockListing


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "sort_order", "is_active")
    list_editable = ("sort_order", "is_active")
    prepopulated_fields = {"slug": ("name",)}
    search_fields = ("name", "slug")


class ImageInline(admin.TabularInline):
    model = LivestockImage
    extra = 1
    fields = ("preview", "image", "alt_text", "caption", "sort_order", "is_primary")
    readonly_fields = ("preview",)

    @admin.display(description="Preview")
    def preview(self, obj):
        if obj.pk and obj.image:
            return format_html('<img src="{}" style="height:60px;border-radius:6px" alt="">', obj.image.url)
        return "-"


@admin.register(LivestockListing)
class LivestockListingAdmin(admin.ModelAdmin):
    list_display = ("title", "breed", "category", "price_kes", "status", "location", "published_at", "updated_at")
    list_filter = ("status", "category", "sex", "breed")
    search_fields = ("title", "breed", "location", "slug", "description")
    # Status moves only through the staff dashboard workflow (livestock.services).
    readonly_fields = ("status", "published_at", "created_by", "created_at", "updated_at")
    prepopulated_fields = {"slug": ("title",)}
    list_select_related = ("category",)
    date_hierarchy = "created_at"
    inlines = [ImageInline]
    fieldsets = (
        (None, {"fields": ("title", "slug", "category", "breed", "sex", "age_months", "weight_kg", "location")}),
        ("Listing", {"fields": ("price_kes", "status", "description")}),
        ("Record", {"fields": ("published_at", "created_by", "created_at", "updated_at")}),
    )

    def save_model(self, request, obj, form, change):
        if not change:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)
        record_audit(
            actor=request.user,
            action="listing.update" if change else "listing.create",
            target=obj,
            summary=f"Django Admin: {'edited' if change else 'created'} '{obj.title}'",
            changes={name: str(form.cleaned_data.get(name)) for name in form.changed_data},
            ip_address=client_ip(request),
        )

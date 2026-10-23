import secrets
import uuid
from pathlib import Path

from django.conf import settings
from django.db import models
from django.db.models import Q
from django.utils import timezone
from django.utils.text import slugify

from .validators import validate_image_extension, validate_image_file


class Category(models.Model):
    """Livestock category (Dairy, Beef, ...). New livestock types are added as rows."""

    slug = models.SlugField(max_length=50, unique=True)
    name = models.CharField(max_length=80)
    description = models.CharField(max_length=255, blank=True)
    sort_order = models.PositiveSmallIntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["sort_order", "name"]
        verbose_name_plural = "categories"

    def __str__(self):
        return self.name


class ListingQuerySet(models.QuerySet):
    def public(self):
        """Listings visitors may see: published and not draft or archived."""
        return self.filter(
            status__in=LivestockListing.PUBLIC_STATUSES,
            published_at__isnull=False,
            published_at__lte=timezone.now(),
        )


class LivestockListing(models.Model):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        AVAILABLE = "available", "Available"
        RESERVED = "reserved", "Reserved"
        SOLD = "sold", "Sold"
        ARCHIVED = "archived", "Archived"

    class Sex(models.TextChoices):
        MALE = "male", "Male"
        FEMALE = "female", "Female"

    PUBLIC_STATUSES = (Status.AVAILABLE, Status.RESERVED, Status.SOLD)
    INQUIRABLE_STATUSES = (Status.AVAILABLE, Status.RESERVED)

    slug = models.SlugField(max_length=120, unique=True, blank=True)
    title = models.CharField(max_length=150)
    breed = models.CharField(max_length=80, db_index=True)
    category = models.ForeignKey(Category, on_delete=models.PROTECT, related_name="listings")
    sex = models.CharField(max_length=10, choices=Sex.choices, blank=True)
    age_months = models.PositiveSmallIntegerField(null=True, blank=True)
    weight_kg = models.PositiveIntegerField(null=True, blank=True, help_text="Seller estimate.")
    location = models.CharField(max_length=120)
    price_kes = models.DecimalField(max_digits=12, decimal_places=2)
    description = models.TextField()
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT, db_index=True)
    published_at = models.DateTimeField(null=True, blank=True, help_text="Set automatically when first made public.")
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = ListingQuerySet.as_manager()

    class Meta:
        ordering = ["-published_at", "-id"]
        indexes = [
            models.Index(fields=["status", "-published_at"], name="listing_status_published_idx"),
            models.Index(fields=["category", "status"], name="listing_category_status_idx"),
            models.Index(fields=["price_kes"], name="listing_price_idx"),
        ]
        constraints = [
            models.CheckConstraint(condition=Q(price_kes__gt=0), name="listing_price_positive"),
            models.CheckConstraint(
                condition=Q(status__in=["draft", "archived"]) | Q(published_at__isnull=False),
                name="listing_public_has_published_at",
            ),
        ]

    def __str__(self):
        return self.title

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = f"{slugify(self.title)[:100]}-{secrets.token_hex(3)}"
        if self.status in self.PUBLIC_STATUSES and self.published_at is None:
            self.published_at = timezone.now()
        super().save(*args, **kwargs)

    @property
    def accepts_inquiries(self):
        return self.status in self.INQUIRABLE_STATUSES


def listing_image_path(instance, filename):
    # Never trust the uploaded name: keep only a lower-cased extension.
    ext = Path(filename).suffix.lower()
    return f"livestock/{instance.listing_id}/{uuid.uuid4().hex}{ext}"


class LivestockImage(models.Model):
    listing = models.ForeignKey(LivestockListing, on_delete=models.CASCADE, related_name="images")
    image = models.ImageField(upload_to=listing_image_path, validators=[validate_image_extension, validate_image_file])
    alt_text = models.CharField(max_length=200, blank=True, help_text="Describe the image for screen reader users.")
    caption = models.CharField(max_length=200, blank=True)
    sort_order = models.PositiveSmallIntegerField(default=0)
    is_primary = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-is_primary", "sort_order", "id"]
        constraints = [
            models.UniqueConstraint(
                fields=["listing"], condition=Q(is_primary=True), name="one_primary_image_per_listing"
            ),
        ]

    def __str__(self):
        return f"Image {self.sort_order} for {self.listing}"

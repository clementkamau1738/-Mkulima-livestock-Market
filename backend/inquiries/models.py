from django.conf import settings
from django.db import models
from django.db.models import Q


class PurchaseInquiry(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        CONTACTED = "contacted", "Contacted"
        VIEWING_ARRANGED = "viewing_arranged", "Viewing arranged"
        COMPLETED = "completed", "Completed"
        CANCELLED = "cancelled", "Cancelled"

    # Still being worked on: one of these per buyer per animal at a time.
    OPEN_STATUSES = (Status.PENDING, Status.CONTACTED, Status.VIEWING_ARRANGED)

    reference = models.CharField(max_length=20, unique=True, editable=False)
    idempotency_key = models.UUIDField(
        null=True, blank=True, unique=True, editable=False, help_text="Client token that makes retried submissions safe."
    )
    listing = models.ForeignKey("livestock.LivestockListing", on_delete=models.PROTECT, related_name="inquiries")
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="inquiries"
    )
    full_name = models.CharField(max_length=100)
    phone = models.CharField(max_length=20)
    email = models.EmailField(blank=True)
    message = models.TextField(max_length=1000)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name_plural = "purchase inquiries"
        indexes = [models.Index(fields=["status", "-created_at"], name="inquiry_status_created_idx")]
        constraints = [
            # One open inquiry per buyer per animal: per account when signed in,
            # per phone number for guests. Closed inquiries do not count.
            models.UniqueConstraint(
                fields=["user", "listing"],
                condition=Q(status__in=["pending", "contacted", "viewing_arranged"], user__isnull=False),
                name="inquiry_one_open_per_user_listing",
            ),
            models.UniqueConstraint(
                fields=["phone", "listing"],
                condition=Q(status__in=["pending", "contacted", "viewing_arranged"], user__isnull=True),
                name="inquiry_one_open_per_guest_phone_listing",
            ),
        ]

    def __str__(self):
        return self.reference

from django.contrib.auth.models import AbstractUser
from django.db import models
from django.db.models.functions import Lower


class User(AbstractUser):
    """Project user. `role` drives application permissions; `is_staff` (Django
    Admin access) is kept in sync with it on save."""

    class Role(models.TextChoices):
        CUSTOMER = "customer", "Customer"
        STAFF = "staff", "Staff"
        ADMIN = "admin", "Administrator"

    email = models.EmailField("email address")
    phone = models.CharField(max_length=20, blank=True)
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.CUSTOMER, db_index=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(Lower("email"), name="accounts_user_email_ci_unique"),
        ]

    def save(self, *args, **kwargs):
        if self.is_superuser:
            self.role = self.Role.ADMIN
        self.is_staff = self.role in (self.Role.STAFF, self.Role.ADMIN)
        super().save(*args, **kwargs)

    @property
    def is_reviewer(self):
        """May review requests and manage listings."""
        return self.is_active and self.role in (self.Role.STAFF, self.Role.ADMIN)

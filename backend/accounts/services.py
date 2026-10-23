from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import PermissionDenied, ValidationError
from django.db import IntegrityError, transaction

from transactions.services import record_audit

from .models import User

EMAIL_TAKEN = "An account with this email already exists. Sign in instead."


def _split_name(full_name):
    first, _, last = " ".join(full_name.split()).partition(" ")
    return first, last


def register_customer(*, full_name, email, phone, password):
    """Create a customer account. Role is always customer; staff accounts are
    created by administrators."""
    email = User.objects.normalize_email(email).strip()
    first_name, last_name = _split_name(full_name)
    candidate = User(username=email.lower(), email=email, first_name=first_name, last_name=last_name, phone=phone)
    try:
        validate_password(password, user=candidate)
    except ValidationError as exc:
        raise ValidationError({"password": exc.messages}) from None
    if User.objects.filter(email__iexact=email).exists():
        raise ValidationError({"email": EMAIL_TAKEN})
    candidate.set_password(password)
    candidate.role = User.Role.CUSTOMER
    try:
        with transaction.atomic():
            candidate.save()
    except IntegrityError:
        # A concurrent registration took the email (or username) first.
        raise ValidationError({"email": EMAIL_TAKEN}) from None
    return candidate


def set_account_active(pk, *, actor, is_active, reason="", ip_address=None):
    """Suspend or restore a customer or staff account (administrators only).
    A suspended user's existing sessions stop working on their next request."""
    if not (actor.is_active and actor.role == User.Role.ADMIN):
        raise PermissionDenied("Only administrators can change account access.")
    with transaction.atomic():
        user = User.objects.select_for_update().get(pk=pk)
        if user.pk == actor.pk:
            raise PermissionDenied("You cannot change access for your own account.")
        if user.role == User.Role.ADMIN or user.is_superuser:
            raise PermissionDenied("Administrator accounts are managed in Django Admin.")
        if user.is_active == is_active:
            return user, False
        user.is_active = is_active
        user.save(update_fields=["is_active"])
        record_audit(
            actor=actor,
            action="account.activate" if is_active else "account.suspend",
            target=user,
            summary=f"{'Restored' if is_active else 'Suspended'} {user.email}",
            changes={"is_active": [not is_active, is_active], "reason": (reason or "").strip()},
            ip_address=ip_address,
        )
    return user, True

from django.core.exceptions import PermissionDenied, ValidationError
from django.db import IntegrityError, transaction

from livestock.models import LivestockListing
from transactions.idempotency import submit_once
from transactions.references import create_with_reference
from transactions.services import record_review, record_status_change
from transactions.workflow import Workflow

from .models import PurchaseInquiry

S = PurchaseInquiry.Status

INQUIRY_WORKFLOW = Workflow(
    "inquiry",
    {
        S.PENDING: {S.CONTACTED, S.CANCELLED},
        S.CONTACTED: {S.VIEWING_ARRANGED, S.CANCELLED},
        S.VIEWING_ARRANGED: {S.COMPLETED, S.CANCELLED},
    },
    S.choices,
)


CUSTOMER_CANCEL_REASON = "Cancelled by the customer."


def _open_duplicate(*, user, phone, listing_id):
    """The buyer's open inquiry for this animal, if any: matched by account
    when signed in, by phone number for guests (the database constraints match)."""
    qs = PurchaseInquiry.objects.filter(listing_id=listing_id, status__in=PurchaseInquiry.OPEN_STATUSES)
    qs = qs.filter(user=user) if user is not None else qs.filter(user__isnull=True, phone=phone)
    return qs.first()


def _duplicate_error(existing, user):
    if user is not None:
        return ValidationError(
            {"listing": f"You already have an open inquiry for this animal ({existing.reference}). Follow it on your dashboard."}
        )
    # Guests are not shown the reference: anyone could type someone else's phone number.
    return ValidationError(
        {"listing": "An inquiry for this animal from this phone number is already open. Our team will contact you."}
    )


def submit_inquiry(*, listing_id, user, full_name, phone, email, message, idempotency_key=None):
    """Create a pending inquiry for a listing that is public and still open.
    One open inquiry per buyer per animal. Returns (inquiry, created); a
    repeated idempotency key returns the original."""

    def create():
        listing = LivestockListing.objects.public().filter(pk=listing_id).first()
        if listing is None:
            raise ValidationError({"listing": "This listing is not available."})
        if not listing.accepts_inquiries:
            raise ValidationError({"listing": "This listing is no longer taking inquiries."})
        existing = _open_duplicate(user=user, phone=phone, listing_id=listing.pk)
        if existing is not None:
            raise _duplicate_error(existing, user)
        try:
            with transaction.atomic():
                inquiry = create_with_reference(
                    PurchaseInquiry,
                    "INQ",
                    listing=listing,
                    user=user,
                    full_name=full_name,
                    phone=phone,
                    email=email,
                    message=message,
                    idempotency_key=idempotency_key,
                )
                record_status_change(inquiry, to_status=inquiry.status, changed_by=user, reason="Submitted")
        except IntegrityError:
            # Let submit_once resolve a concurrent retry of this same submission.
            if idempotency_key and PurchaseInquiry.objects.filter(idempotency_key=idempotency_key).exists():
                raise
            # Otherwise a concurrent submission opened the same inquiry first.
            existing = _open_duplicate(user=user, phone=phone, listing_id=listing.pk)
            if existing is not None:
                raise _duplicate_error(existing, user) from None
            raise
        return inquiry

    return submit_once(PurchaseInquiry, key=idempotency_key, user=user, create=create)


def find_for_tracking(*, reference, phone):
    """An inquiry matching both its reference and the phone number given when
    it was sent, or None. Lets guests follow an inquiry without an account."""
    return (
        PurchaseInquiry.objects.select_related("listing")
        .prefetch_related("history")
        .filter(reference=reference.strip().upper(), phone=phone)
        .first()
    )


def cancel_by_customer(pk, *, user, reason="", ip_address=None):
    """The customer withdraws their own open inquiry. Returns (inquiry, changed)."""
    with transaction.atomic():
        inquiry = PurchaseInquiry.objects.select_for_update().get(pk=pk)
        if inquiry.user_id is None or inquiry.user_id != user.pk:
            raise PermissionDenied("You can only cancel your own inquiries.")
        if inquiry.status == S.CANCELLED:
            return inquiry, False
        INQUIRY_WORKFLOW.check(inquiry.status, S.CANCELLED)
        reason = (reason or "").strip() or CUSTOMER_CANCEL_REASON
        from_status = inquiry.status
        inquiry.status = S.CANCELLED
        inquiry.save(update_fields=["status", "updated_at"])
        record_review(inquiry, actor=user, from_status=from_status, to_status=S.CANCELLED, reason=reason, ip_address=ip_address)
        return inquiry, True


def transition_inquiry(pk, *, reviewer, to_status, reason="", ip_address=None):
    """Move an inquiry along its workflow. Returns (inquiry, changed)."""
    if not getattr(reviewer, "is_reviewer", False):
        raise PermissionDenied("Only staff can update inquiries.")
    reason = (reason or "").strip()
    with transaction.atomic():
        inquiry = PurchaseInquiry.objects.select_for_update().get(pk=pk)
        if inquiry.status == to_status:
            return inquiry, False
        if inquiry.user_id is not None and inquiry.user_id == reviewer.pk:
            raise PermissionDenied("You cannot update your own inquiry. Ask another staff member.")
        INQUIRY_WORKFLOW.check(inquiry.status, to_status)
        if to_status == S.CANCELLED and not reason:
            raise ValidationError({"reason": "Give a reason for cancelling."})
        from_status = inquiry.status
        inquiry.status = to_status
        inquiry.save(update_fields=["status", "updated_at"])
        record_review(inquiry, actor=reviewer, from_status=from_status, to_status=to_status, reason=reason, ip_address=ip_address)
        return inquiry, True

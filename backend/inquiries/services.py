from django.core.exceptions import PermissionDenied, ValidationError
from django.db import transaction

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


def submit_inquiry(*, listing_id, user, full_name, phone, email, message, idempotency_key=None):
    """Create a pending inquiry for a listing that is public and still open.
    Returns (inquiry, created); a repeated idempotency key returns the original."""

    @transaction.atomic
    def create():
        listing = LivestockListing.objects.public().filter(pk=listing_id).first()
        if listing is None:
            raise ValidationError({"listing": "This listing is not available."})
        if not listing.accepts_inquiries:
            raise ValidationError({"listing": "This listing is no longer taking inquiries."})
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
        return inquiry

    return submit_once(PurchaseInquiry, key=idempotency_key, user=user, create=create)


def transition_inquiry(pk, *, reviewer, to_status, reason="", ip_address=None):
    """Move an inquiry along its workflow. Returns (inquiry, changed)."""
    if not getattr(reviewer, "is_reviewer", False):
        raise PermissionDenied("Only staff can update inquiries.")
    reason = (reason or "").strip()
    with transaction.atomic():
        inquiry = PurchaseInquiry.objects.select_for_update().get(pk=pk)
        if inquiry.status == to_status:
            return inquiry, False
        INQUIRY_WORKFLOW.check(inquiry.status, to_status)
        if to_status == S.CANCELLED and not reason:
            raise ValidationError({"reason": "Give a reason for cancelling."})
        from_status = inquiry.status
        inquiry.status = to_status
        inquiry.save(update_fields=["status", "updated_at"])
        record_review(inquiry, actor=reviewer, from_status=from_status, to_status=to_status, reason=reason, ip_address=ip_address)
        return inquiry, True

"""Listing management by staff. Every change is written to the audit log."""

from django.core.exceptions import PermissionDenied, ValidationError
from django.db import transaction
from django.db.models import Max

from transactions.services import record_audit
from transactions.workflow import Workflow

from .models import LivestockImage, LivestockListing

S = LivestockListing.Status

LISTING_WORKFLOW = Workflow(
    "listing",
    {
        S.DRAFT: {S.AVAILABLE, S.ARCHIVED},
        S.AVAILABLE: {S.RESERVED, S.SOLD, S.ARCHIVED},
        S.RESERVED: {S.AVAILABLE, S.SOLD, S.ARCHIVED},
        S.SOLD: {S.ARCHIVED},
        S.ARCHIVED: {S.DRAFT},
    },
    S.choices,
)

EDITABLE_FIELDS = ("title", "breed", "category", "sex", "age_months", "weight_kg", "location", "price_kes", "description")
MAX_IMAGES_PER_LISTING = 12


def _require_reviewer(actor):
    if not getattr(actor, "is_reviewer", False):
        raise PermissionDenied("Only staff can manage listings.")


def _audit_value(value):
    return str(value.pk if hasattr(value, "pk") else value) if value is not None else None


def create_listing(*, actor, ip_address=None, **fields):
    """New listings always start as drafts."""
    _require_reviewer(actor)
    with transaction.atomic():
        listing = LivestockListing.objects.create(**fields, status=S.DRAFT, created_by=actor)
        record_audit(
            actor=actor,
            action="listing.create",
            target=listing,
            summary=f"Created draft '{listing.title}'",
            changes={k: _audit_value(getattr(listing, k)) for k in EDITABLE_FIELDS},
            ip_address=ip_address,
        )
    return listing


def update_listing(pk, *, actor, ip_address=None, **fields):
    _require_reviewer(actor)
    unknown = set(fields) - set(EDITABLE_FIELDS)
    if unknown:
        raise ValueError(f"Not editable here: {', '.join(sorted(unknown))}")
    with transaction.atomic():
        listing = LivestockListing.objects.select_for_update().get(pk=pk)
        changes = {}
        for name, value in fields.items():
            old = getattr(listing, name)
            if old != value:
                changes[name] = [_audit_value(old), _audit_value(value)]
                setattr(listing, name, value)
        if changes:
            listing.save()
            record_audit(
                actor=actor,
                action="listing.update",
                target=listing,
                summary=f"Edited {', '.join(changes)} on '{listing.title}'",
                changes=changes,
                ip_address=ip_address,
            )
    return listing


def transition_listing(pk, *, actor, to_status, reason="", ip_address=None):
    """Publish, reserve, sell, archive or restore. Returns (listing, changed)."""
    _require_reviewer(actor)
    with transaction.atomic():
        listing = LivestockListing.objects.select_for_update().get(pk=pk)
        if listing.status == to_status:
            return listing, False
        LISTING_WORKFLOW.check(listing.status, to_status)
        if to_status == S.AVAILABLE and listing.status == S.DRAFT and not listing.images.exists():
            raise ValidationError("Add at least one photo before publishing this listing.")
        from_status = listing.status
        listing.status = to_status
        listing.save()
        record_audit(
            actor=actor,
            action=f"listing.{to_status}",
            target=listing,
            summary=f"'{listing.title}': {from_status} -> {to_status}",
            changes={"status": [from_status, to_status], "reason": (reason or "").strip()},
            ip_address=ip_address,
        )
    return listing, True


def add_image(listing_pk, *, actor, image, alt_text="", caption="", ip_address=None):
    """`image` must already be validated (type, size, dimensions) by the serializer."""
    _require_reviewer(actor)
    with transaction.atomic():
        listing = LivestockListing.objects.select_for_update().get(pk=listing_pk)
        existing = listing.images.count()
        if existing >= MAX_IMAGES_PER_LISTING:
            raise ValidationError({"image": f"A listing can have at most {MAX_IMAGES_PER_LISTING} photos."})
        next_order = (listing.images.aggregate(m=Max("sort_order"))["m"] or 0) + 1
        photo = LivestockImage.objects.create(
            listing=listing, image=image, alt_text=alt_text, caption=caption, sort_order=next_order, is_primary=existing == 0
        )
        record_audit(
            actor=actor,
            action="listing.image_add",
            target=listing,
            summary=f"Added photo {photo.pk} to '{listing.title}'",
            changes={"image": photo.pk, "file": photo.image.name},
            ip_address=ip_address,
        )
    return photo


def update_image(listing_pk, image_pk, *, actor, ip_address=None, **fields):
    """Edit alt text, caption or order, or make this photo the primary one."""
    _require_reviewer(actor)
    with transaction.atomic():
        listing = LivestockListing.objects.select_for_update().get(pk=listing_pk)
        photo = listing.images.get(pk=image_pk)
        changes = {}
        if fields.pop("is_primary", False) and not photo.is_primary:
            listing.images.filter(is_primary=True).update(is_primary=False)
            photo.is_primary = True
            changes["is_primary"] = [False, True]
        for name, value in fields.items():
            if getattr(photo, name) != value:
                changes[name] = [getattr(photo, name), value]
                setattr(photo, name, value)
        if changes:
            photo.save()
            record_audit(
                actor=actor,
                action="listing.image_update",
                target=listing,
                summary=f"Updated photo {photo.pk} on '{listing.title}'",
                changes={"image": photo.pk, **changes},
                ip_address=ip_address,
            )
    return photo


def delete_image(listing_pk, image_pk, *, actor, ip_address=None):
    _require_reviewer(actor)
    with transaction.atomic():
        listing = LivestockListing.objects.select_for_update().get(pk=listing_pk)
        photo = listing.images.get(pk=image_pk)
        if listing.status in LivestockListing.PUBLIC_STATUSES and listing.images.count() == 1:
            raise ValidationError("A published listing needs at least one photo. Upload another before removing this one.")
        name, storage, was_primary = photo.image.name, photo.image.storage, photo.is_primary
        photo.delete()
        if was_primary:
            replacement = listing.images.order_by("sort_order", "id").first()
            if replacement:
                replacement.is_primary = True
                replacement.save(update_fields=["is_primary"])
        record_audit(
            actor=actor,
            action="listing.image_delete",
            target=listing,
            summary=f"Removed photo {image_pk} from '{listing.title}'",
            changes={"image": image_pk, "file": name},
            ip_address=ip_address,
        )
        # Remove the file only once the database change is permanent.
        transaction.on_commit(lambda: storage.delete(name))

"""Shared record keeping: status history and the audit log."""

from .models import AuditLog, RequestStatusHistory

_HISTORY_FIELD = {
    "purchaseinquiry": "inquiry",
    "depositrequest": "deposit",
    "withdrawalrequest": "withdrawal",
}


def record_status_change(request_obj, *, to_status, from_status="", changed_by=None, reason=""):
    field = _HISTORY_FIELD[request_obj._meta.model_name]
    return RequestStatusHistory.objects.create(
        **{field: request_obj},
        from_status=from_status,
        to_status=to_status,
        changed_by=changed_by,
        reason=reason,
    )


def record_audit(*, actor, action, target, summary="", changes=None, ip_address=None):
    return AuditLog.objects.create(
        actor=actor,
        action=action,
        target_type=target._meta.label_lower,
        target_id=str(target.pk),
        summary=summary[:255],
        changes=changes or {},
        ip_address=ip_address,
    )


def record_review(obj, *, actor, from_status, to_status, reason="", ip_address=None, extra=None):
    """Status history plus an audit entry for a reviewer's status change."""
    record_status_change(obj, from_status=from_status, to_status=to_status, changed_by=actor, reason=reason)
    record_audit(
        actor=actor,
        action=f"{obj._meta.model_name}.{to_status}",
        target=obj,
        summary=f"{obj.reference}: {from_status} -> {to_status}",
        changes={"status": [from_status, to_status], "reason": reason, **(extra or {})},
        ip_address=ip_address,
    )

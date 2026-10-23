"""Customer money requests and their review.

Submitting records a claim only: it starts as pending and never moves money
or creates a Transaction. Reviewers then move requests through the workflows
below. A Transaction is created exactly once: when a deposit is approved
after the payment was verified, or when a withdrawal payout is completed.

Submit functions return (record, created); review functions return
(record, changed). Repeating a review that already happened changes nothing.
"""

from django.core.exceptions import PermissionDenied, ValidationError
from django.db import IntegrityError, transaction
from django.utils import timezone

from transactions.idempotency import submit_once
from transactions.models import Transaction
from transactions.references import create_with_reference
from transactions.services import record_review, record_status_change
from transactions.workflow import Workflow

from .models import DepositRequest, WithdrawalRequest

D, W = DepositRequest.Status, WithdrawalRequest.Status

DEPOSIT_WORKFLOW = Workflow(
    "deposit",
    {D.PENDING: {D.APPROVED, D.REJECTED}},
    D.choices,
)

WITHDRAWAL_WORKFLOW = Workflow(
    "withdrawal",
    {
        W.PENDING: {W.APPROVED, W.REJECTED},
        W.APPROVED: {W.PROCESSING},
        W.PROCESSING: {W.COMPLETED, W.FAILED},
    },
    W.choices,
)

# Moves that need a reason the customer can read, and moves where the
# reviewer must confirm an independent check (statement, payout receipt).
REASON_REQUIRED = {D.REJECTED, W.REJECTED, W.FAILED}
CONFIRMATION_REQUIRED = {
    "deposit": {D.APPROVED},
    "withdrawal": {W.APPROVED, W.COMPLETED},
}
CONFIRMATION_MESSAGES = {
    ("deposit", D.APPROVED): "Confirm that you found this payment in the official statement before approving.",
    ("withdrawal", W.APPROVED): "Confirm that you verified the customer is owed this amount before approving.",
    ("withdrawal", W.COMPLETED): "Confirm that the payout was sent and appears in the official statement.",
}

DUPLICATE_PAYMENT_REFERENCE = "This payment reference has already been submitted. Contact support if you think this is a mistake."


def _payment_reference_in_use(payment_reference):
    return (
        DepositRequest.objects.filter(payment_reference__iexact=payment_reference)
        .exclude(status=DepositRequest.Status.REJECTED)
        .exists()
    )


def submit_deposit(*, user, full_name, phone, amount, payment_reference, notes="", idempotency_key=None):
    payment_reference = payment_reference.strip().upper()

    def create():
        if _payment_reference_in_use(payment_reference):
            raise ValidationError({"payment_reference": DUPLICATE_PAYMENT_REFERENCE})
        try:
            with transaction.atomic():
                deposit = create_with_reference(
                    DepositRequest,
                    "DEP",
                    user=user,
                    full_name=full_name,
                    phone=phone,
                    amount=amount,
                    payment_reference=payment_reference,
                    notes=notes,
                    idempotency_key=idempotency_key,
                )
                record_status_change(deposit, to_status=deposit.status, changed_by=user, reason="Submitted")
        except IntegrityError:
            # Let submit_once resolve a concurrent retry of this same submission.
            if idempotency_key and DepositRequest.objects.filter(idempotency_key=idempotency_key).exists():
                raise
            # Otherwise a concurrent submission claimed the same payment reference first.
            if _payment_reference_in_use(payment_reference):
                raise ValidationError({"payment_reference": DUPLICATE_PAYMENT_REFERENCE}) from None
            raise
        return deposit

    return submit_once(DepositRequest, key=idempotency_key, user=user, create=create)


def submit_withdrawal(*, user, full_name, phone, amount, method, reason="", idempotency_key=None, **destination):
    @transaction.atomic
    def create():
        withdrawal = create_with_reference(
            WithdrawalRequest,
            "WDR",
            user=user,
            full_name=full_name,
            phone=phone,
            amount=amount,
            method=method,
            reason=reason,
            idempotency_key=idempotency_key,
            **destination,
        )
        record_status_change(withdrawal, to_status=withdrawal.status, changed_by=user, reason="Submitted")
        return withdrawal

    return submit_once(WithdrawalRequest, key=idempotency_key, user=user, create=create)


def _review(model, workflow, pk, *, reviewer, to_status, reason, confirmed, ip_address, on_change=None):
    """Apply one reviewer status change under a row lock."""
    if not getattr(reviewer, "is_reviewer", False):
        raise PermissionDenied("Only staff can review requests.")
    reason = (reason or "").strip()
    with transaction.atomic():
        obj = model.objects.select_for_update().get(pk=pk)
        if obj.status == to_status:
            return obj, False  # Retried or concurrent repeat: already done.
        if obj.user_id is not None and obj.user_id == reviewer.pk:
            raise PermissionDenied("You cannot review your own request.")
        workflow.check(obj.status, to_status)
        errors = {}
        if to_status in REASON_REQUIRED and not reason:
            errors["reason"] = "Give a reason the customer can read."
        if to_status in CONFIRMATION_REQUIRED[workflow.name] and not confirmed:
            errors["confirmed"] = CONFIRMATION_MESSAGES[(workflow.name, to_status)]
        extra = on_change(obj, errors) if on_change else {}
        if errors:
            raise ValidationError(errors)

        from_status = obj.status
        now = timezone.now()
        obj.status = to_status
        if obj.reviewed_at is None:
            obj.reviewer, obj.reviewed_at = reviewer, now
        if reason:
            obj.review_note = reason
        obj.save(update_fields=["status", "reviewer", "reviewed_at", "review_note", "updated_at"])
        record_review(obj, actor=reviewer, from_status=from_status, to_status=to_status, reason=reason, ip_address=ip_address, extra=extra)
        return obj, True


def _record_transaction(obj, kind, *, reviewer, external_reference, notes):
    return create_with_reference(
        Transaction,
        "TXN",
        kind=kind,
        amount=obj.amount,
        **{kind: obj},
        external_reference=external_reference,
        recorded_by=reviewer,
        occurred_at=timezone.now(),
        notes=notes,
    )


def review_deposit(pk, *, reviewer, to_status, reason="", confirmed=False, ip_address=None):
    def on_change(deposit, errors):
        if to_status != D.APPROVED or errors:
            return {}
        txn = _record_transaction(
            deposit,
            Transaction.Kind.DEPOSIT,
            reviewer=reviewer,
            external_reference=deposit.payment_reference,
            notes="Deposit verified against the official statement by the reviewer.",
        )
        return {"transaction": txn.reference}

    return _review(
        DepositRequest, DEPOSIT_WORKFLOW, pk,
        reviewer=reviewer, to_status=to_status, reason=reason, confirmed=confirmed, ip_address=ip_address, on_change=on_change,
    )


def review_withdrawal(pk, *, reviewer, to_status, reason="", confirmed=False, external_reference="", ip_address=None):
    external_reference = (external_reference or "").strip().upper()

    def on_change(withdrawal, errors):
        if to_status != W.COMPLETED:
            return {}
        if not external_reference:
            errors["external_reference"] = "Enter the payout reference from the provider."
        if errors:
            return {}
        txn = _record_transaction(
            withdrawal,
            Transaction.Kind.WITHDRAWAL,
            reviewer=reviewer,
            external_reference=external_reference,
            notes="Payout confirmed by the reviewer.",
        )
        return {"transaction": txn.reference, "external_reference": external_reference}

    return _review(
        WithdrawalRequest, WITHDRAWAL_WORKFLOW, pk,
        reviewer=reviewer, to_status=to_status, reason=reason, confirmed=confirmed, ip_address=ip_address, on_change=on_change,
    )

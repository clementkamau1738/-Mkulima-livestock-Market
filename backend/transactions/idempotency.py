"""Safe retries for customer submissions.

A client sends the same Idempotency-Key with every retry of one submission.
The first request creates the record; repeats return that record instead of
creating another. The unique constraint on `idempotency_key` settles races
between concurrent repeats.
"""

from django.db import IntegrityError, transaction


class IdempotencyKeyReused(Exception):
    """The key belongs to a record submitted by someone else."""


def _owned(record, user):
    owner_id = user.pk if user is not None else None
    if record.user_id != owner_id:
        raise IdempotencyKeyReused()
    return record


def submit_once(model, *, key, user, create):
    """Return (record, created). `create` must save `key` on the new record."""
    if key is None:
        return create(), True
    existing = model.objects.filter(idempotency_key=key).first()
    if existing is not None:
        return _owned(existing, user), False
    try:
        with transaction.atomic():
            return create(), True
    except IntegrityError:
        existing = model.objects.filter(idempotency_key=key).first()
        if existing is None:
            raise
        return _owned(existing, user), False

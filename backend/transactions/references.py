import secrets

from django.db import IntegrityError, transaction

# No 0/O/1/I so references are easy to read out over the phone.
ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
LENGTH = 8
MAX_ATTEMPTS = 5


def new_reference(prefix):
    return f"{prefix}-{''.join(secrets.choice(ALPHABET) for _ in range(LENGTH))}"


def create_with_reference(model, prefix, **fields):
    """Create `model` with a fresh unique `reference`, retrying on the
    (astronomically rare) collision. Other integrity errors propagate."""
    for _ in range(MAX_ATTEMPTS):
        reference = new_reference(prefix)
        try:
            with transaction.atomic():
                return model.objects.create(reference=reference, **fields)
        except IntegrityError:
            if not model.objects.filter(reference=reference).exists():
                raise
    raise RuntimeError(f"Could not allocate a unique {prefix} reference")

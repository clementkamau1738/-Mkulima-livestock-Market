import re

from django.core.exceptions import ValidationError

_KENYAN_PHONE = re.compile(r"^(?:\+?254|0)([71]\d{8})$")


def normalize_kenyan_phone(value):
    """Return the number in +2547XXXXXXXX / +2541XXXXXXXX form, or raise."""
    compact = re.sub(r"[\s-]", "", value or "")
    match = _KENYAN_PHONE.match(compact)
    if not match:
        raise ValidationError("Enter a valid Kenyan phone number, e.g. 0712 345 678.", code="invalid_phone")
    return f"+254{match.group(1)}"

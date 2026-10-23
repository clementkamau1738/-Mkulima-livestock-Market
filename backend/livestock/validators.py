from django.core.exceptions import ValidationError
from django.core.validators import FileExtensionValidator
from PIL import Image, UnidentifiedImageError

ALLOWED_IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "webp"]
ALLOWED_IMAGE_FORMATS = {"JPEG", "PNG", "WEBP"}
MAX_IMAGE_BYTES = 5 * 1024 * 1024
MIN_IMAGE_SIDE = 400
MAX_IMAGE_SIDE = 6000

validate_image_extension = FileExtensionValidator(ALLOWED_IMAGE_EXTENSIONS)


def validate_image_file(file):
    """Check size, real format (not just the extension) and dimensions."""
    if file.size > MAX_IMAGE_BYTES:
        raise ValidationError("Images must be 5 MB or smaller.", code="image_too_large")
    position = file.tell() if hasattr(file, "tell") else None
    try:
        file.seek(0)
        with Image.open(file) as img:
            fmt = img.format
            width, height = img.size
            img.verify()
    except (UnidentifiedImageError, OSError, SyntaxError):
        raise ValidationError("Upload a valid JPEG, PNG or WebP image.", code="invalid_image") from None
    finally:
        if position is not None:
            file.seek(position)
    if fmt not in ALLOWED_IMAGE_FORMATS:
        raise ValidationError("Upload a valid JPEG, PNG or WebP image.", code="invalid_image")
    if min(width, height) < MIN_IMAGE_SIDE:
        raise ValidationError(f"Images must be at least {MIN_IMAGE_SIDE}px on each side.", code="image_too_small")
    if max(width, height) > MAX_IMAGE_SIDE:
        raise ValidationError(f"Images must be at most {MAX_IMAGE_SIDE}px on each side.", code="image_too_big")

"""Consistent JSON error envelope for every API error:

    {"error": {"code": "validation_error", "message": "...", "fields": {"phone": ["..."]}}}

`fields` is present only for validation errors.
"""

from django.core.exceptions import ObjectDoesNotExist, PermissionDenied
from django.core.exceptions import ValidationError as DjangoValidationError
from django.http import Http404
from rest_framework import exceptions, status
from rest_framework.serializers import as_serializer_error
from rest_framework.views import exception_handler

from transactions.idempotency import IdempotencyKeyReused
from transactions.workflow import InvalidTransition


class Conflict(exceptions.APIException):
    status_code = status.HTTP_409_CONFLICT
    default_detail = "This request conflicts with an earlier one. Please start a new submission."
    default_code = "conflict"

GENERIC_MESSAGES = {
    status.HTTP_400_BAD_REQUEST: "Some of the information provided is not valid.",
    status.HTTP_401_UNAUTHORIZED: "Please sign in to continue.",
    status.HTTP_403_FORBIDDEN: "You do not have permission to do this.",
    status.HTTP_404_NOT_FOUND: "Not found.",
    status.HTTP_405_METHOD_NOT_ALLOWED: "This method is not allowed.",
    status.HTTP_429_TOO_MANY_REQUESTS: "Too many requests. Please wait and try again.",
}


def _first_message(detail):
    if isinstance(detail, list) and detail:
        return _first_message(detail[0])
    if isinstance(detail, dict) and detail:
        return _first_message(next(iter(detail.values())))
    return str(detail)


def _code(exc):
    codes = exc.get_codes() if isinstance(exc, exceptions.APIException) else None
    return codes if isinstance(codes, str) else getattr(exc, "default_code", "error")


def api_exception_handler(exc, context):
    if isinstance(exc, (Http404, ObjectDoesNotExist)):
        exc = exceptions.NotFound()
    elif isinstance(exc, PermissionDenied):
        # Services raise these with a message written for the user.
        exc = exceptions.PermissionDenied(str(exc) or None)
    elif isinstance(exc, IdempotencyKeyReused):
        exc = Conflict()
    elif isinstance(exc, InvalidTransition):
        exc = Conflict(exc.message, code="invalid_transition")
    elif isinstance(exc, DjangoValidationError):
        # Raised by the services layer, which does not depend on DRF.
        exc = exceptions.ValidationError(as_serializer_error(exc))

    response = exception_handler(exc, context)
    if response is None:
        return None  # Unhandled: Django logs it and handler500 returns a generic error.

    if isinstance(exc, exceptions.ValidationError):
        detail = exc.detail
        error = {"code": "validation_error", "message": GENERIC_MESSAGES[400]}
        if isinstance(detail, dict):
            fields = {k: v for k, v in detail.items() if k != "non_field_errors"}
            if fields:
                error["fields"] = fields
            if "non_field_errors" in detail:
                error["message"] = _first_message(detail["non_field_errors"])
        else:
            error["message"] = _first_message(detail)
    else:
        error = {
            "code": _code(exc),
            "message": _first_message(getattr(exc, "detail", "")) or GENERIC_MESSAGES.get(response.status_code, "Error."),
        }
        if isinstance(exc, exceptions.Throttled) and exc.wait is not None:
            error["retry_after_seconds"] = int(exc.wait)

    response.data = {"error": error}
    return response

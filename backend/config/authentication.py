from django.utils.translation import gettext_lazy as _
from rest_framework import exceptions
from rest_framework.authentication import CSRFCheck
from rest_framework.authentication import SessionAuthentication as BaseSessionAuthentication

CSRF_MESSAGE = _("Your security token has expired. Refresh the page and try again.")


def enforce_csrf(request):
    """Django's CSRF check for a DRF request, with a stable error code the
    frontend can recognise. DRF only checks CSRF for signed-in sessions, so
    views that sign people in call this themselves."""
    check = CSRFCheck(lambda r: None)
    check.process_request(request)
    if check.process_view(request, None, (), {}):
        raise exceptions.PermissionDenied(CSRF_MESSAGE, code="csrf_failed")


class SessionAuthentication(BaseSessionAuthentication):
    def enforce_csrf(self, request):
        enforce_csrf(request)

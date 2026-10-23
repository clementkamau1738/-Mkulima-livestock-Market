import ipaddress
import uuid

from rest_framework import mixins, serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import BaseThrottle, ScopedRateThrottle

from accounts.permissions import IsReviewer

from .pagination import AdminPagination


def client_ip(request):
    """Client IP for the audit log, honouring DJANGO_NUM_PROXIES like the throttles."""
    ident = BaseThrottle().get_ident(request)
    try:
        return str(ipaddress.ip_address(ident))
    except ValueError:
        return None


class CustomerRequestViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    """Base for customer-submitted records.

    - create: open to anyone, throttled by `throttle_scope`. Identity comes
      from the session, never from the payload.
    - list / retrieve: signed-in users, and only their own records. Another
      customer's reference returns 404, not 403, so references cannot be probed.
    """

    lookup_field = "reference"
    filterset_class = None
    input_serializer_class = None
    model = None

    # Set False to require a signed-in customer for submissions too.
    allow_anonymous_create = True

    def get_permissions(self):
        if self.action == "create" and self.allow_anonymous_create:
            return [AllowAny()]
        return [IsAuthenticated()]

    def get_throttles(self):
        throttles = super().get_throttles()
        if self.action == "create":
            throttles.append(ScopedRateThrottle())
        return throttles

    def get_queryset(self):
        return self.model.objects.filter(user=self.request.user).prefetch_related("history")

    def current_user(self):
        user = self.request.user
        return user if user.is_authenticated else None

    def idempotency_key(self):
        """Optional `Idempotency-Key` header (a UUID). Repeats of a request with
        the same key return the original record with 200 instead of creating another."""
        raw = self.request.headers.get("Idempotency-Key")
        if not raw:
            return None
        try:
            return uuid.UUID(raw)
        except ValueError:
            raise ValidationError({"idempotency_key": ["Idempotency-Key must be a UUID."]}) from None

    def perform_submit(self, data, idempotency_key):
        """Call the service; return (record, created)."""
        raise NotImplementedError

    def create(self, request, *args, **kwargs):
        key = self.idempotency_key()
        serializer = self.input_serializer_class(data=request.data, context=self.get_serializer_context())
        serializer.is_valid(raise_exception=True)
        record, created = self.perform_submit(serializer.validated_data, key)
        output = self.get_serializer(record)
        return Response(output.data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


class TransitionSerializer(serializers.Serializer):
    status = serializers.CharField(max_length=20)
    reason = serializers.CharField(required=False, allow_blank=True, max_length=1000, default="")
    confirmed = serializers.BooleanField(required=False, default=False)
    external_reference = serializers.RegexField(
        r"^[A-Za-z0-9-]{4,60}$",
        required=False,
        allow_blank=True,
        default="",
        error_messages={"invalid": "Use 4 to 60 letters, numbers or hyphens."},
    )


class AdminViewSet(viewsets.GenericViewSet):
    """Base for staff-only endpoints under /api/admin/. Customers and
    anonymous users are refused here whatever the frontend shows."""

    permission_classes = [IsReviewer]
    pagination_class = AdminPagination


class TransitionMixin:
    """POST {id}/transition/ with {status, reason, confirmed, external_reference}.
    Repeating a transition that already happened returns 200 and changes nothing."""

    def perform_transition(self, obj, data):
        """Call the workflow service; return (obj, changed)."""
        raise NotImplementedError

    @action(detail=True, methods=["post"])
    def transition(self, request, *args, **kwargs):
        obj = self.get_object()
        serializer = TransitionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        obj, _changed = self.perform_transition(obj, serializer.validated_data)
        obj = self.get_queryset().get(pk=obj.pk)
        return Response(self.get_serializer(obj).data)

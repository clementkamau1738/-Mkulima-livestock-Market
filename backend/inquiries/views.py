from rest_framework.decorators import action
from rest_framework.exceptions import NotFound
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from config.api import CustomerRequestViewSet, client_ip

from . import services
from .models import PurchaseInquiry
from .serializers import (
    InquiryCancelSerializer,
    InquiryInputSerializer,
    InquirySerializer,
    InquiryTrackInputSerializer,
    InquiryTrackSerializer,
)
from .throttles import InquiryCreateThrottle, InquiryLookupThrottle

TRACK_NOT_FOUND = "No inquiry matches that reference and phone number. Check both and try again."


class InquiryViewSet(CustomerRequestViewSet):
    model = PurchaseInquiry
    serializer_class = InquirySerializer
    input_serializer_class = InquiryInputSerializer
    create_throttle_class = InquiryCreateThrottle

    def get_permissions(self):
        if self.action == "track":
            return [AllowAny()]
        return super().get_permissions()

    def get_throttles(self):
        throttles = super().get_throttles()
        if self.action == "track":
            throttles.append(InquiryLookupThrottle())
        return throttles

    def get_queryset(self):
        return super().get_queryset().select_related("listing")

    def perform_submit(self, data, idempotency_key):
        return services.submit_inquiry(
            idempotency_key=idempotency_key,
            listing_id=data["listing"],
            user=self.current_user(),
            full_name=data["full_name"],
            phone=data["phone"],
            email=data["email"],
            message=data["message"],
        )

    @action(detail=False, methods=["post"])
    def track(self, request):
        """Guests follow an inquiry with its reference and the phone number they gave.
        POST keeps the phone number out of URLs and server logs."""
        serializer = InquiryTrackInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        inquiry = services.find_for_tracking(**serializer.validated_data)
        if inquiry is None:
            raise NotFound(TRACK_NOT_FOUND)
        return Response(InquiryTrackSerializer(inquiry).data)

    @action(detail=True, methods=["post"])
    def cancel(self, request, *args, **kwargs):
        """The signed-in customer withdraws their own open inquiry."""
        inquiry = self.get_object()  # someone else's reference is a 404
        serializer = InquiryCancelSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        services.cancel_by_customer(
            inquiry.pk, user=request.user, reason=serializer.validated_data["reason"], ip_address=client_ip(request)
        )
        return Response(self.get_serializer(self.get_queryset().get(pk=inquiry.pk)).data)

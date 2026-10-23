from config.api import CustomerRequestViewSet

from . import services
from .models import PurchaseInquiry
from .serializers import InquiryInputSerializer, InquirySerializer


class InquiryViewSet(CustomerRequestViewSet):
    model = PurchaseInquiry
    serializer_class = InquirySerializer
    input_serializer_class = InquiryInputSerializer
    throttle_scope = "inquiries"

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

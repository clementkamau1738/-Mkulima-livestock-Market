from django.db.models import Q
from django_filters import rest_framework as filters
from rest_framework import mixins

from config.api import AdminViewSet, TransitionMixin, client_ip

from . import services
from .admin_serializers import AdminInquiryDetailSerializer, AdminInquirySerializer
from .models import PurchaseInquiry


class InquiryFilter(filters.FilterSet):
    q = filters.CharFilter(method="search", max_length=100)
    status = filters.ChoiceFilter(choices=PurchaseInquiry.Status.choices)
    listing = filters.NumberFilter(field_name="listing_id")
    sort = filters.OrderingFilter(fields=(("created_at", "created"), ("updated_at", "updated")))

    class Meta:
        model = PurchaseInquiry
        fields = ["q", "status", "listing"]

    def search(self, queryset, name, value):
        value = value.strip()
        return queryset.filter(
            Q(reference__icontains=value)
            | Q(full_name__icontains=value)
            | Q(phone__icontains=value)
            | Q(email__icontains=value)
            | Q(listing__title__icontains=value)
        )


class AdminInquiryViewSet(TransitionMixin, mixins.ListModelMixin, mixins.RetrieveModelMixin, AdminViewSet):
    lookup_field = "reference"
    filterset_class = InquiryFilter

    def get_queryset(self):
        qs = PurchaseInquiry.objects.select_related("listing", "user")
        if self.action != "list":
            qs = qs.prefetch_related("history__changed_by")
        return qs

    def get_serializer_class(self):
        return AdminInquirySerializer if self.action == "list" else AdminInquiryDetailSerializer

    def perform_transition(self, obj, data):
        return services.transition_inquiry(
            obj.pk, reviewer=self.request.user, to_status=data["status"], reason=data["reason"], ip_address=client_ip(self.request)
        )

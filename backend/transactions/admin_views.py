from django.db.models import Count, Q
from django_filters import rest_framework as filters
from rest_framework import mixins, serializers
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import User
from accounts.permissions import IsReviewer
from config.api import AdminViewSet
from config.serializer_fields import PersonRefSerializer
from inquiries.models import PurchaseInquiry
from livestock.models import LivestockListing
from payments.models import DepositRequest, WithdrawalRequest

from .models import AuditLog


def _counts(model, field="status"):
    return dict(model.objects.values_list(field).annotate(n=Count("pk")).order_by())


class SummaryView(APIView):
    """Counts for the staff dashboard, one query per table."""

    permission_classes = [IsReviewer]

    def get(self, request):
        return Response(
            {
                "listings": _counts(LivestockListing),
                "inquiries": _counts(PurchaseInquiry),
                "deposits": _counts(DepositRequest),
                "withdrawals": _counts(WithdrawalRequest),
                "customers": User.objects.aggregate(
                    total=Count("pk", filter=Q(role=User.Role.CUSTOMER)),
                    active=Count("pk", filter=Q(role=User.Role.CUSTOMER, is_active=True)),
                ),
            }
        )


class AuditLogSerializer(serializers.ModelSerializer):
    actor = PersonRefSerializer(read_only=True, allow_null=True)

    class Meta:
        model = AuditLog
        fields = ["id", "created_at", "actor", "action", "target_type", "target_id", "summary", "changes", "ip_address"]
        read_only_fields = fields


class AuditLogFilter(filters.FilterSet):
    q = filters.CharFilter(method="search", max_length=100)
    action = filters.CharFilter(field_name="action", lookup_expr="startswith")
    target_type = filters.CharFilter()
    target_id = filters.CharFilter()
    actor = filters.NumberFilter(field_name="actor_id")

    class Meta:
        model = AuditLog
        fields = ["q", "action", "target_type", "target_id", "actor"]

    def search(self, queryset, name, value):
        value = value.strip()
        return queryset.filter(Q(summary__icontains=value) | Q(actor__email__icontains=value) | Q(target_id=value))


class AuditLogViewSet(mixins.ListModelMixin, AdminViewSet):
    queryset = AuditLog.objects.select_related("actor")
    serializer_class = AuditLogSerializer
    filterset_class = AuditLogFilter

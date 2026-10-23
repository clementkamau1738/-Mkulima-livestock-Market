from django.db.models import Q
from django_filters import rest_framework as filters
from rest_framework import mixins

from config.api import AdminViewSet, TransitionMixin, client_ip

from . import services
from .admin_serializers import (
    AdminDepositDetailSerializer,
    AdminDepositSerializer,
    AdminWithdrawalDetailSerializer,
    AdminWithdrawalSerializer,
)
from .models import DepositRequest, WithdrawalRequest

SORTS = (("created_at", "created"), ("amount", "amount"), ("updated_at", "updated"))


class RequestFilter(filters.FilterSet):
    q = filters.CharFilter(method="search", max_length=100)
    sort = filters.OrderingFilter(fields=SORTS)
    search_fields = ("reference", "full_name", "phone", "user__email")

    def search(self, queryset, name, value):
        query = Q()
        for field in self.search_fields:
            query |= Q(**{f"{field}__icontains": value.strip()})
        return queryset.filter(query)


class DepositFilter(RequestFilter):
    status = filters.ChoiceFilter(choices=DepositRequest.Status.choices)
    search_fields = (*RequestFilter.search_fields, "payment_reference")

    class Meta:
        model = DepositRequest
        fields = ["q", "status"]


class WithdrawalFilter(RequestFilter):
    status = filters.ChoiceFilter(choices=WithdrawalRequest.Status.choices)
    method = filters.ChoiceFilter(choices=WithdrawalRequest.Method.choices)

    class Meta:
        model = WithdrawalRequest
        fields = ["q", "status", "method"]


class ReviewViewSet(TransitionMixin, mixins.ListModelMixin, mixins.RetrieveModelMixin, AdminViewSet):
    lookup_field = "reference"
    model = None
    list_serializer_class = None
    detail_serializer_class = None

    def get_queryset(self):
        qs = self.model.objects.select_related("user", "reviewer", "transaction")
        if self.action != "list":
            qs = qs.prefetch_related("history__changed_by")
        return qs

    def get_serializer_class(self):
        return self.list_serializer_class if self.action == "list" else self.detail_serializer_class


class AdminDepositViewSet(ReviewViewSet):
    model = DepositRequest
    filterset_class = DepositFilter
    list_serializer_class = AdminDepositSerializer
    detail_serializer_class = AdminDepositDetailSerializer

    def perform_transition(self, obj, data):
        return services.review_deposit(
            obj.pk,
            reviewer=self.request.user,
            to_status=data["status"],
            reason=data["reason"],
            confirmed=data["confirmed"],
            ip_address=client_ip(self.request),
        )


class AdminWithdrawalViewSet(ReviewViewSet):
    model = WithdrawalRequest
    filterset_class = WithdrawalFilter
    list_serializer_class = AdminWithdrawalSerializer
    detail_serializer_class = AdminWithdrawalDetailSerializer

    def perform_transition(self, obj, data):
        return services.review_withdrawal(
            obj.pk,
            reviewer=self.request.user,
            to_status=data["status"],
            reason=data["reason"],
            confirmed=data["confirmed"],
            external_reference=data["external_reference"],
            ip_address=client_ip(self.request),
        )

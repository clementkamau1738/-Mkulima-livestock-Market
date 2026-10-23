from django.db.models import Q
from django_filters import rest_framework as filters
from rest_framework import mixins
from rest_framework.decorators import action
from rest_framework.response import Response

from config.api import AdminViewSet, client_ip

from . import services
from .admin_serializers import AccessSerializer, CustomerDetailSerializer, CustomerSerializer
from .models import User
from .permissions import IsAdministrator


class AccountFilter(filters.FilterSet):
    q = filters.CharFilter(method="search", max_length=100)
    role = filters.ChoiceFilter(choices=User.Role.choices)
    is_active = filters.BooleanFilter()
    sort = filters.OrderingFilter(fields=(("date_joined", "joined"), ("last_login", "last_login"), ("email", "email")))

    class Meta:
        model = User
        fields = ["q", "role", "is_active"]

    def search(self, queryset, name, value):
        value = value.strip()
        return queryset.filter(
            Q(email__icontains=value) | Q(first_name__icontains=value) | Q(last_name__icontains=value) | Q(phone__icontains=value)
        )


class AccountViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, AdminViewSet):
    """Staff can look people up; only administrators can suspend or restore access."""

    queryset = User.objects.order_by("-date_joined")
    filterset_class = AccountFilter

    def get_serializer_class(self):
        return CustomerSerializer if self.action == "list" else CustomerDetailSerializer

    @action(detail=True, methods=["post"], permission_classes=[IsAdministrator])
    def access(self, request, pk=None):
        user = self.get_object()
        serializer = AccessSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user, _changed = services.set_account_active(user.pk, actor=request.user, ip_address=client_ip(request), **serializer.validated_data)
        return Response(CustomerDetailSerializer(user, context=self.get_serializer_context()).data)

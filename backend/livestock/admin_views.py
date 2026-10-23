from django.db.models import Q
from django_filters import rest_framework as filters
from rest_framework import mixins, status
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response

from config.api import AdminViewSet, TransitionMixin, client_ip

from . import services
from .admin_serializers import (
    AdminListingDetailSerializer,
    AdminListingSerializer,
    ImageUpdateSerializer,
    ImageUploadSerializer,
    ListingWriteSerializer,
)
from .models import LivestockListing
from .serializers import ImageSerializer


class AdminListingFilter(filters.FilterSet):
    q = filters.CharFilter(method="search", max_length=100)
    status = filters.ChoiceFilter(choices=LivestockListing.Status.choices)
    category = filters.CharFilter(field_name="category__slug")
    sort = filters.OrderingFilter(fields=(("updated_at", "updated"), ("created_at", "created"), ("price_kes", "price"), ("title", "title")))

    class Meta:
        model = LivestockListing
        fields = ["q", "status", "category"]

    def search(self, queryset, name, value):
        value = value.strip()
        return queryset.filter(
            Q(title__icontains=value) | Q(breed__icontains=value) | Q(location__icontains=value) | Q(slug__icontains=value)
        )


class AdminListingViewSet(TransitionMixin, mixins.ListModelMixin, mixins.RetrieveModelMixin, AdminViewSet):
    """All listings in every status. Writes go through livestock.services,
    which enforces the listing workflow and writes the audit log."""

    filterset_class = AdminListingFilter

    def get_queryset(self):
        return LivestockListing.objects.select_related("category").prefetch_related("images").order_by("-updated_at")

    def get_serializer_class(self):
        return AdminListingSerializer if self.action == "list" else AdminListingDetailSerializer

    def _detail(self, pk, status_code=status.HTTP_200_OK):
        listing = self.get_queryset().get(pk=pk)
        return Response(AdminListingDetailSerializer(listing, context=self.get_serializer_context()).data, status=status_code)

    def create(self, request):
        serializer = ListingWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        listing = services.create_listing(actor=request.user, ip_address=client_ip(request), **serializer.validated_data)
        return self._detail(listing.pk, status.HTTP_201_CREATED)

    def partial_update(self, request, pk=None):
        listing = self.get_object()
        serializer = ListingWriteSerializer(listing, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        services.update_listing(listing.pk, actor=request.user, ip_address=client_ip(request), **serializer.validated_data)
        return self._detail(listing.pk)

    def perform_transition(self, obj, data):
        return services.transition_listing(
            obj.pk, actor=self.request.user, to_status=data["status"], reason=data["reason"], ip_address=client_ip(self.request)
        )

    @action(detail=True, methods=["post"], parser_classes=[MultiPartParser, FormParser])
    def images(self, request, pk=None):
        listing = self.get_object()
        serializer = ImageUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        photo = services.add_image(listing.pk, actor=request.user, ip_address=client_ip(request), **serializer.validated_data)
        return Response(ImageSerializer(photo, context=self.get_serializer_context()).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["patch", "delete"], url_path=r"images/(?P<image_id>\d+)")
    def image(self, request, pk=None, image_id=None):
        listing = self.get_object()
        if request.method == "DELETE":
            services.delete_image(listing.pk, int(image_id), actor=request.user, ip_address=client_ip(request))
            return Response(status=status.HTTP_204_NO_CONTENT)
        serializer = ImageUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        photo = services.update_image(listing.pk, int(image_id), actor=request.user, ip_address=client_ip(request), **serializer.validated_data)
        return Response(ImageSerializer(photo, context=self.get_serializer_context()).data)

from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from . import selectors
from .filters import ListingFilter
from .serializers import CategorySerializer, ListingDetailSerializer, ListingListSerializer


class ListingViewSet(viewsets.ReadOnlyModelViewSet):
    """Public marketplace. Only published, non-draft, non-archived listings exist here."""

    permission_classes = [AllowAny]
    filterset_class = ListingFilter

    def get_queryset(self):
        return selectors.public_listings()

    def get_serializer_class(self):
        return ListingListSerializer if self.action in ("list", "related") else ListingDetailSerializer

    @action(detail=True)
    def related(self, request, pk=None):
        listing = self.get_object()
        serializer = self.get_serializer(selectors.related_listings(listing), many=True)
        return Response(serializer.data)

    @action(detail=False, pagination_class=None, filterset_class=None)
    def breeds(self, request):
        return Response(selectors.public_breeds())


class CategoryViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [AllowAny]
    serializer_class = CategorySerializer
    pagination_class = None
    filterset_class = None
    lookup_field = "slug"

    def get_queryset(self):
        return selectors.active_categories()

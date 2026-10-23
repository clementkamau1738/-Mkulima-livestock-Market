from django import forms
from django.db.models import Q
from django_filters import rest_framework as filters

from .models import LivestockListing

SORT_ORDERING = {
    "newest": ("-published_at", "-id"),
    "price_asc": ("price_kes", "-published_at"),
    "price_desc": ("-price_kes", "-published_at"),
}


class ListingFilterForm(forms.Form):
    def clean(self):
        data = super().clean()
        low, high = data.get("min_price"), data.get("max_price")
        if low is not None and high is not None and low > high:
            raise forms.ValidationError({"min_price": "Minimum price cannot be more than the maximum."})
        return data


class ListingFilter(filters.FilterSet):
    q = filters.CharFilter(method="search", max_length=100)
    category = filters.CharFilter(field_name="category__slug")
    breed = filters.CharFilter(field_name="breed", lookup_expr="iexact")
    min_price = filters.NumberFilter(field_name="price_kes", lookup_expr="gte", min_value=0)
    max_price = filters.NumberFilter(field_name="price_kes", lookup_expr="lte", min_value=0)
    status = filters.ChoiceFilter(choices=[(s.value, s.label) for s in LivestockListing.PUBLIC_STATUSES])
    sort = filters.ChoiceFilter(choices=[(k, k) for k in SORT_ORDERING], method="apply_sort")

    class Meta:
        model = LivestockListing
        fields = ["q", "category", "breed", "min_price", "max_price", "status", "sort"]
        form = ListingFilterForm

    def search(self, queryset, name, value):
        value = value.strip()
        if not value:
            return queryset
        return queryset.filter(
            Q(title__icontains=value)
            | Q(breed__icontains=value)
            | Q(location__icontains=value)
            | Q(description__icontains=value)
        )

    def apply_sort(self, queryset, name, value):
        return queryset.order_by(*SORT_ORDERING[value])

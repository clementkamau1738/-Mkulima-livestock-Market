from rest_framework import serializers

from config.serializer_fields import AllowedTransitionsField

from .models import Category, LivestockImage, LivestockListing
from .serializers import ImageSerializer, ListingListSerializer
from .services import LISTING_WORKFLOW
from .validators import validate_image_extension, validate_image_file


class AdminListingSerializer(ListingListSerializer):
    allowed_transitions = AllowedTransitionsField(LISTING_WORKFLOW)
    image_count = serializers.SerializerMethodField()

    class Meta(ListingListSerializer.Meta):
        fields = [*ListingListSerializer.Meta.fields, "allowed_transitions", "image_count", "created_at", "updated_at"]

    def get_image_count(self, listing):
        return len(listing.images.all())


class AdminListingDetailSerializer(AdminListingSerializer):
    images = ImageSerializer(many=True, read_only=True)

    class Meta(AdminListingSerializer.Meta):
        fields = [*AdminListingSerializer.Meta.fields, "description", "images"]


class ListingWriteSerializer(serializers.ModelSerializer):
    """Fields staff may edit. Status, slug and publication date are never
    written here: status moves only through the workflow."""

    category = serializers.SlugRelatedField(slug_field="slug", queryset=Category.objects.all())
    title = serializers.CharField(min_length=5, max_length=150)
    price_kes = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=1, max_value=100_000_000)
    age_months = serializers.IntegerField(min_value=0, max_value=360, required=False, allow_null=True)
    weight_kg = serializers.IntegerField(min_value=1, max_value=3000, required=False, allow_null=True)
    description = serializers.CharField(min_length=20, max_length=5000)

    class Meta:
        model = LivestockListing
        fields = ["title", "breed", "category", "sex", "age_months", "weight_kg", "location", "price_kes", "description"]


class ImageUploadSerializer(serializers.ModelSerializer):
    """Checks the real format, size and dimensions. The uploaded file name is
    never stored (a random one is), so its length is not limited."""

    image = serializers.ImageField(max_length=None, validators=[validate_image_extension, validate_image_file])

    class Meta:
        model = LivestockImage
        fields = ["image", "alt_text", "caption"]


class ImageUpdateSerializer(serializers.Serializer):
    alt_text = serializers.CharField(required=False, allow_blank=True, max_length=200)
    caption = serializers.CharField(required=False, allow_blank=True, max_length=200)
    sort_order = serializers.IntegerField(required=False, min_value=0, max_value=1000)
    is_primary = serializers.BooleanField(required=False)


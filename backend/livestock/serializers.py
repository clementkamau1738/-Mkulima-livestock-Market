from rest_framework import serializers

from .models import Category, LivestockImage, LivestockListing


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ["slug", "name", "description"]


class CategoryRefSerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ["slug", "name"]


class ImageSerializer(serializers.ModelSerializer):
    url = serializers.ImageField(source="image", read_only=True)

    class Meta:
        model = LivestockImage
        fields = ["id", "url", "alt_text", "caption", "is_primary", "sort_order"]


class ListingListSerializer(serializers.ModelSerializer):
    category = CategoryRefSerializer(read_only=True)
    primary_image = serializers.SerializerMethodField()

    class Meta:
        model = LivestockListing
        fields = [
            "id",
            "slug",
            "title",
            "breed",
            "category",
            "sex",
            "age_months",
            "weight_kg",
            "location",
            "price_kes",
            "status",
            "published_at",
            "primary_image",
        ]

    def get_primary_image(self, listing):
        # Images are prefetched and ordered primary-first.
        images = list(listing.images.all())
        return ImageSerializer(images[0], context=self.context).data if images else None


class ListingDetailSerializer(ListingListSerializer):
    images = ImageSerializer(many=True, read_only=True)

    class Meta(ListingListSerializer.Meta):
        fields = [*ListingListSerializer.Meta.fields, "description", "images"]

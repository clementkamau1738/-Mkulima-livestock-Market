from .models import Category, LivestockListing


def public_listings():
    return LivestockListing.objects.public().select_related("category").prefetch_related("images")


def related_listings(listing, limit=3):
    return (
        public_listings()
        .filter(category_id=listing.category_id, status__in=LivestockListing.INQUIRABLE_STATUSES)
        .exclude(pk=listing.pk)[:limit]
    )


def public_breeds():
    return list(LivestockListing.objects.public().order_by("breed").values_list("breed", flat=True).distinct())


def active_categories():
    return Category.objects.filter(is_active=True)

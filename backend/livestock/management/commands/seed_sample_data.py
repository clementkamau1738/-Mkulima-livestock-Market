"""Load the fictional sample marketplace (matches the frontend's sample data).

Idempotent: records are matched by slug and only created when missing, so
running it again neither duplicates rows nor overwrites edits made in the admin.
Images are original illustrations rendered from frontend/public/images.
"""

import json
from pathlib import Path

from django.core.files import File
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils.dateparse import parse_datetime

from livestock.models import Category, LivestockImage, LivestockListing
from payments.models import PaymentInstructions

DATA_DIR = Path(__file__).resolve().parents[2] / "sample_data"


class Command(BaseCommand):
    help = "Create fictional sample categories, listings and images. Safe to run repeatedly."

    @transaction.atomic
    def handle(self, *args, **options):
        data = json.loads((DATA_DIR / "sample_data.json").read_text())
        counts = {"categories": 0, "listings": 0, "images": 0}

        slugs = [row["slug"] for row in data["listings"]]
        categories = {}
        for row in data["categories"]:
            slug = row.pop("slug")
            categories[slug], created = Category.objects.get_or_create(slug=slug, defaults=row)
            counts["categories"] += created

        for row in data["listings"]:
            images = row.pop("images")
            slug = row.pop("slug")
            row["category"] = categories[row["category"]]
            row["published_at"] = parse_datetime(row["published_at"])
            listing, created = LivestockListing.objects.get_or_create(slug=slug, defaults=row)
            counts["listings"] += created
            if not listing.images.exists():
                counts["images"] += self._add_images(listing, images)

        PaymentInstructions.objects.get_or_create(pk=PaymentInstructions.SINGLETON_ID)
        total = LivestockListing.objects.filter(slug__in=slugs).count()

        self.stdout.write(
            self.style.SUCCESS(
                f"Created {counts['categories']} categories, {counts['listings']} listings, {counts['images']} images "
                f"({total} sample listings now present)."
            )
        )

    def _add_images(self, listing, images):
        for spec in images:
            image = LivestockImage(
                listing=listing,
                alt_text=spec["alt_text"],
                sort_order=spec["sort_order"],
                is_primary=spec["is_primary"],
            )
            with (DATA_DIR / "images" / spec["file"]).open("rb") as fh:
                image.image.save(spec["file"], File(fh), save=False)
                image.full_clean()
            image.save()
        return len(images)

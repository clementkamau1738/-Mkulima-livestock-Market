"""Load the fictional sample marketplace (matches the frontend's sample data).

Idempotent: records are matched by slug and only created when missing, so
running it again neither duplicates rows nor overwrites edits made in the admin.

Images are openly licensed photographs from Wikimedia Commons of similar
animals (not the fictional animals listed); each image's caption carries its
credit, and sample_data/CREDITS.md lists author, license and source.
--replace-images swaps the photos of the sample listings for the current set.
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

    def add_arguments(self, parser):
        parser.add_argument(
            "--replace-images",
            action="store_true",
            help="Delete the sample listings' current images (and files) and add the bundled photos.",
        )

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
            if options["replace_images"]:
                self._remove_images(listing)
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

    def _remove_images(self, listing):
        for image in listing.images.all():
            name, storage = image.image.name, image.image.storage
            image.delete()
            transaction.on_commit(lambda name=name, storage=storage: storage.delete(name))

    def _add_images(self, listing, images):
        for spec in images:
            image = LivestockImage(
                listing=listing,
                alt_text=spec["alt_text"],
                caption=spec.get("caption", ""),
                sort_order=spec["sort_order"],
                is_primary=spec["is_primary"],
            )
            with (DATA_DIR / "images" / spec["file"]).open("rb") as fh:
                image.image.save(spec["file"], File(fh), save=False)
                image.full_clean()
            image.save()
        return len(images)

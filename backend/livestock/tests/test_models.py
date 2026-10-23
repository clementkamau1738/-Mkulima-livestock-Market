from datetime import timedelta

from django.core.exceptions import ValidationError
from django.core.files.uploadedfile import SimpleUploadedFile
from django.db import IntegrityError
from django.utils import timezone

from config.testing import APITestCase, image_bytes, image_upload, make_listing
from livestock.models import LivestockImage, LivestockListing, listing_image_path
from livestock.validators import MAX_IMAGE_BYTES, validate_image_file


class ListingModelTests(APITestCase):
    def test_price_must_be_positive(self):
        with self.assertRaises(IntegrityError):
            make_listing(price_kes=0)

    def test_publishing_sets_published_at_once(self):
        listing = make_listing(status=LivestockListing.Status.DRAFT, published_at=None)
        self.assertIsNone(listing.published_at)
        listing.status = LivestockListing.Status.AVAILABLE
        listing.save()
        first = listing.published_at
        self.assertIsNotNone(first)
        listing.status = LivestockListing.Status.RESERVED
        listing.save()
        self.assertEqual(listing.published_at, first)

    def test_database_rejects_public_listing_without_published_at(self):
        listing = make_listing()
        with self.assertRaises(IntegrityError):
            LivestockListing.objects.filter(pk=listing.pk).update(published_at=None)

    def test_slug_is_generated_and_unique(self):
        a = make_listing(title="Friesian heifer")
        b = make_listing(title="Friesian heifer")
        self.assertTrue(a.slug.startswith("friesian-heifer-"))
        self.assertNotEqual(a.slug, b.slug)

    def test_public_queryset_hides_draft_archived_and_future(self):
        visible = make_listing()
        make_listing(status=LivestockListing.Status.DRAFT, published_at=None)
        make_listing(status=LivestockListing.Status.ARCHIVED)
        make_listing(published_at=timezone.now() + timedelta(days=2))
        self.assertEqual(list(LivestockListing.objects.public()), [visible])

    def test_only_one_primary_image_per_listing(self):
        listing = make_listing()
        LivestockImage.objects.create(listing=listing, image=image_upload(), is_primary=True)
        LivestockImage.objects.create(listing=listing, image=image_upload(), is_primary=False)
        with self.assertRaises(IntegrityError):
            LivestockImage.objects.create(listing=listing, image=image_upload(), is_primary=True)


class ImageValidationTests(APITestCase):
    def full_clean_with(self, upload):
        image = LivestockImage(listing=make_listing(), image=upload)
        image.full_clean()

    def test_accepts_valid_jpeg_png_webp(self):
        for fmt, name in [("JPEG", "a.jpg"), ("PNG", "b.png"), ("WEBP", "c.webp")]:
            self.full_clean_with(image_upload(name, fmt=fmt))

    def test_rejects_disallowed_extension(self):
        with self.assertRaises(ValidationError):
            self.full_clean_with(SimpleUploadedFile("anim.gif", image_bytes(fmt="GIF"), content_type="image/gif"))

    def test_rejects_non_image_with_image_extension(self):
        fake = SimpleUploadedFile("photo.jpg", b"<?php system($_GET['c']); ?>", content_type="image/jpeg")
        with self.assertRaises(ValidationError) as ctx:
            self.full_clean_with(fake)
        self.assertIn("image", str(ctx.exception).lower())

    def test_rejects_format_that_does_not_match_allowed_types(self):
        # A real GIF renamed to .png passes the extension check but not the format check.
        disguised = SimpleUploadedFile("photo.png", image_bytes(fmt="GIF"), content_type="image/png")
        with self.assertRaises(ValidationError):
            self.full_clean_with(disguised)

    def test_rejects_too_small_dimensions(self):
        with self.assertRaises(ValidationError):
            self.full_clean_with(image_upload(size=(300, 300)))

    def test_rejects_oversized_file(self):
        big = SimpleUploadedFile("big.png", image_bytes(), content_type="image/png")
        big.size = MAX_IMAGE_BYTES + 1
        with self.assertRaises(ValidationError):
            validate_image_file(big)

    def test_upload_path_discards_the_client_filename(self):
        image = LivestockImage(listing=make_listing())
        path = listing_image_path(image, "../../etc/passwd/evil.PHP.JPG")
        self.assertRegex(path, rf"^livestock/{image.listing_id}/[0-9a-f]{{32}}\.jpg$")

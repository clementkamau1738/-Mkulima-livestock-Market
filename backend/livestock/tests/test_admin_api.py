import os
from unittest import mock

from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse

from config.testing import APITestCase, image_upload, make_category, make_listing, make_user
from livestock.models import LivestockImage, LivestockListing
from transactions.models import AuditLog

LIST = reverse("admin-livestock-list")


def detail(pk):
    return reverse("admin-livestock-detail", args=[pk])


def images_url(pk):
    return reverse("admin-livestock-images", args=[pk])


def image_url(pk, image_id):
    return reverse("admin-livestock-image", args=[pk, image_id])


class ListingTestCase(APITestCase):
    def setUp(self):
        super().setUp()
        self.staff = make_user(role="staff")
        self.client.force_authenticate(self.staff)
        self.category = make_category("dairy")

    def payload(self, **overrides):
        data = {
            "title": "Friesian heifer, 2 years",
            "breed": "Friesian",
            "category": "dairy",
            "sex": "female",
            "age_months": 24,
            "location": "Nakuru",
            "price_kes": "150000",
            "description": "Healthy heifer, vaccinated, ready for service.",
        }
        data.update(overrides)
        return data

    def create(self, **overrides):
        response = self.client.post(LIST, self.payload(**overrides))
        self.assertEqual(response.status_code, 201, response.content)
        return response.json()

    def upload(self, pk, **kwargs):
        return self.client.post(images_url(pk), {"image": image_upload(**kwargs), "alt_text": "Side view"}, format="multipart")

    def transition(self, pk, status):
        return self.client.post(reverse("admin-livestock-transition", args=[pk]), {"status": status})


class ListingManagementTests(ListingTestCase):
    def test_new_listings_are_drafts_whatever_the_client_sends(self):
        data = self.create(status="available", published_at="2020-01-01T00:00:00Z", created_by=99)
        self.assertEqual(data["status"], "draft")
        self.assertIsNone(data["published_at"])
        self.assertEqual(data["allowed_transitions"], ["available", "archived"])
        listing = LivestockListing.objects.get()
        self.assertEqual(listing.created_by, self.staff)
        self.assertEqual(self.client.get(reverse("livestock-detail", args=[listing.pk])).status_code, 404, "drafts are not public")
        self.assertTrue(AuditLog.objects.filter(action="listing.create", actor=self.staff).exists())

    def test_edits_are_validated_and_audited(self):
        pk = self.create()["id"]
        self.assertError(self.client.patch(detail(pk), {"price_kes": "0", "category": "nope"}), 400, fields=["price_kes", "category"])
        response = self.client.patch(detail(pk), {"price_kes": "145000", "status": "sold"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "draft", "status changes only through the workflow")
        audit = AuditLog.objects.get(action="listing.update")
        self.assertEqual(audit.changes, {"price_kes": ["150000.00", "145000.00"]})

    def test_publishing_needs_a_photo_then_follows_the_workflow(self):
        pk = self.create()["id"]
        self.assertError(self.transition(pk, "available"), 400)
        self.assertEqual(self.upload(pk).status_code, 201)
        response = self.transition(pk, "available")
        self.assertEqual(response.status_code, 200)
        self.assertIsNotNone(response.json()["published_at"])
        self.assertEqual(self.client.get(reverse("livestock-detail", args=[pk])).status_code, 200)
        self.assertEqual(self.transition(pk, "reserved").json()["allowed_transitions"], ["available", "sold", "archived"])
        self.assertEqual(self.transition(pk, "sold").json()["allowed_transitions"], ["archived"])
        self.assertError(self.transition(pk, "available"), 409, "invalid_transition")
        self.assertError(self.transition(pk, "draft"), 409, "invalid_transition")
        self.assertEqual(self.transition(pk, "archived").json()["allowed_transitions"], ["draft"])
        self.assertEqual(self.client.get(reverse("livestock-detail", args=[pk])).status_code, 404)
        actions = list(AuditLog.objects.filter(target_id=str(pk), action__in=["listing.available", "listing.reserved", "listing.sold", "listing.archived"]).values_list("action", flat=True))
        self.assertEqual(sorted(actions), ["listing.archived", "listing.available", "listing.reserved", "listing.sold"])

    def test_listing_table_filters(self):
        make_listing(title="Boran bull", status="available", category=self.category)
        make_listing(title="Old draft", status="draft", published_at=None, category=self.category)
        self.assertEqual([r["title"] for r in self.client.get(LIST, {"status": "draft"}).json()["results"]], ["Old draft"])
        self.assertEqual([r["title"] for r in self.client.get(LIST, {"q": "boran"}).json()["results"]], ["Boran bull"])


class ImageUploadTests(ListingTestCase):
    def test_first_photo_is_primary_and_file_is_stored(self):
        pk = self.create()["id"]
        first = self.upload(pk).json()
        second = self.upload(pk).json()
        self.assertTrue(first["is_primary"])
        self.assertFalse(second["is_primary"])
        stored = LivestockImage.objects.get(pk=first["id"])
        self.assertTrue(os.path.exists(stored.image.path))
        self.assertRegex(stored.image.name, rf"^livestock/{pk}/[0-9a-f]{{32}}\.png$")

    def test_rejects_wrong_type_even_with_an_image_extension(self):
        pk = self.create()["id"]
        fake = SimpleUploadedFile("cow.png", b"GIF89a not really a png", content_type="image/png")
        self.assertError(self.client.post(images_url(pk), {"image": fake}, format="multipart"), 400, fields=["image"])
        gif = image_upload("cow.gif", fmt="GIF", content_type="image/gif")
        self.assertError(self.client.post(images_url(pk), {"image": gif}, format="multipart"), 400, fields=["image"])
        self.assertEqual(LivestockImage.objects.count(), 0)

    def test_rejects_bad_dimensions_and_size(self):
        pk = self.create()["id"]
        self.assertError(self.upload(pk, size=(300, 600)), 400, fields=["image"])
        with mock.patch("livestock.validators.MAX_IMAGE_BYTES", 1000):
            error = self.assertError(self.upload(pk), 400, fields=["image"])
        self.assertIn("5 MB", error["fields"]["image"][0])
        self.assertEqual(LivestockImage.objects.count(), 0)

    def test_limits_photos_per_listing(self):
        pk = self.create()["id"]
        with mock.patch("livestock.services.MAX_IMAGES_PER_LISTING", 1):
            self.upload(pk)
            self.assertError(self.upload(pk), 400, fields=["image"])

    def test_make_primary_edit_and_delete(self):
        pk = self.create()["id"]
        first, second = self.upload(pk).json(), self.upload(pk).json()
        response = self.client.patch(image_url(pk, second["id"]), {"is_primary": True, "alt_text": "Front view"})
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(list(LivestockImage.objects.filter(is_primary=True).values_list("pk", flat=True)), [second["id"]])
        path = LivestockImage.objects.get(pk=second["id"]).image.path
        with self.captureOnCommitCallbacks(execute=True):
            self.assertEqual(self.client.delete(image_url(pk, second["id"])).status_code, 204)
        self.assertFalse(os.path.exists(path), "file removed after commit")
        self.assertTrue(LivestockImage.objects.get(pk=first["id"]).is_primary, "next photo promoted")
        self.assertError(self.client.delete(image_url(pk, 99999)), 404)

    def test_published_listing_keeps_at_least_one_photo(self):
        pk = self.create()["id"]
        only = self.upload(pk).json()
        self.transition(pk, "available")
        self.assertError(self.client.delete(image_url(pk, only["id"])), 400)
        self.assertEqual(LivestockImage.objects.count(), 1)

    def test_images_of_another_listing_cannot_be_touched(self):
        a, b = self.create()["id"], self.create()["id"]
        photo = self.upload(a).json()
        self.assertError(self.client.delete(image_url(b, photo["id"])), 404)
        self.assertEqual(LivestockImage.objects.count(), 1)

    def test_malicious_file_names_are_never_used(self):
        pk = self.create()["id"]
        for name in ("../../../../etc/cron.d/evil.png", "..\\..\\windows\\evil.png", "<img src=x onerror=alert(1)>.png", "a" * 300 + ".png", "photo.PNG"):
            response = self.client.post(images_url(pk), {"image": image_upload(name=name)}, format="multipart")
            self.assertEqual(response.status_code, 201, (name[:40], response.content))
        for photo in LivestockImage.objects.all():
            self.assertRegex(photo.image.name, rf"^livestock/{pk}/[0-9a-f]{{32}}\.png$")
            self.assertTrue(os.path.realpath(photo.image.path).startswith(os.path.realpath(self._media)))

    def test_dangerous_types_are_rejected_whatever_their_name(self):
        pk = self.create()["id"]
        svg = SimpleUploadedFile("cow.svg", b'<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>', content_type="image/svg+xml")
        html_as_png = SimpleUploadedFile("cow.png", b"<html><script>alert(1)</script></html>", content_type="image/png")
        php = image_upload(name="shell.php")
        double = image_upload(name="cow.png.php")
        for upload in (svg, html_as_png, php, double):
            self.assertError(self.client.post(images_url(pk), {"image": upload}, format="multipart"), 400, fields=["image"])
        self.assertEqual(LivestockImage.objects.count(), 0)

    def test_customers_cannot_upload(self):
        pk = self.create()["id"]
        self.client.force_authenticate(make_user())
        self.assertError(self.upload(pk), 403)
        self.assertEqual(LivestockImage.objects.count(), 0)


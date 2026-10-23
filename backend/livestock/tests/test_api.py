from decimal import Decimal
from io import StringIO

from django.core.management import call_command
from django.urls import reverse

from config.testing import APITestCase, image_upload, make_category, make_listing
from livestock.models import Category, LivestockImage, LivestockListing

LIST_URL = reverse("livestock-list")


def detail_url(pk):
    return reverse("livestock-detail", args=[pk])


class PublicVisibilityTests(APITestCase):
    def setUp(self):
        super().setUp()
        self.visible = make_listing(title="Visible")
        self.draft = make_listing(title="Draft", status=LivestockListing.Status.DRAFT, published_at=None)
        self.archived = make_listing(title="Archived", status=LivestockListing.Status.ARCHIVED)
        self.sold = make_listing(title="Sold", status=LivestockListing.Status.SOLD)

    def test_list_shows_only_published_non_draft_listings(self):
        response = self.client.get(LIST_URL)
        self.assertEqual(response.status_code, 200)
        titles = {r["title"] for r in response.json()["results"]}
        self.assertEqual(titles, {"Visible", "Sold"})

    def test_draft_and_archived_details_are_not_found(self):
        for listing in (self.draft, self.archived):
            self.assertError(self.client.get(detail_url(listing.pk)), 404, "not_found")

    def test_detail_includes_description_and_ordered_images(self):
        LivestockImage.objects.create(listing=self.visible, image=image_upload(), sort_order=1, alt_text="second")
        LivestockImage.objects.create(listing=self.visible, image=image_upload(), sort_order=2, is_primary=True, alt_text="primary")
        data = self.client.get(detail_url(self.visible.pk)).json()
        self.assertEqual(data["description"], self.visible.description)
        self.assertEqual([i["alt_text"] for i in data["images"]], ["primary", "second"])
        self.assertTrue(data["images"][0]["url"].startswith("http://testserver/media/livestock/"))

    def test_list_card_has_primary_image_or_null(self):
        results = self.client.get(LIST_URL).json()["results"]
        self.assertTrue(all(r["primary_image"] is None for r in results))
        self.assertNotIn("description", results[0])

    def test_write_methods_are_not_allowed(self):
        self.assertIn(self.client.post(LIST_URL, {"title": "x"}).status_code, (403, 405))
        self.assertIn(self.client.delete(detail_url(self.visible.pk)).status_code, (403, 405))


class FilterSortPaginateTests(APITestCase):
    def setUp(self):
        super().setUp()
        dairy = make_category("dairy")
        bulls = make_category("bulls")
        self.rows = [
            make_listing(dairy, title="Friesian heifer", breed="Friesian", location="Njoro, Nakuru", price_kes=Decimal("165000")),
            make_listing(dairy, title="Jersey heifer", breed="Jersey", location="Limuru, Kiambu", price_kes=Decimal("98000")),
            make_listing(bulls, title="Boran bull", breed="Boran", location="Narok", price_kes=Decimal("260000")),
            make_listing(bulls, title="Sahiwal bull", breed="Sahiwal", location="Machakos", price_kes=Decimal("185000"),
                         description="Docile bull from Kiambu stock"),
        ]

    def titles(self, query=""):
        response = self.client.get(f"{LIST_URL}?{query}")
        self.assertEqual(response.status_code, 200, response.content)
        return [r["title"] for r in response.json()["results"]]

    def test_keyword_search_covers_title_breed_location_description(self):
        self.assertEqual(set(self.titles("q=kiambu")), {"Jersey heifer", "Sahiwal bull"})
        self.assertEqual(self.titles("q=BORAN"), ["Boran bull"])

    def test_category_breed_and_price_filters(self):
        self.assertEqual(set(self.titles("category=bulls")), {"Boran bull", "Sahiwal bull"})
        self.assertEqual(self.titles("breed=jersey"), ["Jersey heifer"])
        self.assertEqual(set(self.titles("min_price=150000&max_price=200000")), {"Friesian heifer", "Sahiwal bull"})

    def test_sorting(self):
        self.assertEqual(self.titles("sort=price_asc")[0], "Jersey heifer")
        self.assertEqual(self.titles("sort=price_desc")[0], "Boran bull")
        self.assertEqual(self.titles("sort=newest")[0], "Sahiwal bull")
        self.assertEqual(self.titles(), self.titles("sort=newest"))

    def test_pagination_shape(self):
        data = self.client.get(f"{LIST_URL}?page_size=3&page=2").json()
        self.assertEqual((data["count"], data["page"], data["total_pages"]), (4, 2, 2))
        self.assertEqual(len(data["results"]), 1)
        self.assertIsNone(data["next"])
        self.assertIsNotNone(data["previous"])

    def test_page_size_is_capped(self):
        for _ in range(50):
            make_listing()
        self.assertEqual(len(self.client.get(f"{LIST_URL}?page_size=500").json()["results"]), 50)

    def test_out_of_range_page_is_404(self):
        self.assertError(self.client.get(f"{LIST_URL}?page=99"), 404)

    def test_invalid_filters_return_consistent_errors(self):
        error = self.assertError(self.client.get(f"{LIST_URL}?min_price=abc&sort=cheapest"), 400, "validation_error", ["min_price", "sort"])
        self.assertIsInstance(error["fields"]["sort"], list)
        self.assertError(self.client.get(f"{LIST_URL}?min_price=-5"), 400, "validation_error", ["min_price"])
        self.assertError(self.client.get(f"{LIST_URL}?min_price=300000&max_price=100000"), 400, "validation_error", ["min_price"])

    def test_related_listings(self):
        friesian, jersey, *_ = self.rows
        make_listing(friesian.category, title="Sold heifer", status=LivestockListing.Status.SOLD)
        make_listing(friesian.category, title="Draft heifer", status=LivestockListing.Status.DRAFT, published_at=None)
        response = self.client.get(reverse("livestock-related", args=[friesian.pk]))
        self.assertEqual([r["title"] for r in response.json()], ["Jersey heifer"])

    def test_breeds_lists_distinct_public_breeds(self):
        make_listing(breed="Ankole", status=LivestockListing.Status.DRAFT, published_at=None)
        make_listing(breed="Friesian")
        self.assertEqual(self.client.get(reverse("livestock-breeds")).json(), ["Boran", "Friesian", "Jersey", "Sahiwal"])

    def test_categories_endpoint_lists_active_categories(self):
        make_category("goats", is_active=False)
        slugs = [c["slug"] for c in self.client.get(reverse("category-list")).json()]
        self.assertEqual(sorted(slugs), ["bulls", "dairy"])


class SeedCommandTests(APITestCase):
    def test_seed_is_idempotent(self):
        call_command("seed_sample_data", stdout=StringIO())
        counts = (Category.objects.count(), LivestockListing.objects.count(), LivestockImage.objects.count())
        self.assertEqual(counts, (4, 14, 42))

        listing = LivestockListing.objects.get(slug="boran-bull-narok")
        listing.price_kes = Decimal("250000")
        listing.save()

        out = StringIO()
        call_command("seed_sample_data", stdout=out)
        self.assertIn("Created 0 categories, 0 listings, 0 images", out.getvalue())
        self.assertEqual((Category.objects.count(), LivestockListing.objects.count(), LivestockImage.objects.count()), counts)
        listing.refresh_from_db()
        self.assertEqual(listing.price_kes, Decimal("250000"), "seed must not overwrite admin edits")

    def test_seeded_data_matches_frontend_sample(self):
        call_command("seed_sample_data", stdout=StringIO())
        data = self.client.get(f"{LIST_URL}?page_size=50").json()
        self.assertEqual(data["count"], 14)
        sahiwal = LivestockListing.objects.get(slug="sahiwal-bull-machakos")
        self.assertIsNone(sahiwal.age_months)
        self.assertEqual(LivestockListing.objects.filter(status="sold").count(), 1)
        self.assertEqual(LivestockImage.objects.filter(is_primary=True).count(), 14)


class StatusFilterTests(APITestCase):
    def test_filter_by_public_status_only(self):
        make_listing(title="Open")
        make_listing(title="Gone", status=LivestockListing.Status.SOLD)
        response = self.client.get(f"{LIST_URL}?status=available")
        self.assertEqual([r["title"] for r in response.json()["results"]], ["Open"])
        self.assertError(self.client.get(f"{LIST_URL}?status=draft"), 400, fields=["status"])

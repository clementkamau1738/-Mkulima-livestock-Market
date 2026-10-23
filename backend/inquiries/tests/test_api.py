from django.urls import reverse

from config.testing import APITestCase, make_listing, make_user
from inquiries.models import PurchaseInquiry
from livestock.models import LivestockListing

URL = reverse("inquiry-list")


class InquiryCreateTests(APITestCase):
    def setUp(self):
        super().setUp()
        self.listing = make_listing()

    def payload(self, **overrides):
        data = {
            "listing": self.listing.pk,
            "full_name": "Wanjiku Test",
            "phone": "0712 345 678",
            "email": "",
            "message": "I would like to arrange a viewing.",
        }
        data.update(overrides)
        return data

    def test_anonymous_inquiry_is_created_pending(self):
        response = self.client.post(URL, self.payload())
        self.assertEqual(response.status_code, 201, response.content)
        data = response.json()
        self.assertRegex(data["reference"], r"^INQ-[A-HJ-NP-Z2-9]{8}$")
        self.assertEqual(data["status"], "pending")
        self.assertEqual(data["phone"], "+254712345678")
        self.assertEqual(data["listing"]["id"], self.listing.pk)
        inquiry = PurchaseInquiry.objects.get(reference=data["reference"])
        self.assertIsNone(inquiry.user)
        self.assertEqual([(h.from_status, h.to_status) for h in inquiry.history.all()], [("", "pending")])

    def test_client_cannot_set_status_user_or_reference(self):
        other = make_user()
        response = self.client.post(URL, self.payload(status="completed", user=other.pk, reference="INQ-HACKED00"))
        self.assertEqual(response.status_code, 201)
        inquiry = PurchaseInquiry.objects.get()
        self.assertEqual(inquiry.status, "pending")
        self.assertIsNone(inquiry.user)
        self.assertNotEqual(inquiry.reference, "INQ-HACKED00")

    def test_identity_comes_from_the_session(self):
        me, other = make_user(), make_user()
        self.client.force_authenticate(me)
        self.client.post(URL, self.payload(user=other.pk))
        self.assertEqual(PurchaseInquiry.objects.get().user, me)

    def test_validation_errors(self):
        error = self.assertError(
            self.client.post(URL, {"listing": self.listing.pk, "phone": "123", "message": "hi", "email": "nope"}),
            400,
            "validation_error",
            ["full_name", "phone", "message", "email"],
        )
        self.assertIn("Kenyan", error["fields"]["phone"][0])
        self.assertEqual(PurchaseInquiry.objects.count(), 0)

    def test_rejects_listings_that_are_not_open(self):
        for status in ("sold", "archived"):
            listing = make_listing(status=status)
            self.assertError(self.client.post(URL, self.payload(listing=listing.pk)), 400, "validation_error", ["listing"])
        draft = make_listing(status=LivestockListing.Status.DRAFT, published_at=None)
        self.assertError(self.client.post(URL, self.payload(listing=draft.pk)), 400, fields=["listing"])
        self.assertError(self.client.post(URL, self.payload(listing=999999)), 400, fields=["listing"])

    def test_reserved_listing_still_accepts_inquiries(self):
        listing = make_listing(status=LivestockListing.Status.RESERVED)
        self.assertEqual(self.client.post(URL, self.payload(listing=listing.pk)).status_code, 201)

    def test_create_is_rate_limited(self):
        statuses = [self.client.post(URL, self.payload()).status_code for _ in range(11)]
        self.assertEqual(statuses[:10], [201] * 10)
        error = self.assertError(self.client.post(URL, self.payload()), 429, "throttled")
        self.assertIn("retry_after_seconds", error)


class InquiryAccessTests(APITestCase):
    def setUp(self):
        super().setUp()
        self.alice, self.bob = make_user(), make_user()
        listing = make_listing()
        payload = {"listing": listing.pk, "full_name": "Alice", "phone": "0712345678", "message": "Interested in this one."}
        self.client.force_authenticate(self.alice)
        self.alice_ref = self.client.post(URL, payload).json()["reference"]
        self.client.force_authenticate(self.bob)
        self.bob_ref = self.client.post(URL, {**payload, "full_name": "Bob"}).json()["reference"]
        self.client.force_authenticate(None)
        self.client.post(URL, {**payload, "full_name": "Anon"})

    def test_anonymous_cannot_list_or_read(self):
        self.assertError(self.client.get(URL), 403, "not_authenticated")
        self.assertError(self.client.get(reverse("inquiry-detail", args=[self.alice_ref])), 403, "not_authenticated")

    def test_customers_see_only_their_own(self):
        self.client.force_authenticate(self.alice)
        data = self.client.get(URL).json()
        self.assertEqual([r["reference"] for r in data["results"]], [self.alice_ref])
        self.assertEqual(self.client.get(reverse("inquiry-detail", args=[self.alice_ref])).status_code, 200)
        self.assertError(self.client.get(reverse("inquiry-detail", args=[self.bob_ref])), 404, "not_found")

    def test_customers_cannot_modify_or_delete(self):
        self.client.force_authenticate(self.alice)
        url = reverse("inquiry-detail", args=[self.alice_ref])
        for method in (self.client.patch, self.client.put, self.client.delete):
            self.assertEqual(method(url, {"status": "completed"}).status_code, 405)
        self.assertEqual(PurchaseInquiry.objects.get(reference=self.alice_ref).status, "pending")

"""One open inquiry per buyer per animal, guest tracking, customer
cancellation, and staff not handling their own inquiries."""

from unittest import mock

from django.db import IntegrityError, transaction
from django.urls import reverse

from config.testing import APITestCase, make_listing, make_user
from inquiries.models import PurchaseInquiry
from inquiries.services import submit_inquiry
from transactions.models import AuditLog

URL = reverse("inquiry-list")
TRACK = reverse("inquiry-track")


def cancel_url(reference):
    return reverse("inquiry-cancel", args=[reference])


def payload(listing, **overrides):
    data = {"listing": listing.pk, "full_name": "Wanjiku Test", "phone": "0712 345 678", "message": "Is this animal still available?"}
    data.update(overrides)
    return data


class DuplicateInquiryTests(APITestCase):
    def setUp(self):
        super().setUp()
        self.listing = make_listing()

    def test_signed_in_buyer_gets_one_open_inquiry_per_animal(self):
        self.client.force_authenticate(make_user())
        first = self.client.post(URL, payload(self.listing)).json()["reference"]
        error = self.assertError(self.client.post(URL, payload(self.listing, phone="0722 000 111")), 400, fields=["listing"])
        self.assertIn(first, error["fields"]["listing"][0])
        self.assertEqual(PurchaseInquiry.objects.count(), 1)
        # Another animal is a separate inquiry.
        self.assertEqual(self.client.post(URL, payload(make_listing())).status_code, 201)

    def test_guest_duplicate_is_matched_by_phone_and_never_reveals_the_reference(self):
        first = self.client.post(URL, payload(self.listing)).json()["reference"]
        error = self.assertError(self.client.post(URL, payload(self.listing, phone="+254712345678")), 400, fields=["listing"])
        self.assertNotIn(first, error["fields"]["listing"][0])
        # A different phone number is a different guest.
        self.assertEqual(self.client.post(URL, payload(self.listing, phone="0733 000 111")).status_code, 201)

    def test_guest_and_account_inquiries_do_not_block_each_other(self):
        self.client.post(URL, payload(self.listing))
        self.client.force_authenticate(make_user())
        self.assertEqual(self.client.post(URL, payload(self.listing)).status_code, 201)

    def test_a_closed_inquiry_allows_a_new_one(self):
        self.client.force_authenticate(make_user())
        ref = self.client.post(URL, payload(self.listing)).json()["reference"]
        self.client.post(cancel_url(ref))
        self.assertEqual(self.client.post(URL, payload(self.listing)).status_code, 201)

    def test_retrying_the_same_submission_still_returns_the_original(self):
        key = "8b0b7a4e-4f7c-4a43-9d0c-2f5a3b9f1c11"
        first = self.client.post(URL, payload(self.listing), HTTP_IDEMPOTENCY_KEY=key)
        retry = self.client.post(URL, payload(self.listing), HTTP_IDEMPOTENCY_KEY=key)
        self.assertEqual((first.status_code, retry.status_code), (201, 200))
        self.assertEqual(first.json()["reference"], retry.json()["reference"])

    def test_database_rejects_a_duplicate_that_skips_the_service(self):
        user = make_user()
        submit_inquiry(listing_id=self.listing.pk, user=user, full_name="A B", phone="+254712345678", email="", message="Hello there")
        with self.assertRaises(IntegrityError), transaction.atomic():
            PurchaseInquiry.objects.create(
                reference="INQ-RACE0001", listing=self.listing, user=user, full_name="A B", phone="+254700000000", message="Hello there"
            )

    def test_a_concurrent_duplicate_becomes_a_validation_error(self):
        # Simulate the race: the pre-check sees nothing, then the insert hits the constraint.
        user = make_user()
        submit_inquiry(listing_id=self.listing.pk, user=user, full_name="A B", phone="+254712345678", email="", message="Hello there")
        self.client.force_authenticate(user)
        real = PurchaseInquiry.objects.filter
        with mock.patch("inquiries.services._open_duplicate", side_effect=[None, real(user=user).first()]):
            self.assertError(self.client.post(URL, payload(self.listing)), 400, fields=["listing"])
        self.assertEqual(PurchaseInquiry.objects.count(), 1)


class TrackInquiryTests(APITestCase):
    def setUp(self):
        super().setUp()
        self.listing = make_listing(title="Friesian heifer")
        self.ref = self.client.post(URL, payload(self.listing, email="w@example.test")).json()["reference"]

    def test_guest_sees_status_and_history_with_reference_and_phone(self):
        response = self.client.post(TRACK, {"reference": self.ref, "phone": "0712345678"})
        self.assertEqual(response.status_code, 200, response.content)
        data = response.json()
        self.assertEqual(data["reference"], self.ref)
        self.assertEqual(data["status"], "pending")
        self.assertEqual(data["listing"]["title"], "Friesian heifer")
        self.assertEqual([h["to_status"] for h in data["history"]], ["pending"])
        # Progress only: never the contact details or the message that were sent.
        for private in ("phone", "email", "full_name", "message"):
            self.assertNotIn(private, data)

    def test_reference_and_phone_formats_are_forgiving(self):
        response = self.client.post(TRACK, {"reference": f"  {self.ref.lower()} ", "phone": "+254 712 345 678"})
        self.assertEqual(response.status_code, 200, response.content)

    def test_wrong_phone_or_reference_is_the_same_not_found(self):
        wrong_phone = self.assertError(self.client.post(TRACK, {"reference": self.ref, "phone": "0799000000"}), 404, "not_found")
        wrong_ref = self.assertError(self.client.post(TRACK, {"reference": "INQ-ZZZZZZZZ", "phone": "0712345678"}), 404, "not_found")
        self.assertEqual(wrong_phone["message"], wrong_ref["message"])

    def test_bad_input_is_a_validation_error(self):
        self.assertError(self.client.post(TRACK, {"reference": "DEP-12345678", "phone": "123"}), 400, fields=["reference", "phone"])

    def test_lookups_are_rate_limited_per_ip(self):
        for _ in range(30):
            self.client.post(TRACK, {"reference": "INQ-ZZZZZZZZ", "phone": "0712345678"})
        self.assertError(self.client.post(TRACK, {"reference": self.ref, "phone": "0712345678"}), 429, "throttled")

    def test_status_changes_show_up(self):
        staff = make_user(role="staff")
        self.client.force_authenticate(staff)
        self.client.post(reverse("admin-inquiry-transition", args=[self.ref]), {"status": "contacted", "reason": "Called the buyer"})
        self.client.force_authenticate(None)
        data = self.client.post(TRACK, {"reference": self.ref, "phone": "0712345678"}).json()
        self.assertEqual(data["status"], "contacted")
        self.assertEqual(data["history"][-1]["reason"], "Called the buyer")
        self.assertNotIn("changed_by", data["history"][-1])


class CustomerCancelTests(APITestCase):
    def setUp(self):
        super().setUp()
        self.customer = make_user()
        self.client.force_authenticate(self.customer)
        self.ref = self.client.post(URL, payload(make_listing())).json()["reference"]

    def test_customer_cancels_their_own_open_inquiry(self):
        response = self.client.post(cancel_url(self.ref), {"reason": "Bought elsewhere"})
        self.assertEqual(response.status_code, 200, response.content)
        data = response.json()
        self.assertEqual(data["status"], "cancelled")
        self.assertEqual(data["history"][-1]["reason"], "Bought elsewhere")
        log = AuditLog.objects.get(action="purchaseinquiry.cancelled")
        self.assertEqual(log.actor, self.customer)

    def test_reason_is_optional(self):
        data = self.client.post(cancel_url(self.ref)).json()
        self.assertEqual(data["history"][-1]["reason"], "Cancelled by the customer.")

    def test_repeat_is_harmless(self):
        self.client.post(cancel_url(self.ref))
        self.assertEqual(self.client.post(cancel_url(self.ref)).status_code, 200)
        self.assertEqual(AuditLog.objects.filter(action="purchaseinquiry.cancelled").count(), 1)

    def test_completed_inquiries_cannot_be_cancelled(self):
        PurchaseInquiry.objects.filter(reference=self.ref).update(status="completed")
        self.assertError(self.client.post(cancel_url(self.ref)), 409, "invalid_transition")

    def test_only_the_owner_can_cancel(self):
        self.client.force_authenticate(make_user())
        self.assertError(self.client.post(cancel_url(self.ref)), 404, "not_found")
        self.client.force_authenticate(make_user(role="staff"))  # staff use the admin workflow instead
        self.assertError(self.client.post(cancel_url(self.ref)), 404, "not_found")
        self.client.force_authenticate(None)
        self.assertError(self.client.post(cancel_url(self.ref)), 403, "not_authenticated")
        self.assertEqual(PurchaseInquiry.objects.get(reference=self.ref).status, "pending")


class StaffOwnInquiryTests(APITestCase):
    def test_staff_cannot_progress_their_own_inquiry(self):
        staff, colleague = make_user(role="staff"), make_user(role="staff")
        inquiry, _ = submit_inquiry(
            listing_id=make_listing().pk, user=staff, full_name="Staff Buyer", phone="+254712345678", email="", message="I want this one."
        )
        url = reverse("admin-inquiry-transition", args=[inquiry.reference])
        self.client.force_authenticate(staff)
        self.assertError(self.client.post(url, {"status": "contacted"}), 403, "permission_denied")
        self.client.force_authenticate(colleague)
        self.assertEqual(self.client.post(url, {"status": "contacted"}).status_code, 200)

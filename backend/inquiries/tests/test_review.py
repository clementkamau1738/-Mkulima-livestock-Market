from django.urls import reverse

from config.testing import APITestCase, make_listing, make_user
from inquiries.services import submit_inquiry
from transactions.models import AuditLog, RequestStatusHistory


class InquiryWorkflowTests(APITestCase):
    def setUp(self):
        super().setUp()
        self.staff = make_user(role="staff")
        self.client.force_authenticate(self.staff)
        self.inquiry, _ = submit_inquiry(
            listing_id=make_listing().pk, user=None, full_name="Wanjiku Test", phone="+254712345678", email="", message="Is it available?"
        )

    def move(self, status, **data):
        return self.client.post(reverse("admin-inquiry-transition", args=[self.inquiry.reference]), {"status": status, **data})

    def test_follows_the_sales_path(self):
        for status, allowed in (
            ("contacted", ["viewing_arranged", "cancelled"]),
            ("viewing_arranged", ["completed", "cancelled"]),
            ("completed", []),
        ):
            response = self.move(status, reason=f"Moved to {status}")
            self.assertEqual(response.status_code, 200, response.content)
            self.assertEqual(response.json()["allowed_transitions"], allowed)
        history = RequestStatusHistory.objects.filter(inquiry=self.inquiry)
        self.assertEqual([h.to_status for h in history], ["pending", "contacted", "viewing_arranged", "completed"])
        self.assertTrue(all(h.changed_by_id == self.staff.pk for h in history[1:]))
        self.assertEqual(AuditLog.objects.filter(target_type="inquiries.purchaseinquiry").count(), 3)

    def test_steps_cannot_be_skipped_or_reversed(self):
        self.assertError(self.move("completed"), 409, "invalid_transition")
        self.assertError(self.move("viewing_arranged"), 409, "invalid_transition")
        self.move("contacted")
        self.assertError(self.move("pending"), 409, "invalid_transition")
        self.assertError(self.move("approved"), 409, "invalid_transition")

    def test_cancel_needs_a_reason_and_is_final(self):
        self.move("contacted")
        self.assertError(self.move("cancelled"), 400, fields=["reason"])
        self.assertEqual(self.move("cancelled", reason="Buyer found another animal").status_code, 200)
        self.assertError(self.move("viewing_arranged"), 409, "invalid_transition")

    def test_repeat_is_harmless(self):
        self.move("contacted")
        self.assertEqual(self.move("contacted").status_code, 200)
        self.assertEqual(RequestStatusHistory.objects.filter(inquiry=self.inquiry, to_status="contacted").count(), 1)

    def test_detail_shows_reviewer_attribution(self):
        self.move("contacted", reason="Called the buyer")
        data = self.client.get(reverse("admin-inquiry-detail", args=[self.inquiry.reference])).json()
        self.assertEqual(data["history"][-1]["changed_by"]["email"], self.staff.email)
        self.assertEqual(data["history"][-1]["reason"], "Called the buyer")

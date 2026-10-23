from decimal import Decimal

from django.urls import reverse

from config.testing import APITestCase, make_listing, make_user
from payments.services import review_deposit, submit_deposit


class SummaryAndAuditTests(APITestCase):
    def setUp(self):
        super().setUp()
        self.staff = make_user(role="staff")
        self.client.force_authenticate(self.staff)

    def test_summary_counts_by_status(self):
        make_listing()
        make_listing(status="draft", published_at=None)
        customer = make_user()
        for ref in ("REF000001", "REF000002"):
            submit_deposit(user=customer, full_name="A B", phone="+254712345678", amount=Decimal("10"), payment_reference=ref)
        data = self.client.get(reverse("admin-summary")).json()
        self.assertEqual(data["listings"], {"available": 1, "draft": 1})
        self.assertEqual(data["deposits"], {"pending": 2})
        self.assertEqual(data["withdrawals"], {})
        self.assertEqual(data["customers"], {"total": 1, "active": 1})

    def test_audit_log_lists_reviewer_actions(self):
        customer = make_user()
        deposit, _ = submit_deposit(user=customer, full_name="A B", phone="+254712345678", amount=Decimal("10"), payment_reference="REF000001")
        review_deposit(deposit.pk, reviewer=self.staff, to_status="rejected", reason="Not found")
        rows = self.client.get(reverse("admin-audit-list"), {"action": "depositrequest"}).json()["results"]
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["actor"]["email"], self.staff.email)
        self.assertEqual(rows[0]["changes"]["status"], ["pending", "rejected"])
        self.assertEqual(self.client.post(reverse("admin-audit-list"), {}).status_code, 405)

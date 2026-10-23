"""Permission matrix for the staff API: anonymous, customer, staff, admin.
The backend refuses access whatever the frontend shows."""

from django.urls import reverse

from config.testing import APITestCase, make_listing, make_user
from inquiries.models import PurchaseInquiry
from payments.models import DepositRequest, WithdrawalRequest


class AdminApiPermissionTests(APITestCase):
    def setUp(self):
        super().setUp()
        self.listing = make_listing()
        owner = make_user()
        self.inquiry = PurchaseInquiry.objects.create(
            reference="INQ-PERM0001", listing=self.listing, user=owner, full_name="A B", phone="+254712345678", message="Hello there"
        )
        self.deposit = DepositRequest.objects.create(
            reference="DEP-PERM0001", user=owner, full_name="A B", phone="+254712345678", amount=10, payment_reference="PERM000001"
        )
        self.withdrawal = WithdrawalRequest.objects.create(
            reference="WDR-PERM0001", user=owner, full_name="A B", phone="+254712345678", amount=10, method="mpesa", mpesa_number="+254712345678"
        )
        self.reads = [
            reverse("admin-summary"),
            reverse("admin-livestock-list"),
            reverse("admin-livestock-detail", args=[self.listing.pk]),
            reverse("admin-inquiry-list"),
            reverse("admin-inquiry-detail", args=[self.inquiry.reference]),
            reverse("admin-deposit-list"),
            reverse("admin-deposit-detail", args=[self.deposit.reference]),
            reverse("admin-withdrawal-list"),
            reverse("admin-withdrawal-detail", args=[self.withdrawal.reference]),
            reverse("admin-account-list"),
            reverse("admin-account-detail", args=[owner.pk]),
            reverse("admin-audit-list"),
        ]
        self.writes = [
            (reverse("admin-livestock-list"), {"title": "Nope listing"}),
            (reverse("admin-livestock-transition", args=[self.listing.pk]), {"status": "sold"}),
            (reverse("admin-inquiry-transition", args=[self.inquiry.reference]), {"status": "contacted"}),
            (reverse("admin-deposit-transition", args=[self.deposit.reference]), {"status": "approved", "confirmed": True}),
            (reverse("admin-withdrawal-transition", args=[self.withdrawal.reference]), {"status": "approved", "confirmed": True}),
            (reverse("admin-account-access", args=[owner.pk]), {"is_active": False}),
        ]

    def assertUnchanged(self):
        self.assertEqual(self.listing.__class__.objects.get(pk=self.listing.pk).status, "available")
        self.assertEqual(PurchaseInquiry.objects.get().status, "pending")
        self.assertEqual(DepositRequest.objects.get().status, "pending")
        self.assertEqual(WithdrawalRequest.objects.get().status, "pending")

    def test_anonymous_is_refused_everywhere(self):
        for url in self.reads:
            self.assertError(self.client.get(url), 403, "not_authenticated")
        for url, data in self.writes:
            self.assertError(self.client.post(url, data), 403, "not_authenticated")
        self.assertUnchanged()

    def test_customers_are_refused_everywhere(self):
        self.client.force_authenticate(make_user())
        for url in self.reads:
            self.assertError(self.client.get(url), 403, "permission_denied")
        for url, data in self.writes:
            self.assertError(self.client.post(url, data), 403, "permission_denied")
        self.assertUnchanged()

    def test_suspended_staff_are_refused(self):
        self.client.force_authenticate(make_user(role="staff", is_active=False))
        self.assertError(self.client.get(reverse("admin-summary")), 403)

    def test_staff_can_read_everything_but_not_change_account_access(self):
        self.client.force_authenticate(make_user(role="staff"))
        for url in self.reads:
            self.assertEqual(self.client.get(url).status_code, 200, url)
        url, data = self.writes[-1]
        self.assertError(self.client.post(url, data), 403, "permission_denied")

    def test_administrators_can_change_account_access(self):
        self.client.force_authenticate(make_user(role="admin"))
        url, data = self.writes[-1]
        self.assertEqual(self.client.post(url, data).status_code, 200)

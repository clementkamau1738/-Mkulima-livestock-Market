from django.urls import reverse
from rest_framework.test import APIClient

from accounts.models import User
from config.testing import APITestCase, make_user
from transactions.models import AuditLog


class AccountAccessTests(APITestCase):
    def setUp(self):
        super().setUp()
        self.admin = make_user(role="admin")
        self.client.force_authenticate(self.admin)
        self.customer = make_user(email="kamau@example.test", first_name="Kamau")

    def access(self, user, **data):
        return self.client.post(reverse("admin-account-access", args=[user.pk]), data)

    def test_suspending_is_audited_and_ends_the_session(self):
        session = APIClient()
        session.force_login(self.customer)
        response = self.access(self.customer, is_active=False, reason="Reported fraud attempt")
        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.json()["is_active"])
        audit = AuditLog.objects.get(action="account.suspend")
        self.assertEqual((audit.actor_id, audit.target_id, audit.changes["reason"]), (self.admin.pk, str(self.customer.pk), "Reported fraud attempt"))
        self.assertError(session.get(reverse("deposit-list")), 403, "not_authenticated")
        self.assertEqual(self.access(self.customer, is_active=True).status_code, 200)
        self.assertTrue(AuditLog.objects.filter(action="account.activate").exists())

    def test_cannot_lock_out_self_or_other_administrators(self):
        self.assertError(self.access(self.admin, is_active=False), 403)
        self.assertError(self.access(make_user(role="admin"), is_active=False), 403)
        self.assertEqual(User.objects.filter(is_active=False).count(), 0)

    def test_search_and_filter(self):
        make_user(role="staff", email="staffer@example.test")
        url = reverse("admin-account-list")
        self.assertEqual([u["email"] for u in self.client.get(url, {"q": "KAMAU"}).json()["results"]], ["kamau@example.test"])
        self.assertEqual([u["email"] for u in self.client.get(url, {"role": "staff"}).json()["results"]], ["staffer@example.test"])
        detail = self.client.get(reverse("admin-account-detail", args=[self.customer.pk])).json()
        self.assertEqual(detail["request_counts"], {"inquiries": 0, "deposits": 0, "withdrawals": 0})
        self.assertTrue(detail["can_change_access"])
        self.assertNotIn("password", detail)

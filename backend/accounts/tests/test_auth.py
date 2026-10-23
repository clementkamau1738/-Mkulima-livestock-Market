from django.urls import reverse
from rest_framework.test import APIClient

from accounts.models import User
from config.testing import APITestCase, make_user

SESSION = reverse("auth-session")
LOGIN = reverse("auth-login")
LOGOUT = reverse("auth-logout")
REGISTER = reverse("auth-register")
PASSWORD = "a-strong-test-pass-91"


def registration(**overrides):
    data = {"full_name": "Achieng Test Otieno", "email": "Achieng@Example.test", "phone": "0712 345 678", "password": PASSWORD}
    data.update(overrides)
    return data


class CsrfClientMixin:
    """A client that enforces CSRF like a real browser session."""

    def csrf_client(self):
        client = APIClient(enforce_csrf_checks=True)
        client.get(SESSION)
        return client, client.cookies["csrftoken"].value


class RegistrationTests(CsrfClientMixin, APITestCase):
    def test_registers_a_signed_in_customer(self):
        client, token = self.csrf_client()
        response = client.post(REGISTER, registration(role="admin", is_staff=True), HTTP_X_CSRFTOKEN=token)
        self.assertEqual(response.status_code, 201, response.content)
        user = response.json()["user"]
        self.assertEqual((user["email"], user["full_name"], user["phone"]), ("Achieng@example.test", "Achieng Test Otieno", "+254712345678"))
        self.assertEqual(user["role"], "customer", "role cannot be chosen by the client")
        self.assertFalse(user["is_reviewer"])
        saved = User.objects.get()
        self.assertFalse(saved.is_staff)
        self.assertNotEqual(saved.password, PASSWORD)
        self.assertEqual(client.get(SESSION).json()["user"]["id"], saved.pk)

    def test_django_password_validation_applies(self):
        for bad, fragment in (("short1", "too short"), ("password123", "too common"), ("83749261048", "entirely numeric"), ("achieng@example.test", "too similar")):
            error = self.assertError(self.client.post(REGISTER, registration(password=bad)), 400, "validation_error", ["password"])
            self.assertTrue(any(fragment in m for m in error["fields"]["password"]), (bad, error))
        self.assertEqual(User.objects.count(), 0)

    def test_email_is_unique_regardless_of_case(self):
        make_user(email="achieng@example.test")
        error = self.assertError(self.client.post(REGISTER, registration()), 400, fields=["email"])
        self.assertIn("already exists", error["fields"]["email"][0])

    def test_field_validation(self):
        self.assertError(
            self.client.post(REGISTER, registration(phone="12345", email="not-an-email", full_name="A")),
            400,
            fields=["phone", "email", "full_name"],
        )

    def test_requires_csrf_token(self):
        client, _ = self.csrf_client()
        self.assertError(client.post(REGISTER, registration()), 403, "csrf_failed")
        self.assertEqual(User.objects.count(), 0)

    def test_is_rate_limited(self):
        for i in range(10):
            self.client.post(REGISTER, registration(email=f"user{i}@example.test"))
        self.assertError(self.client.post(REGISTER, registration(email="late@example.test")), 429, "throttled")


class LoginTests(CsrfClientMixin, APITestCase):
    def setUp(self):
        super().setUp()
        self.user = make_user(email="wanjiru@example.test", password=PASSWORD)

    def login(self, client=None, **data):
        payload = {"email": "wanjiru@example.test", "password": PASSWORD, **data}
        return (client or self.client).post(LOGIN, payload, **({} if client is None else {"HTTP_X_CSRFTOKEN": self.token}))

    def test_login_logout_round_trip_with_csrf(self):
        client, self.token = self.csrf_client()
        response = self.login(client, email="WANJIRU@example.test")
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(response.json()["user"]["email"], "wanjiru@example.test")
        # Login rotates the CSRF token; the old one no longer works for writes.
        new_token = client.cookies["csrftoken"].value
        self.assertNotEqual(new_token, self.token)
        self.assertEqual(client.get(SESSION).json()["user"]["id"], self.user.pk)
        self.assertError(client.post(LOGOUT, HTTP_X_CSRFTOKEN=self.token), 403, "csrf_failed")
        self.assertEqual(client.post(LOGOUT, HTTP_X_CSRFTOKEN=new_token).status_code, 204)
        self.assertIsNone(client.get(SESSION).json()["user"])
        self.assertError(client.get(reverse("deposit-list")), 403, "not_authenticated")

    def test_login_requires_csrf_token(self):
        client, _ = self.csrf_client()
        self.assertError(client.post(LOGIN, {"email": "wanjiru@example.test", "password": PASSWORD}), 403, "csrf_failed")

    def test_wrong_password_and_unknown_email_get_the_same_answer(self):
        wrong = self.assertError(self.login(password="nope-nope-nope"), 403, "invalid_credentials")
        unknown = self.assertError(self.login(email="nobody@example.test"), 403, "invalid_credentials")
        self.assertEqual(wrong["message"], unknown["message"])
        self.assertIsNone(self.client.get(SESSION).json()["user"])

    def test_suspended_accounts_cannot_sign_in(self):
        self.user.is_active = False
        self.user.save()
        self.assertError(self.login(), 403, "invalid_credentials")

    def test_suspension_ends_an_existing_session(self):
        client = APIClient()
        client.force_login(self.user)
        self.assertEqual(client.get(reverse("deposit-list")).status_code, 200)
        User.objects.filter(pk=self.user.pk).update(is_active=False)
        self.assertError(client.get(reverse("deposit-list")), 403, "not_authenticated")

    def test_attempts_are_limited_per_account_across_ips(self):
        for i in range(10):
            self.client.post(LOGIN, {"email": "wanjiru@example.test", "password": "wrong"}, REMOTE_ADDR=f"10.0.0.{i}")
        # Even the right password from a fresh address is refused for now.
        right = {"email": "wanjiru@example.test", "password": PASSWORD}
        self.assertError(self.client.post(LOGIN, right, REMOTE_ADDR="10.0.1.1"), 429, "throttled")

    def test_attempts_are_limited_per_ip_and_forwarded_for_is_not_trusted(self):
        for i in range(30):
            self.client.post(LOGIN, {"email": f"x{i}@example.test", "password": "wrong"}, HTTP_X_FORWARDED_FOR=f"203.0.113.{i}")
        right = {"email": "wanjiru@example.test", "password": PASSWORD}
        self.assertError(self.client.post(LOGIN, right, HTTP_X_FORWARDED_FOR="198.51.100.7"), 429, "throttled")

    def test_session_endpoint_sets_csrf_cookie(self):
        client = APIClient()
        response = client.get(SESSION)
        self.assertEqual(response.json(), {"user": None})
        self.assertIn("csrftoken", response.cookies)

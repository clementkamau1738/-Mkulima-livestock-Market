"""Every API route, called as an anonymous visitor, a customer and staff.

The matrix must name every route under /api/; adding an endpoint without
classifying it here fails `test_matrix_covers_every_api_route`."""

from decimal import Decimal

from django.urls import URLPattern, URLResolver, get_resolver, reverse

from config.testing import APITestCase, make_listing, make_user
from inquiries.services import submit_inquiry
from payments.services import submit_deposit, submit_withdrawal

PUBLIC = {"anon": 200, "customer": 200, "staff": 200}
SIGNED_IN = {"anon": 403, "customer": 200, "staff": 200}
OWNER_ONLY = {"anon": 403, "customer": 200, "staff": 404}  # staff do not see customers' records here
STAFF = {"anon": 403, "customer": 403, "staff": 200}


def api_route_names(resolver=None, prefix=""):
    names = set()
    for entry in (resolver or get_resolver()).url_patterns:
        if isinstance(entry, URLResolver):
            names |= api_route_names(entry, prefix + str(entry.pattern))
        elif isinstance(entry, URLPattern) and (prefix + str(entry.pattern)).startswith("api/") and entry.name:
            names.add(entry.name)
    return names


class EndpointMatrixTests(APITestCase):
    def setUp(self):
        super().setUp()
        self.customer = make_user()
        self.staff = make_user(role="staff")
        self.listing = make_listing()
        self.inquiry, _ = submit_inquiry(
            listing_id=self.listing.pk, user=self.customer, full_name="A B", phone="+254712345678", email="", message="Hello there"
        )
        self.deposit, _ = submit_deposit(
            user=self.customer, full_name="A B", phone="+254712345678", amount=Decimal("10"), payment_reference="MATRIX0001"
        )
        self.withdrawal, _ = submit_withdrawal(
            user=self.customer, full_name="A B", phone="+254712345678", amount=Decimal("10"), method="mpesa", mpesa_number="+254712345678"
        )
        L, C = self.listing.pk, self.listing.category.slug
        # name -> (method, url args, payload, expected status per role)
        self.matrix = {
            "health": ("get", [], None, PUBLIC),
            "auth-session": ("get", [], None, PUBLIC),
            "auth-login": ("post", [], {"email": "nobody@example.test", "password": "x"}, {"anon": 403, "customer": 403, "staff": 403}),
            "auth-logout": ("post", [], None, {"anon": 204, "customer": 204, "staff": 204}),
            "auth-register": ("post", [], {}, {"anon": 400, "customer": 400, "staff": 400}),
            "livestock-list": ("get", [], None, PUBLIC),
            "livestock-detail": ("get", [L], None, PUBLIC),
            "livestock-related": ("get", [L], None, PUBLIC),
            "livestock-breeds": ("get", [], None, PUBLIC),
            "category-list": ("get", [], None, PUBLIC),
            "category-detail": ("get", [C], None, PUBLIC),
            "payment-instructions": ("get", [], None, PUBLIC),
            "inquiry-list": ("get", [], None, SIGNED_IN),
            "inquiry-detail": ("get", [self.inquiry.reference], None, OWNER_ONLY),
            "deposit-list": ("get", [], None, SIGNED_IN),
            "deposit-detail": ("get", [self.deposit.reference], None, OWNER_ONLY),
            "withdrawal-list": ("get", [], None, SIGNED_IN),
            "withdrawal-detail": ("get", [self.withdrawal.reference], None, OWNER_ONLY),
            "admin-summary": ("get", [], None, STAFF),
            "admin-livestock-list": ("get", [], None, STAFF),
            "admin-livestock-detail": ("get", [L], None, STAFF),
            "admin-livestock-transition": ("post", [L], {"status": "available"}, {"anon": 403, "customer": 403, "staff": 200}),
            # Multipart only; a JSON body is refused with 415.
            "admin-livestock-images": ("post", [L], {}, {"anon": 403, "customer": 403, "staff": 415}),
            "admin-livestock-image": ("delete", [L, 999999], None, {"anon": 403, "customer": 403, "staff": 404}),
            "admin-inquiry-list": ("get", [], None, STAFF),
            "admin-inquiry-detail": ("get", [self.inquiry.reference], None, STAFF),
            "admin-inquiry-transition": ("post", [self.inquiry.reference], {"status": "pending"}, STAFF),
            "admin-deposit-list": ("get", [], None, STAFF),
            "admin-deposit-detail": ("get", [self.deposit.reference], None, STAFF),
            "admin-deposit-transition": ("post", [self.deposit.reference], {"status": "pending"}, STAFF),
            "admin-withdrawal-list": ("get", [], None, STAFF),
            "admin-withdrawal-detail": ("get", [self.withdrawal.reference], None, STAFF),
            "admin-withdrawal-transition": ("post", [self.withdrawal.reference], {"status": "pending"}, STAFF),
            "admin-account-list": ("get", [], None, STAFF),
            "admin-account-detail": ("get", [self.customer.pk], None, STAFF),
            "admin-account-access": ("post", [self.customer.pk], {"is_active": True}, {"anon": 403, "customer": 403, "staff": 403}),
            "admin-audit-list": ("get", [], None, STAFF),
        }

    def test_matrix_covers_every_api_route(self):
        self.assertEqual(api_route_names(), set(self.matrix))

    def test_every_route_for_every_role(self):
        users = {"anon": None, "customer": self.customer, "staff": self.staff}
        for role, user in users.items():
            for name, (method, args, payload, expected) in self.matrix.items():
                with self.subTest(role=role, route=name):
                    self.client.force_authenticate(user)
                    response = getattr(self.client, method)(reverse(name, args=args), payload)
                    self.assertEqual(response.status_code, expected[role], response.content[:300])
                    if response.status_code >= 400:
                        self.assertIn("error", response.json(), "every error uses the envelope")

    def test_unknown_api_paths_and_methods_use_the_envelope(self):
        self.assertError(self.client.get("/api/nothing-here/"), 404, "not_found")
        self.assertError(self.client.delete(reverse("livestock-list")), 405, "method_not_allowed")
        self.assertError(self.client.get(reverse("livestock-detail", args=[999999])), 404, "not_found")
        self.assertError(self.client.get(reverse("livestock-list"), {"page": 999}), 404, "not_found")
        self.assertError(self.client.get(reverse("livestock-list"), {"min_price": "abc"}), 400, fields=["min_price"])

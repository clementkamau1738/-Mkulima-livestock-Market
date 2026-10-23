from django.test import RequestFactory, TestCase

from config.testing import APITestCase
from config.views import server_failure


class ErrorFormatTests(APITestCase):
    def test_unknown_api_path_returns_json_404(self):
        response = self.client.get("/api/does-not-exist/")
        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.json(), {"error": {"code": "not_found", "message": "Not found."}})

    def test_method_not_allowed_uses_envelope(self):
        self.assertError(self.client.put("/api/payment-instructions/", {}), 405, "method_not_allowed")

    def test_malformed_json_uses_envelope(self):
        response = self.client.post("/api/inquiries/", data="{not json", content_type="application/json")
        self.assertError(response, 400, "parse_error")


class ServerErrorTests(TestCase):
    def test_api_500_hides_internals(self):
        response = server_failure(RequestFactory().get("/api/livestock/"))
        self.assertEqual(response.status_code, 500)
        self.assertNotIn(b"Traceback", response.content)
        self.assertIn(b"server_error", response.content)

from unittest import mock

from rest_framework.throttling import SimpleRateThrottle

from config.testing import APITestCase, make_user

URL = "/api/categories/"
RATES = {**SimpleRateThrottle.THROTTLE_RATES, "anon": "5/minute", "user": "2/minute"}


@mock.patch.object(SimpleRateThrottle, "THROTTLE_RATES", RATES)
class ReadThrottleTests(APITestCase):
    def test_anonymous_visitors_get_the_anon_rate_not_the_user_rate(self):
        for _ in range(5):
            self.assertEqual(self.client.get(URL).status_code, 200)
        self.assertError(self.client.get(URL), 429, "throttled")

    def test_signed_in_users_get_the_user_rate(self):
        self.client.force_authenticate(make_user())
        for _ in range(2):
            self.assertEqual(self.client.get(URL).status_code, 200)
        self.assertError(self.client.get(URL), 429, "throttled")

    def test_user_rate_is_per_account_not_per_ip(self):
        self.client.force_authenticate(make_user())
        for _ in range(2):
            self.client.get(URL)
        self.client.force_authenticate(make_user())
        self.assertEqual(self.client.get(URL).status_code, 200)

"""Client IP for rate limits and the audit log, behind a fixed number of
proxies (DJANGO_NUM_PROXIES). On Render that is 3 (README "Deploying to
Render"): the visitor's address is third from the end of X-Forwarded-For."""

from django.conf import settings
from django.test import RequestFactory, SimpleTestCase, override_settings

from config.api import client_ip

VISITOR, EDGE, RENDER = "41.139.236.173", "162.158.217.151", "10.0.0.5"


def with_proxies(count):
    return override_settings(REST_FRAMEWORK={**settings.REST_FRAMEWORK, "NUM_PROXIES": count})


def ip_for(forwarded_for):
    return client_ip(RequestFactory().get("/", HTTP_X_FORWARDED_FOR=forwarded_for, REMOTE_ADDR="10.0.0.9"))


class ClientIpTests(SimpleTestCase):
    def test_render_chain_gives_the_visitor(self):
        with with_proxies(3):
            self.assertEqual(ip_for(f"{VISITOR}, {EDGE}, {RENDER}"), VISITOR)

    def test_forged_entries_in_front_are_ignored(self):
        with with_proxies(3):
            self.assertEqual(ip_for(f"6.6.6.6, {VISITOR}, {EDGE}, {RENDER}"), VISITOR)
            self.assertEqual(ip_for(f"6.6.6.6, 7.7.7.7, 8.8.8.8, {VISITOR}, {EDGE}, {RENDER}"), VISITOR)

    def test_wrong_counts_fail_in_the_documented_directions(self):
        chain = f"6.6.6.6, {VISITOR}, {EDGE}, {RENDER}"
        with with_proxies(2):
            self.assertEqual(ip_for(chain), EDGE, "too low: everyone shares the proxy's address")
        with with_proxies(4):
            self.assertEqual(ip_for(chain), "6.6.6.6", "too high: the client-supplied entry is used")

    def test_without_proxies_the_header_is_ignored(self):
        with with_proxies(0):
            self.assertEqual(ip_for(f"6.6.6.6, {VISITOR}"), "10.0.0.9")

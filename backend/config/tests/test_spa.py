"""SPA_ROOT: Django serves the React app for single-service hosting (Render)."""

import importlib
import tempfile
from pathlib import Path

from django.test import override_settings
from django.urls import clear_url_caches

import config.urls
from config import views
from config.testing import APITestCase


class SpaRoutingTests(APITestCase):
    def setUp(self):
        root = tempfile.TemporaryDirectory()
        self.addCleanup(root.cleanup)
        (Path(root.name) / "index.html").write_text("<!doctype html><div id=root></div>")
        settings = override_settings(SPA_ROOT=root.name, CSP_IMG_SRC="'self' data: https://pub-1.r2.dev")
        settings.enable()
        self.addCleanup(self._restore_urls)
        self.addCleanup(settings.disable)
        self._reload_urls()

    def _reload_urls(self):
        views._spa_index_html.cache_clear()
        importlib.reload(config.urls)
        clear_url_caches()

    def _restore_urls(self):
        self._reload_urls()

    def test_client_routes_get_the_app_with_its_headers(self):
        for path in ("/", "/marketplace/3", "/admin/deposits", "/photo-credits"):
            response = self.client.get(path)
            self.assertEqual(response.status_code, 200, path)
            self.assertIn(b'id=root', response.content)
            self.assertEqual(response["Cache-Control"], "no-cache")
            self.assertIn("img-src 'self' data: https://pub-1.r2.dev;", response["Content-Security-Policy"])
            self.assertIn("frame-ancestors 'none'", response["Content-Security-Policy"])

    def test_api_admin_and_assets_are_not_swallowed(self):
        response = self.client.get("/api/does-not-exist/")
        self.assertEqual((response.status_code, response.json()["error"]["code"]), (404, "not_found"))
        self.assertRedirects(self.client.get("/django-admin"), "/django-admin/", status_code=301, target_status_code=302)
        self.assertEqual(self.client.get("/static/missing.css").status_code, 404)

    def test_only_safe_methods(self):
        self.assertEqual(self.client.post("/marketplace").status_code, 405)

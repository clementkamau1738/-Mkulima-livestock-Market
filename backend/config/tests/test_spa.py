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
        views._media_origin.cache_clear()
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

    def test_index_html_is_served_with_the_app_headers(self):
        response = self.client.get("/index.html")
        self.assertEqual(response.status_code, 200)
        self.assertIn("frame-ancestors 'none'", response["Content-Security-Policy"])
        self.assertEqual(response["Cache-Control"], "no-cache")
        self.assertEqual(response["X-Frame-Options"], "DENY")

    def test_missing_files_are_not_found(self):
        for path in ("/favicon.ico", "/robots.txt", "/images/site/missing.webp", "/assets/old-abc123.js", "/api", "/media/x.webp"):
            self.assertEqual(self.client.get(path).status_code, 404, path)

    def test_image_policy_follows_the_media_storage(self):
        s3 = {"bucket_name": "photos", "access_key": "k", "secret_key": "s", "region_name": "auto", "location": "media"}
        cases = [
            ({**s3, "custom_domain": "pub-9.r2.dev"}, "https://pub-9.r2.dev"),
            ({**s3, "endpoint_url": "https://acct.r2.cloudflarestorage.com", "addressing_style": "path"}, "https://acct.r2.cloudflarestorage.com"),
            ({**s3, "endpoint_url": "https://acct.r2.cloudflarestorage.com", "addressing_style": "path", "querystring_auth": True},
             "https://acct.r2.cloudflarestorage.com"),
        ]
        for options, origin in cases:
            storages = {"default": {"BACKEND": "storages.backends.s3.S3Storage", "OPTIONS": options},
                        "staticfiles": {"BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage"}}
            with self.subTest(origin=origin), override_settings(STORAGES=storages, CSP_IMG_SRC="'self' data:"):
                views._media_origin.cache_clear()
                policy = self.client.get("/").headers["Content-Security-Policy"]
                self.assertIn(f"img-src 'self' data: {origin};", policy)
        views._media_origin.cache_clear()
        local = self.client.get("/").headers["Content-Security-Policy"]
        self.assertIn("img-src 'self' data: https://pub-1.r2.dev;", local, "local media adds nothing")

    def test_only_safe_methods(self):
        self.assertEqual(self.client.post("/marketplace").status_code, 405)

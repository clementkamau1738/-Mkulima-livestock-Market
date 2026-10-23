"""Helpers shared by the test suites."""

import io
import shutil
import tempfile
from datetime import timedelta
from decimal import Decimal

from django.core.cache import cache
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from django.utils import timezone
from PIL import Image
from rest_framework.test import APIClient

from accounts.models import User
from livestock.models import Category, LivestockListing

_counter = iter(range(1, 10_000_000))


def make_user(role=User.Role.CUSTOMER, **extra):
    n = next(_counter)
    return User.objects.create_user(
        username=extra.pop("username", f"user{n}"),
        email=extra.pop("email", f"user{n}@example.test"),
        password=extra.pop("password", "a-strong-test-pass-91"),
        role=role,
        **extra,
    )


def make_category(slug=None, **extra):
    slug = slug or f"cat-{next(_counter)}"
    return Category.objects.create(slug=slug, name=extra.pop("name", slug.title()), **extra)


def make_listing(category=None, **extra):
    n = next(_counter)
    defaults = {
        "title": f"Listing {n}",
        "breed": "Friesian",
        "location": "Nakuru",
        "price_kes": Decimal("100000"),
        "description": "A fictional test animal.",
        "status": LivestockListing.Status.AVAILABLE,
        "published_at": timezone.now() - timedelta(days=1),
    }
    defaults.update(extra)
    return LivestockListing.objects.create(category=category or make_category(), **defaults)


def image_bytes(size=(800, 600), fmt="PNG"):
    buf = io.BytesIO()
    Image.new("RGB", size, (120, 160, 90)).save(buf, fmt)
    return buf.getvalue()


def image_upload(name="photo.png", size=(800, 600), fmt="PNG", content_type="image/png"):
    return SimpleUploadedFile(name, image_bytes(size, fmt), content_type=content_type)


class APITestCase(TestCase):
    """API test base: fresh throttle counters and a throwaway MEDIA_ROOT."""

    @classmethod
    def setUpClass(cls):
        cls._media = tempfile.mkdtemp(prefix="mkulima-test-media-")
        # A fast hasher keeps the many test sign-ups quick; production uses Django's default.
        cls._media_override = override_settings(
            MEDIA_ROOT=cls._media, PASSWORD_HASHERS=["django.contrib.auth.hashers.MD5PasswordHasher"]
        )
        cls._media_override.enable()
        super().setUpClass()

    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        cls._media_override.disable()
        shutil.rmtree(cls._media, ignore_errors=True)

    def setUp(self):
        cache.clear()
        self.client = APIClient()

    def assertError(self, response, status_code, code=None, fields=()):
        self.assertEqual(response.status_code, status_code, response.content)
        error = response.json()["error"]
        if code:
            self.assertEqual(error["code"], code)
        self.assertTrue(error["message"])
        for field in fields:
            self.assertIn(field, error.get("fields", {}))
        return error

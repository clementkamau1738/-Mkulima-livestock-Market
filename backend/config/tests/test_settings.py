"""Startup configuration: missing or unsafe settings must stop the app with a
clear message, and the production settings must pass `check --deploy`."""

import os
import secrets
import subprocess
import sys
from pathlib import Path

from django.test import SimpleTestCase

BACKEND = Path(__file__).resolve().parents[2]
STRONG_KEY = secrets.token_urlsafe(50)

BASE_ENV = {
    "DJANGO_SETTINGS_MODULE": "config.settings",
    "DJANGO_ENV_FILE": "/nonexistent/.env",  # ignore the developer's .env
    "DJANGO_SECRET_KEY": STRONG_KEY,
    "DJANGO_DEBUG": "False",
    "DJANGO_ALLOWED_HOSTS": "mkulima.example",
    "POSTGRES_DB": "x",
    "POSTGRES_USER": "x",
    "POSTGRES_PASSWORD": "x",
}

PRODUCTION = {**BASE_ENV, "DJANGO_HSTS_INCLUDE_SUBDOMAINS": "True", "DJANGO_HSTS_PRELOAD": "True"}


def run(env, *args):
    clean = {k: v for k, v in os.environ.items() if not k.startswith(("DJANGO_", "POSTGRES_", "MEDIA_", "S3_", "CACHE_"))}
    return subprocess.run(
        [sys.executable, *args], cwd=BACKEND, env={**clean, **env}, capture_output=True, text=True, timeout=120
    )


def setup_django(env):
    return run(env, "-c", "import django; django.setup(); print('ready')")


class StartupConfigurationTests(SimpleTestCase):
    def assertRefuses(self, env, fragment):
        result = setup_django(env)
        self.assertNotEqual(result.returncode, 0, result.stdout)
        self.assertIn("ImproperlyConfigured", result.stderr)
        self.assertIn(fragment, result.stderr)

    def test_valid_production_settings_start(self):
        result = setup_django(BASE_ENV)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("ready", result.stdout)

    def test_each_required_variable_is_named_when_missing(self):
        for name in ("DJANGO_SECRET_KEY", "POSTGRES_DB", "POSTGRES_USER", "POSTGRES_PASSWORD"):
            env = {k: v for k, v in BASE_ENV.items() if k != name}
            self.assertRefuses(env, name)

    def test_weak_or_placeholder_secret_key_is_refused_in_production(self):
        self.assertRefuses({**BASE_ENV, "DJANGO_SECRET_KEY": "short"}, "DJANGO_SECRET_KEY must be a random value")
        placeholder = "change-me-to-a-long-random-string-" + "x" * 40
        self.assertRefuses({**BASE_ENV, "DJANGO_SECRET_KEY": placeholder}, "DJANGO_SECRET_KEY must be a random value")

    def test_allowed_hosts_required_in_production(self):
        self.assertRefuses({**BASE_ENV, "DJANGO_ALLOWED_HOSTS": ""}, "DJANGO_ALLOWED_HOSTS")

    def test_object_storage_needs_its_credentials(self):
        self.assertRefuses({**BASE_ENV, "MEDIA_STORAGE": "s3"}, "S3_BUCKET_NAME")
        self.assertRefuses({**BASE_ENV, "MEDIA_STORAGE": "ftp"}, "MEDIA_STORAGE")

    def test_debug_defaults_to_off(self):
        env = {k: v for k, v in BASE_ENV.items() if k != "DJANGO_DEBUG"}
        result = run(env, "-c", "import django; django.setup(); from django.conf import settings; print(settings.DEBUG)")
        self.assertEqual(result.stdout.strip(), "False", result.stderr)

    def test_production_settings_pass_the_deploy_checklist(self):
        result = run(PRODUCTION, "manage.py", "check", "--deploy", "--fail-level", "WARNING")
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertIn("no issues", result.stdout)

    def test_production_security_values(self):
        code = (
            "import django; django.setup(); from django.conf import settings as s; "
            "print(s.SECURE_SSL_REDIRECT, s.SESSION_COOKIE_SECURE, s.CSRF_COOKIE_SECURE, s.SESSION_COOKIE_HTTPONLY, "
            "s.SECURE_HSTS_SECONDS, s.X_FRAME_OPTIONS, s.STORAGES['staticfiles']['BACKEND'].split('.')[0])"
        )
        result = run(BASE_ENV, "-c", code)
        self.assertEqual(result.stdout.split(), ["True", "True", "True", "True", "31536000", "DENY", "whitenoise"], result.stderr)

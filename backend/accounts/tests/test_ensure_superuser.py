import os
from io import StringIO
from unittest import mock

from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import TestCase

from accounts.models import User

ENV = {"DJANGO_SUPERUSER_EMAIL": "Owner@Example.test", "DJANGO_SUPERUSER_PASSWORD": "pasture-gate-4417-ok"}


def ensure(env):
    out = StringIO()
    with mock.patch.dict(os.environ, env, clear=False):
        call_command("ensure_superuser", stdout=out)
    return out.getvalue()


class EnsureSuperuserTests(TestCase):
    def test_creates_an_administrator_once(self):
        self.assertIn("Administrator created", ensure(ENV))
        user = User.objects.get()
        self.assertEqual((user.username, user.email, user.role, user.is_superuser), ("Owner@example.test", "Owner@example.test", User.Role.ADMIN, True))
        self.assertTrue(user.check_password(ENV["DJANGO_SUPERUSER_PASSWORD"]))

        # Later starts never touch it, even with a different password set.
        output = ensure({"DJANGO_SUPERUSER_EMAIL": "owner@example.test", "DJANGO_SUPERUSER_PASSWORD": "another-pass-9921"})
        self.assertIn("left unchanged", output)
        user.refresh_from_db()
        self.assertTrue(user.check_password(ENV["DJANGO_SUPERUSER_PASSWORD"]))
        self.assertEqual(User.objects.count(), 1)

    def test_skipped_without_variables(self):
        with mock.patch.dict(os.environ, {}, clear=True):
            out = StringIO()
            call_command("ensure_superuser", stdout=out)
        self.assertIn("not set", out.getvalue())
        self.assertFalse(User.objects.exists())

    def test_weak_password_is_refused_without_echoing_it(self):
        with self.assertRaises(CommandError) as ctx:
            ensure({**ENV, "DJANGO_SUPERUSER_PASSWORD": "12345678"})
        self.assertIn("too weak", str(ctx.exception))
        self.assertNotIn("12345678", str(ctx.exception))
        self.assertFalse(User.objects.exists())

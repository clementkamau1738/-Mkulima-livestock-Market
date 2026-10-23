from django.contrib import admin
from django.test import TestCase
from django.urls import reverse

from accounts.models import User
from config.testing import make_user


class AdminSmokeTests(TestCase):
    def test_every_registered_changelist_loads(self):
        self.client.force_login(User.objects.create_superuser("root", "root@example.test", "a-strong-test-pass-91"))
        for model in admin.site._registry:
            url = reverse(f"admin:{model._meta.app_label}_{model._meta.model_name}_changelist")
            self.assertEqual(self.client.get(url).status_code, 200, url)

    def test_customers_cannot_open_admin(self):
        self.client.force_login(make_user())
        response = self.client.get(reverse("admin:index"))
        self.assertEqual(response.status_code, 302)

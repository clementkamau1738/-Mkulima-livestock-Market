from django.core.exceptions import ValidationError
from django.db import IntegrityError
from django.test import TestCase

from accounts.models import User
from accounts.validators import normalize_kenyan_phone
from config.testing import make_user


class UserRoleTests(TestCase):
    def test_customer_has_no_admin_access(self):
        user = make_user()
        self.assertEqual(user.role, User.Role.CUSTOMER)
        self.assertFalse(user.is_staff)
        self.assertFalse(user.is_reviewer)

    def test_staff_role_grants_admin_site_access(self):
        user = make_user(role=User.Role.STAFF)
        self.assertTrue(user.is_staff)
        self.assertTrue(user.is_reviewer)

    def test_is_staff_cannot_be_set_independently_of_role(self):
        user = make_user()
        user.is_staff = True
        user.save()
        user.refresh_from_db()
        self.assertFalse(user.is_staff)

    def test_superuser_is_admin(self):
        user = User.objects.create_superuser("root", "root@example.test", "a-strong-test-pass-91")
        self.assertEqual(user.role, User.Role.ADMIN)
        self.assertTrue(user.is_staff)

    def test_inactive_staff_cannot_review(self):
        user = make_user(role=User.Role.STAFF, is_active=False)
        self.assertFalse(user.is_reviewer)

    def test_email_is_unique_case_insensitively(self):
        make_user(email="Buyer@Example.test")
        with self.assertRaises(IntegrityError):
            make_user(email="buyer@example.test")


class PhoneValidatorTests(TestCase):
    def test_normalizes_common_formats(self):
        for raw in ["0712345678", "0712 345 678", "+254712345678", "254712345678", "0112-345-678"]:
            self.assertRegex(normalize_kenyan_phone(raw), r"^\+254[71]\d{8}$")

    def test_rejects_invalid_numbers(self):
        for raw in ["", "12345", "0812345678", "+25571234567", "07123456789", "phone"]:
            with self.assertRaises(ValidationError):
                normalize_kenyan_phone(raw)

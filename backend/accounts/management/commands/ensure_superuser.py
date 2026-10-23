"""Create the first administrator from environment variables, once.

For hosts without shell access (Render's free plan), where `createsuperuser`
cannot be run by hand. Safe on every start: an existing account with that
email is never changed, so its password is not reset from the environment.
"""

import os

from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.core.management.base import BaseCommand, CommandError

from accounts.models import User


class Command(BaseCommand):
    help = "Create a superuser from DJANGO_SUPERUSER_EMAIL and DJANGO_SUPERUSER_PASSWORD if none has that email."

    def handle(self, *args, **options):
        email = User.objects.normalize_email(os.environ.get("DJANGO_SUPERUSER_EMAIL", "").strip())
        password = os.environ.get("DJANGO_SUPERUSER_PASSWORD", "")
        if not email or not password:
            self.stdout.write("DJANGO_SUPERUSER_EMAIL or DJANGO_SUPERUSER_PASSWORD not set; no administrator created.")
            return
        if User.objects.filter(email__iexact=email).exists():
            self.stdout.write("An account with DJANGO_SUPERUSER_EMAIL already exists; left unchanged.")
            return

        user = User(username=email, email=email)
        try:
            validate_password(password, user)
        except ValidationError as exc:
            raise CommandError("DJANGO_SUPERUSER_PASSWORD is too weak: " + " ".join(exc.messages)) from None
        User.objects.create_superuser(username=email, email=email, password=password)
        self.stdout.write(self.style.SUCCESS("Administrator created; sign in with DJANGO_SUPERUSER_EMAIL."))

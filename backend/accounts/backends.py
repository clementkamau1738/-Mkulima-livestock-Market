from django.contrib.auth import get_user_model
from django.contrib.auth.backends import ModelBackend


class EmailBackend(ModelBackend):
    """Authenticate with email (case-insensitive) and password.

    Only used when `email=` is passed to authenticate(); Django Admin keeps
    using username sign-in through ModelBackend. Inactive users are refused.
    """

    def authenticate(self, request, email=None, password=None, **kwargs):
        if email is None or password is None:
            return None
        User = get_user_model()
        user = User.objects.filter(email__iexact=email.strip()).first()
        if user is None:
            # Hash anyway so response time does not reveal which emails exist.
            User().set_password(password)
            return None
        if user.check_password(password) and self.user_can_authenticate(user):
            return user
        return None

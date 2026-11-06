import hashlib

from rest_framework.throttling import ScopedRateThrottle, SimpleRateThrottle, UserRateThrottle


class SignedInUserRateThrottle(UserRateThrottle):
    """The `user` rate for signed-in users only, keyed by user id.

    DRF's UserRateThrottle also counts anonymous requests by IP, so the stricter
    `user` rate would cap anonymous visitors instead of the `anon` rate meant
    for them (generous because many mobile users share one carrier IP).
    Anonymous requests are left to AnonRateThrottle."""

    def get_cache_key(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return None
        return super().get_cache_key(request, view)


class IPScopedRateThrottle(ScopedRateThrottle):
    """Like ScopedRateThrottle but always keyed by client IP. The default keys
    signed-in users by id, so registering (which signs you in) would give every
    new account a fresh allowance."""

    def get_cache_key(self, request, view):
        return self.cache_format % {"scope": self.scope, "ident": self.get_ident(request)}


class LoginAccountThrottle(SimpleRateThrottle):
    """Limits sign-in attempts per email address from each client IP.

    Keyed by IP as well as email so that failed attempts elsewhere cannot lock
    the owner out of their own account. Guessing from many addresses is slowed
    by the per-IP `login` limit and the password validators instead."""

    scope = "login_account"

    def get_cache_key(self, request, view):
        email = str(request.data.get("email", "")).strip().lower() if hasattr(request.data, "get") else ""
        if not email:
            return None
        digest = hashlib.sha256(f"{email}|{self.get_ident(request)}".encode()).hexdigest()
        return self.cache_format % {"scope": self.scope, "ident": digest}

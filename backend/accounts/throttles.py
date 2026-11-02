import hashlib

from rest_framework.throttling import ScopedRateThrottle, SimpleRateThrottle


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

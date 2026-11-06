from rest_framework.throttling import SimpleRateThrottle


class InquiryCreateThrottle(SimpleRateThrottle):
    """Inquiry submissions: `inquiries` per signed-in account, and the more
    generous `inquiries_guest` per IP for guests, because many mobile users can
    share one carrier IP. The one-open-inquiry-per-animal rule limits repeats."""

    scope = "inquiries"

    def allow_request(self, request, view):
        self.scope = "inquiries" if request.user.is_authenticated else "inquiries_guest"
        self.rate = self.get_rate()
        self.num_requests, self.duration = self.parse_rate(self.rate)
        return super().allow_request(request, view)

    def get_cache_key(self, request, view):
        ident = request.user.pk if request.user.is_authenticated else self.get_ident(request)
        return self.cache_format % {"scope": self.scope, "ident": ident}


class InquiryLookupThrottle(SimpleRateThrottle):
    """Guest status lookups (reference + phone), per IP, so references cannot
    be guessed at speed."""

    scope = "inquiry_lookup"

    def get_cache_key(self, request, view):
        return self.cache_format % {"scope": self.scope, "ident": self.get_ident(request)}

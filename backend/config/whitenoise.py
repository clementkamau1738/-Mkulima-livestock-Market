from whitenoise.middleware import WhiteNoiseMiddleware


class StaticFilesMiddleware(WhiteNoiseMiddleware):
    """WhiteNoise, except for the React app's index.html (SPA_ROOT): that page
    is served by config.views.spa_index so it always gets its
    Content-Security-Policy, framing protection and no-cache headers."""

    def __call__(self, request):
        if request.path_info == "/index.html":
            return self.get_response(request)
        return super().__call__(request)

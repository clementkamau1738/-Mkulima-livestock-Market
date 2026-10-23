import re

from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path, re_path

from .views import health, spa_index

urlpatterns = [
    # Not "/admin/": in production that path belongs to the React staff area.
    path(settings.DJANGO_ADMIN_URL, admin.site.urls),
    path("api/health/", health, name="health"),
    path("api/admin/", include("config.admin_urls")),
    path("api/", include("accounts.urls")),
    path("api/", include("livestock.urls")),
    path("api/", include("inquiries.urls")),
    path("api/", include("payments.urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

if settings.SPA_ROOT:
    # Every other path is a route of the React app (its files are served by
    # WhiteNoise from SPA_ROOT).
    django_admin = re.escape(settings.DJANGO_ADMIN_URL.rstrip("/"))
    urlpatterns += [re_path(rf"^(?!api/|static/|media/|{django_admin}(?:/|$))", spa_index)]

handler404 = "config.views.not_found"
handler500 = "config.views.server_failure"

admin.site.site_header = "Mkulima Livestock Market administration"
admin.site.site_title = "Mkulima admin"

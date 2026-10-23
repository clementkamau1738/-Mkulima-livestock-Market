from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path

from .views import health

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

handler404 = "config.views.not_found"
handler500 = "config.views.server_failure"

admin.site.site_header = "Mkulima Livestock Market administration"
admin.site.site_title = "Mkulima admin"

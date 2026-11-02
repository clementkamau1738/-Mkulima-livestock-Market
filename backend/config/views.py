import logging
from functools import lru_cache
from pathlib import Path
from urllib.parse import urlsplit

from django.conf import settings
from django.core.cache import cache
from django.core.files.storage import default_storage
from django.db import connection
from django.http import HttpResponse, JsonResponse
from django.views.decorators.http import require_GET, require_safe
from django.views.defaults import page_not_found, server_error

logger = logging.getLogger(__name__)


def _is_api(request):
    return request.path.startswith("/api/")


def not_found(request, exception=None):
    if _is_api(request):
        return JsonResponse({"error": {"code": "not_found", "message": "Not found."}}, status=404)
    return page_not_found(request, exception)


def server_failure(request):
    # Never expose internals; details go to the server log only.
    if _is_api(request):
        return JsonResponse(
            {"error": {"code": "server_error", "message": "Something went wrong on our side. Please try again later."}},
            status=500,
        )
    return server_error(request)


@require_GET
def health(request):
    """Readiness for containers and load balancers: the database and cache
    must answer. No details are returned."""
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        cache.set("health", "ok", 5)
        ok = cache.get("health") == "ok"
    except Exception:  # noqa: BLE001 - any failure means not ready
        logger.exception("Health check failed")
        ok = False
    return JsonResponse({"status": "ok" if ok else "unavailable"}, status=200 if ok else 503)


@lru_cache(maxsize=1)
def _spa_index_html():
    return (Path(settings.SPA_ROOT) / "index.html").read_bytes()


@lru_cache(maxsize=1)
def _media_origin():
    """Where uploaded photos are served from, when that is another host (object
    storage: custom domain, bucket endpoint or signed URLs). Read from the
    storage itself, so the policy always matches the photo URLs."""
    parts = urlsplit(default_storage.url("csp-probe.webp"))
    return f"{parts.scheme}://{parts.netloc}" if parts.scheme and parts.netloc else ""


def _img_src():
    sources = settings.CSP_IMG_SRC.split()
    origin = _media_origin()
    if origin and origin not in sources:
        sources.append(origin)
    return " ".join(sources)


@require_safe
def spa_index(request):
    """The React app's index.html for every client-side route (SPA_ROOT only).
    Same headers as nginx's `location /` in the Docker stack."""
    response = HttpResponse(_spa_index_html(), content_type="text/html; charset=utf-8")
    response["Content-Security-Policy"] = (
        "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; "
        f"img-src {_img_src()}; font-src 'self'; connect-src 'self'; object-src 'none'; "
        "base-uri 'self'; form-action 'self'; frame-ancestors 'none'"
    )
    response["Permissions-Policy"] = "camera=(), microphone=(), geolocation=(), payment=()"
    # Never cached, so a new release is picked up at once.
    response["Cache-Control"] = "no-cache"
    return response

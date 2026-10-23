"""
Django settings for Mkulima Livestock Market.

Every deployment-specific value comes from environment variables (see the
repository's .env.example). Required variables raise ImproperlyConfigured
with the variable name when missing, so misconfiguration fails at startup.
"""

import sys
from pathlib import Path

import environ
from django.core.exceptions import ImproperlyConfigured

BASE_DIR = Path(__file__).resolve().parent.parent
REPO_ROOT = BASE_DIR.parent
TESTING = len(sys.argv) > 1 and sys.argv[1] == "test"

env = environ.Env()
# Local development reads the repository-level .env (or DJANGO_ENV_FILE).
# Real environments set variables directly; variables already set always win.
ENV_FILE = Path(env.str("DJANGO_ENV_FILE", default=str(REPO_ROOT / ".env")))
if ENV_FILE.is_file():
    env.read_env(ENV_FILE)

SECRET_KEY = env.str("DJANGO_SECRET_KEY")
DEBUG = env.bool("DJANGO_DEBUG", default=False)
ALLOWED_HOSTS = env.list("DJANGO_ALLOWED_HOSTS", default=[])

if not DEBUG:
    # Refuse to start in production with settings that would be unsafe or broken.
    if len(SECRET_KEY) < 50 or SECRET_KEY.startswith("change-me"):
        raise ImproperlyConfigured("DJANGO_SECRET_KEY must be a random value of at least 50 characters when DEBUG is off.")
    if not ALLOWED_HOSTS:
        raise ImproperlyConfigured("DJANGO_ALLOWED_HOSTS must list the site's host names when DEBUG is off.")

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "storages",
    "rest_framework",
    "django_filters",
    "corsheaders",
    "accounts",
    "livestock",
    "inquiries",
    "payments",
    "transactions",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    # Serves collected static files (Django Admin, DRF) with long cache headers.
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"
# Django Admin path, e.g. "django-admin/". Must end with a slash.
DJANGO_ADMIN_URL = env.str("DJANGO_ADMIN_URL", default="django-admin/")

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": env.str("POSTGRES_DB"),
        "USER": env.str("POSTGRES_USER"),
        "PASSWORD": env.str("POSTGRES_PASSWORD"),
        "HOST": env.str("POSTGRES_HOST", default="localhost"),
        "PORT": env.int("POSTGRES_PORT", default=5432),
        "CONN_MAX_AGE": env.int("POSTGRES_CONN_MAX_AGE", default=60),
        "CONN_HEALTH_CHECKS": True,
    }
}

AUTH_USER_MODEL = "accounts.User"

# Customers sign in with their email; ModelBackend keeps username sign-in for
# Django Admin.
AUTHENTICATION_BACKENDS = [
    "accounts.backends.EmailBackend",
    "django.contrib.auth.backends.ModelBackend",
]

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = "Africa/Nairobi"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = env.path("STATIC_ROOT", default=BASE_DIR / "staticfiles")

# Uploaded listing photos. "local" keeps files on disk under MEDIA_ROOT (served
# by nginx in the Docker stack); "s3" uses any S3-compatible object store
# (AWS S3, Cloudflare R2, DigitalOcean Spaces, MinIO).
MEDIA_STORAGE = env.str("MEDIA_STORAGE", default="local")
MEDIA_URL = "/media/"
MEDIA_ROOT = env.path("MEDIA_ROOT", default=BASE_DIR / "media")

if MEDIA_STORAGE == "local":
    DEFAULT_STORAGE = {"BACKEND": "django.core.files.storage.FileSystemStorage"}
elif MEDIA_STORAGE == "s3":
    DEFAULT_STORAGE = {
        "BACKEND": "storages.backends.s3.S3Storage",
        "OPTIONS": {
            "bucket_name": env.str("S3_BUCKET_NAME"),
            "access_key": env.str("S3_ACCESS_KEY_ID"),
            "secret_key": env.str("S3_SECRET_ACCESS_KEY"),
            "endpoint_url": env.str("S3_ENDPOINT_URL", default=None),
            "region_name": env.str("S3_REGION_NAME", default=None),
            # "path" for MinIO and most self-hosted stores; "virtual" or unset for AWS.
            "addressing_style": env.str("S3_ADDRESSING_STYLE", default=None),
            # Public-read bucket or CDN domain: plain URLs. Private bucket: signed URLs.
            "custom_domain": env.str("S3_CUSTOM_DOMAIN", default=None),
            "querystring_auth": env.bool("S3_SIGNED_URLS", default=False),
            "location": env.str("S3_LOCATION", default="media"),
            # Never overwrite: stored names are random, so a clash means a bug.
            "file_overwrite": False,
            "object_parameters": {"CacheControl": "public, max-age=31536000, immutable"},
        },
    }
else:
    raise ImproperlyConfigured("MEDIA_STORAGE must be 'local' or 's3'.")

STORAGES = {
    "default": DEFAULT_STORAGE,
    # Hashed, compressed static files in real deployments. Tests and DEBUG
    # use the plain backend so they do not need `collectstatic` first.
    "staticfiles": {
        "BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage"
        if DEBUG or TESTING
        else "whitenoise.storage.CompressedManifestStaticFilesStorage"
    },
}

# Throttle counters and other shared state. The default per-process memory
# cache is fine for one development server; with several gunicorn workers set
# CACHE_URL (e.g. redis://redis:6379/0) so rate limits are counted once.
CACHES = {"default": env.cache_url("CACHE_URL", default="locmemcache://")}

# Browser origins allowed to call the API with credentials (session cookie).
CORS_ALLOWED_ORIGINS = env.list("CORS_ALLOWED_ORIGINS", default=[])
CORS_ALLOW_CREDENTIALS = True
CSRF_TRUSTED_ORIGINS = env.list("CSRF_TRUSTED_ORIGINS", default=[])

SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_AGE = env.int("SESSION_COOKIE_AGE", default=12 * 60 * 60)
# The SPA reads the CSRF cookie and sends it back in the X-CSRFToken header.
CSRF_COOKIE_HTTPONLY = False
SESSION_COOKIE_SAMESITE = "Lax"
CSRF_COOKIE_SAMESITE = "Lax"
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_REFERRER_POLICY = "same-origin"
SECURE_CROSS_ORIGIN_OPENER_POLICY = "same-origin"
X_FRAME_OPTIONS = "DENY"
if not DEBUG:
    # HTTPS everywhere. Each switch can be turned off only for a plain-HTTP
    # local run of the production stack (see docker-compose.yml).
    SESSION_COOKIE_SECURE = env.bool("DJANGO_SECURE_COOKIES", default=True)
    CSRF_COOKIE_SECURE = env.bool("DJANGO_SECURE_COOKIES", default=True)
    SECURE_SSL_REDIRECT = env.bool("DJANGO_SECURE_SSL_REDIRECT", default=True)
    # Start low on a new domain (e.g. 300), raise to a year once HTTPS is proven.
    SECURE_HSTS_SECONDS = env.int("DJANGO_HSTS_SECONDS", default=31536000)
    SECURE_HSTS_INCLUDE_SUBDOMAINS = env.bool("DJANGO_HSTS_INCLUDE_SUBDOMAINS", default=False)
    SECURE_HSTS_PRELOAD = env.bool("DJANGO_HSTS_PRELOAD", default=False)
    # The TLS-terminating proxy tells Django the original scheme. Only enable
    # when such a proxy exists and strips this header from client requests.
    if env.bool("DJANGO_TRUST_X_FORWARDED_PROTO", default=False):
        SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
    # The health check is called over plain HTTP inside the private network.
    SECURE_REDIRECT_EXEMPT = [r"^api/health/$"]

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": ["config.authentication.SessionAuthentication"],
    "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.IsAuthenticated"],
    "DEFAULT_RENDERER_CLASSES": ["rest_framework.renderers.JSONRenderer"],
    "DEFAULT_PARSER_CLASSES": ["rest_framework.parsers.JSONParser"],
    "DEFAULT_PAGINATION_CLASS": "config.pagination.StandardPagination",
    "DEFAULT_FILTER_BACKENDS": ["django_filters.rest_framework.DjangoFilterBackend"],
    "EXCEPTION_HANDLER": "config.exceptions.api_exception_handler",
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {
        # Generous for reads: many mobile users can share one carrier NAT IP.
        "anon": env.str("THROTTLE_ANON", default="600/minute"),
        "user": env.str("THROTTLE_USER", default="240/minute"),
        # Per-client limits on endpoints that create records.
        "inquiries": env.str("THROTTLE_INQUIRIES", default="10/hour"),
        "financial": env.str("THROTTLE_FINANCIAL", default="10/hour"),
        # Sign-in is limited per client IP and, separately, per email address
        # so one account cannot be brute-forced from many addresses.
        "login": env.str("THROTTLE_LOGIN", default="30/hour"),
        "login_account": env.str("THROTTLE_LOGIN_ACCOUNT", default="10/hour"),
        "register": env.str("THROTTLE_REGISTER", default="10/hour"),
    },
    # Number of trusted reverse proxies in front of Django. 0 means the client
    # IP is REMOTE_ADDR and X-Forwarded-For is ignored (it is client-controlled).
    "NUM_PROXIES": env.int("DJANGO_NUM_PROXIES", default=0),
    "TEST_REQUEST_DEFAULT_FORMAT": "json",
}

if DEBUG:
    REST_FRAMEWORK["DEFAULT_RENDERER_CLASSES"].append("rest_framework.renderers.BrowsableAPIRenderer")

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {"plain": {"format": "%(asctime)s %(levelname)s %(name)s %(message)s"}},
    "handlers": {"console": {"class": "logging.StreamHandler", "formatter": "plain"}},
    "root": {"handlers": ["console"], "level": env.str("DJANGO_LOG_LEVEL", default="INFO")},
}

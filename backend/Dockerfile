FROM python:3.12.15-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

# Collect Django Admin and DRF static files into the image (served by
# WhiteNoise). The placeholder values exist only for this build step; real
# settings come from the environment at run time.
RUN DJANGO_ENV_FILE=/nonexistent DJANGO_DEBUG=False DJANGO_ALLOWED_HOSTS=build \
    DJANGO_SECRET_KEY=build-only-not-a-secret-build-only-not-a-secret-xx \
    POSTGRES_DB=build POSTGRES_USER=build POSTGRES_PASSWORD=build \
    python manage.py collectstatic --noinput

RUN useradd --create-home --uid 10001 app && mkdir -p /app/media && chown -R app /app/media
USER app

EXPOSE 8000
# Uses the first allowed host name so Django's host check accepts the request.
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=5 \
    CMD python -c "import os,sys,urllib.request as u; h=os.environ['DJANGO_ALLOWED_HOSTS'].split(',')[0].strip().lstrip('.'); sys.exit(0 if u.urlopen(u.Request('http://127.0.0.1:8000/api/health/', headers={'Host': h}), timeout=4).status == 200 else 1)"

# Migrations are a separate release step (the `migrate` service in
# docker-compose.yml), never a side effect of starting a web worker.
CMD ["sh", "-c", "exec gunicorn config.wsgi:application --bind 0.0.0.0:8000 --workers ${GUNICORN_WORKERS:-3} --timeout ${GUNICORN_TIMEOUT:-60} --access-logfile - --error-logfile -"]

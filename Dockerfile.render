# Single-service image for Render's free plan: Django serves the API, Django
# Admin and the built React app on one origin. The Docker Compose stack
# (nginx + gunicorn) uses frontend/Dockerfile and backend/Dockerfile instead.
# Build context: the repository root (see render.yaml).

FROM node:22.23.4-alpine AS spa
WORKDIR /app
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY frontend/ .
# Same origin as the API. Never put secrets in VITE_* variables.
ENV VITE_API_BASE_URL=/api
RUN npm run build

FROM python:3.12.15-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    SPA_ROOT=/app/spa

WORKDIR /app

COPY backend/requirements.txt .
RUN pip install -r requirements.txt

COPY backend/ .
COPY --from=spa /app/dist /app/spa

# Placeholder values exist only for this build step (see backend/Dockerfile).
RUN DJANGO_ENV_FILE=/nonexistent DJANGO_DEBUG=False DJANGO_ALLOWED_HOSTS=build \
    DJANGO_SECRET_KEY=build-only-not-a-secret-build-only-not-a-secret-xx \
    POSTGRES_DB=build POSTGRES_USER=build POSTGRES_PASSWORD=build \
    python manage.py collectstatic --noinput

RUN useradd --create-home --uid 10001 app && mkdir -p /app/media && chown -R app /app/media
USER app

EXPOSE 10000
CMD ["sh", "start-render.sh"]

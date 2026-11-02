#!/bin/sh
# Start command for the root Dockerfile (Render). Render's free plan has no pre-deploy
# step or shell, so release tasks run here; each one is safe to repeat.
set -e
python manage.py migrate --noinput
if [ "${SEED_SAMPLE_DATA:-False}" = "True" ]; then
    python manage.py seed_sample_data --if-empty
fi
# Optional bootstrap: a rejected DJANGO_SUPERUSER_PASSWORD must not keep the
# public site down. The reason is in the log; fix the value and redeploy.
python manage.py ensure_superuser || echo "ensure_superuser failed; starting without creating an administrator." >&2
# One process, so the in-memory rate-limit counters are shared by all threads.
exec gunicorn config.wsgi:application --bind "0.0.0.0:${PORT:-10000}" --workers 1 \
    --threads "${GUNICORN_THREADS:-4}" --timeout "${GUNICORN_TIMEOUT:-60}" --access-logfile - --error-logfile -

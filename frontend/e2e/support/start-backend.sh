#!/bin/sh
# Starts Django for the Playwright suite on its own throwaway database:
# recreate it, migrate, load the 14 sample listings, then serve.
# Started by playwright.config.ts (webServer); not meant for daily development.
set -eu

HERE=$(cd "$(dirname "$0")" && pwd)
BACKEND="$HERE/../../../backend"
PYTHON=${E2E_PYTHON:-"$BACKEND/.venv/bin/python"}

# Variables set here win over the repository .env (Django reads both).
export POSTGRES_DB="${E2E_POSTGRES_DB:-mkulima_e2e}"
export DJANGO_DEBUG=True          # runserver serves /media only in debug mode
export DJANGO_NUM_PROXIES=0
export MEDIA_STORAGE=local
export MEDIA_ROOT="${E2E_MEDIA_ROOT:-${TMPDIR:-/tmp}/mkulima-e2e-media}"
# Every test browses anonymously from 127.0.0.1; lift the read limit for parallel workers.
export THROTTLE_ANON=100000/minute

rm -rf "$MEDIA_ROOT"
"$PYTHON" "$HERE/reset_db.py"
cd "$BACKEND"
"$PYTHON" manage.py migrate --verbosity 0
"$PYTHON" manage.py seed_sample_data
# Request logs go to a file so they do not flood the Playwright output.
LOG="${E2E_BACKEND_LOG:-$HERE/../../test-results/e2e-backend.log}"
mkdir -p "$(dirname "$LOG")"
echo "start-backend: serving on port ${E2E_BACKEND_PORT:-8100}, log in $LOG"
exec "$PYTHON" manage.py runserver "127.0.0.1:${E2E_BACKEND_PORT:-8100}" --noreload >"$LOG" 2>&1

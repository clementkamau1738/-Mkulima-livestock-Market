# Mkulima Livestock Market

A responsive livestock marketplace for customers in Kenya. Visitors browse dairy cattle, beef cattle, bulls and calves, send purchase inquiries, and submit deposit and withdrawal **requests**. Administrators review every request. Submitting a form never means money has moved.

## Status

| Phase | Scope | State |
| --- | --- | --- |
| 1 | Frontend UI with sample data | Done |
| 2 | Django REST API on PostgreSQL | Done |
| 3 | Frontend connected to the API | Done |
| 4 | Authentication, customer dashboard, admin workflows | Done |
| 5 | Testing, hardening, Docker, deployment | Done |

**Current limits:** the marketplace shows the 14 seeded fictional listings with original illustrations, not photos (pages say so while `SHOW_SAMPLE_DATA_NOTICE` in `frontend/src/config/site.js` is on). Customers can register, sign in, send inquiries (also possible as a guest), submit deposit and withdrawal requests, and follow them on their dashboard. Staff review everything in the admin area at `/admin` in the React app. No real payment provider is connected: staff confirm payments and payouts by checking the official statements themselves, and the system records what they confirm. Payment details, contact details and legal text are placeholders.

## Architecture

```
frontend/   React + Vite + Tailwind SPA
  src/pages/        Route components (Home, Marketplace, LivestockDetails, Deposit, Withdrawal, ...); account/ (customer dashboard); admin/ (staff area, lazy-loaded)
  src/components/   ui/ (buttons, fields, badges, modal, states), layout/, livestock/, requests/, auth/ (route guard, sign-in prompt), admin/ (tables, filters, status actions, photo manager)
  src/context/      AuthProvider: the signed-in user as reported by the server; notices expired sessions
  src/layouts/      MainLayout (navbar, footer, toasts), AdminLayout (staff section navigation)
  src/content/      Copy and configuration, e.g. workflows.js (wording for each status change)
  src/services/     api.js (the one Axios client and ApiError), mappers.js (API <-> UI shapes), livestockService, requestService, authService, accountService, adminService
  src/test/         Vitest suites; fixtures/ holds the sample data and fakeApi.js serves it as an in-memory Axios adapter
  src/utils/        Formatting, URL <-> filter mapping, validation rules
  src/hooks/        useAsync, useSubmission (double-submit guard, idempotency key, server field errors), useAuth, useListParams (table filters in the URL), useSyncedDraft, useDocumentTitle
backend/    Django + Django REST Framework
  config/        Settings (env-driven), URLs (admin_urls.py: the staff API), pagination, error envelope, CSRF-aware session auth, shared API base classes
  accounts/      Custom User with a role (customer, staff, admin); register, sign in, sign out; permissions; account suspension
  livestock/     Category, LivestockListing, LivestockImage; public read API; seed command and sample data
  inquiries/     PurchaseInquiry
  payments/      DepositRequest, WithdrawalRequest, PaymentInstructions (admin-editable singleton)
  transactions/  Transaction (verified money movements only), RequestStatusHistory, AuditLog, reference numbers, workflow.py (state machines), staff summary and audit log API
```

Each app has `admin_views.py` and `admin_serializers.py` for its part of the staff API under `/api/admin/`, separate from the public and customer views.

Each app keeps models, serializers, views, `services.py` (business rules and writes) and, where useful, `selectors.py` (read queries) separate. Views only validate input and call services.

**Money rules built into the data layer**
- A deposit or withdrawal request starts `pending`. Clients cannot set `status`, `user`, `reviewer` or `reference`, because the API ignores those fields.
- A `Transaction` records only an independently verified movement. Its one-to-one link means a request can never get two transactions. Transactions, status history and audit log rows are append-only.
- An active deposit cannot reuse the same payment reference (database constraint, case-insensitive).
- There is no wallet or stored balance.

**Review workflows** (`transactions/workflow.py`, used by each app's `services.py`). Only these moves are possible; anything else returns 409 `invalid_transition`:

| Record | Allowed moves | Extra requirements |
| --- | --- | --- |
| Deposit | pending -> approved or rejected | Approve: reviewer confirms the payment is in the official statement; creates exactly one `Transaction`. Reject: reason required. |
| Withdrawal | pending -> approved or rejected; approved -> processing; processing -> completed or failed | Approve: reviewer confirms the customer is owed the amount (no money moves). Complete: confirmation plus the provider's payout reference; creates exactly one `Transaction`. Reject and fail: reason required. |
| Purchase inquiry | pending -> contacted -> viewing_arranged -> completed; cancelled from any non-final step | Cancel: reason required. |
| Listing | draft -> available or archived; available -> reserved, sold or archived; reserved -> available, sold or archived; sold -> archived; archived -> draft | Publishing needs at least one photo. New listings are always drafts. |

Every change runs in one database transaction that locks the row (`select_for_update`). Two reviewers acting at once are applied one after the other: repeating a move that already happened returns 200 and changes nothing, and a conflicting move gets 409. Staff cannot review their own deposit or withdrawal. Each change writes a `RequestStatusHistory` row (requests) and an `AuditLog` row with the reviewer, time, reason and client IP. Customers see the status history and reasons, not who reviewed.

Marketplace filters live in the URL (`?q=&category=&breed=&minPrice=&maxPrice=&sort=&page=`), so results can be bookmarked and shared. `livestockService` translates them to the API's names (`min_price`, `max_price`, ...).

In development the browser talks only to Vite, which proxies `/api` and `/media` to Django. The API is therefore same-origin, so the session cookie and CSRF work without CORS. Production does the same with nginx (see Deployment): one domain, same-origin API, no CORS needed.

## Versions (pinned exactly)

Frontend (`frontend/package.json`):

| Package | Version |
| --- | --- |
| Node.js | >= 22.22.0 (required by React Router 8; developed on 22.23.3) |
| React / React DOM | 19.3.1 |
| React Router | 8.4.0 |
| Vite | 8.3.5 |
| Tailwind CSS (+ @tailwindcss/vite) | 4.3.3 |
| Axios | 1.20.0 |
| React Hook Form | 7.90.0 |
| Sonner (toasts) | 2.0.8 |
| Lucide React | 1.61.0 |
| Fonts: Fraunces, Manrope (@fontsource-variable, self-hosted, OFL) | 5.3.0 |
| Vitest | 5.0.3 |
| Testing Library React / user-event / jest-dom | 16.3.3 / 14.6.8 / 7.0.1 |
| jsdom | 30.1.2 |
| oxlint (linter from the Vite template) | 1.89.0 |

Backend (`backend/requirements.txt`):

| Package | Version |
| --- | --- |
| Python | 3.12 (local 3.12.3; Docker image `python:3.12.15-slim`) |
| PostgreSQL | 17 (Docker image `postgres:17.11-alpine`) |
| Django | 6.1.2 |
| djangorestframework | 3.18.3 |
| django-filter | 26.2 |
| django-cors-headers | 4.9.0 |
| django-environ | 0.14.0 |
| psycopg (binary) | 3.3.6 |
| Pillow | 13.0.0 |
| gunicorn | 26.2.0 |
| whitenoise | 6.12.0 |
| django-storages (with `s3` extra) | 1.14.6 |
| boto3 | 1.43.118 |
| redis (redis-py) | 8.1.0 |

Infrastructure images (`docker-compose.yml`, Dockerfiles): `postgres:17.11-alpine`, `redis:8.8.3-alpine`, `python:3.12.15-slim`, `node:22.23.4-alpine` (build stage), `nginx:1.30.6-alpine`.

django-cors-headers 4.9.0, django-environ 0.14.0 and WhiteNoise 6.12.0 list Django support only up to 6.0 in their package metadata, and django-storages 1.14.6 up to 5.1 (it requires only Django >= 3.2). All are verified on 6.1.2: the backend suite runs on it, WhiteNoise serves the admin assets in the Docker stack, and S3 uploads were tested against an S3-compatible server (see Deployment). If one ever breaks, Django 6.0.9 is the fallback pin. boto3's own dependencies (botocore, s3transfer) are not pinned in `requirements.txt`; boto3 pins botocore to its matching release.

## Getting started (frontend)

```bash
cd frontend
npm ci                  # install exactly what the lockfile pins
cp .env.example .env.local
npm run dev             # http://localhost:5173, needs the backend on :8000 (see below)
```

The frontend has no offline mode. With the backend stopped, pages show their "could not reach the server" states.

| Command | Purpose |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build into `frontend/dist` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | oxlint; warnings fail the run |
| `npm test` | Run the test suite once (uses the in-memory fake API; no backend needed) |
| `npm run test:watch` | Tests in watch mode |
| `npm run generate:images` | Regenerate the site illustrations (`public/images/site`) and the listing source art (`scripts/sample-art`) |

## Getting started (backend)

Prerequisites: Python 3.12, Docker with Compose.

```bash
cp .env.example .env            # then set DJANGO_SECRET_KEY and POSTGRES_PASSWORD; DJANGO_DEBUG=True for local dev
docker compose up -d db         # PostgreSQL 17 on 127.0.0.1:5432
cd backend
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/python manage.py migrate
.venv/bin/python manage.py seed_sample_data      # fictional sample listings; safe to re-run
.venv/bin/python manage.py createsuperuser       # first administrator (Django Admin at /django-admin/)
.venv/bin/python manage.py runserver             # http://127.0.0.1:8000
```

| Command (from `backend/`) | Purpose |
| --- | --- |
| `.venv/bin/python manage.py test` | Run the backend tests (needs the db container; creates a throwaway `test_<db>` database) |
| `.venv/bin/python manage.py makemigrations --check --dry-run` | Fail if models and migrations have drifted |
| `.venv/bin/python manage.py seed_sample_data` | Create sample categories, 14 listings and 42 images. It matches by slug, so it never duplicates or overwrites admin edits. |
| `.venv/bin/python manage.py check --deploy` | Django's production checklist (run with production environment values) |
| `docker compose up -d --build` (repo root) | The whole production-style stack on http://127.0.0.1:8080 (see below) |

### PostgreSQL without Docker

Create a role and database that match `.env`. The role needs `CREATEDB` so the test runner can create its test database:

```sql
CREATE ROLE mkulima LOGIN PASSWORD 'your-password' CREATEDB;
CREATE DATABASE mkulima OWNER mkulima;
```

### Accounts and roles

| Role | How to create | Can do |
| --- | --- | --- |
| Customer | Registers on `/register` | Submit inquiries and money requests; see only their own records |
| Staff | Django Admin: add a user with role `staff` | Everything in the React staff area at `/admin`, except changing account access |
| Administrator | `manage.py createsuperuser`, or role `admin` in Django Admin | Staff abilities plus suspending and restoring customer and staff accounts |

The first administrator is created with `createsuperuser` (superusers always get role `admin`). Staff sign in to the React app with their email and password. Django Admin keeps username sign-in.

### Staff area and Django Admin

The React staff area at `/admin` is where the work happens: summary counts, listing management (create, edit, publish, reserve, sell, archive, photos), inquiry, deposit and withdrawal review, customer lookup and suspension, and the audit log. Every table has search, filters and pagination, kept in the URL.

The Django Admin at `/django-admin/` (set by `DJANGO_ADMIN_URL`; not `/admin/`, which is the React staff area) manages categories, user roles and the payment instructions. Requests are **read-only** there, and listing status cannot be changed there, so that every status change goes through the audited workflow. Listing edits made in Django Admin are written to the audit log.

Uploaded images must be JPEG, PNG or WebP (checked by content, not just extension), at most 5 MB, and between 400 and 6000 px per side. Stored file names are random. The client's file name is never used.

## Running the production stack locally

`docker compose up -d --build` builds and starts the same containers a server runs:

| Service | What it does |
| --- | --- |
| `db` | PostgreSQL 17, data in the `pgdata` volume, published on 127.0.0.1:5432 only |
| `redis` | Shared cache for rate-limit counters across gunicorn workers (no persistence needed) |
| `migrate` | Release step: `manage.py migrate`, then exits. The backend starts only if it succeeds. |
| `backend` | gunicorn (3 workers, `GUNICORN_WORKERS`), `DEBUG` forced off, static files via WhiteNoise, health check on `/api/health/` |
| `web` | nginx: the built React app, `/api/` and the Django Admin proxied to the backend, uploaded photos served from the `media` volume (read-only), security headers and Content-Security-Policy |

The stack's defaults are production-safe (HTTPS redirect, secure cookies, HSTS), so plain `http://127.0.0.1:8080` only works after you add these to your local `.env`:

```bash
DJANGO_SECURE_SSL_REDIRECT=False
DJANGO_SECURE_COOKIES=False
DJANGO_HSTS_SECONDS=0
```

Then:

```bash
docker compose up -d --build
docker compose exec backend python manage.py createsuperuser
docker compose exec backend python manage.py seed_sample_data     # optional sample listings
open http://127.0.0.1:8080
```

Photos uploaded while developing with `runserver` live in `backend/media`, not in the stack's `media` volume. To copy them in (as the container's user, so later uploads still work): `tar -C backend/media -cf - . | docker compose exec -T backend tar -C /app/media -xf -`.

## Deployment

The supported target is one Linux server with Docker and Compose, running this stack behind a TLS terminator. Any equivalent (managed PostgreSQL, a container platform, a load balancer) works with the same environment variables.

1. **Domain and TLS.** Point the domain at the server. Terminate HTTPS in front of the `web` container: a host-level Caddy or nginx with Let's Encrypt, or a cloud load balancer. It must forward to `127.0.0.1:8080`, pass `Host`, set `X-Forwarded-For` and `X-Forwarded-Proto`, and strip any client-sent `X-Forwarded-Proto`.
2. **Environment.** Copy `.env.example` to `.env` on the server and set:
   - `DJANGO_SECRET_KEY`: a new random value (never reuse the development one).
   - `DJANGO_ALLOWED_HOSTS=market.example.co.ke`, the real host names.
   - `POSTGRES_PASSWORD`: a strong, unique password.
   - `DJANGO_SECURE_SSL_REDIRECT=True`, `DJANGO_SECURE_COOKIES=True`, `DJANGO_TRUST_X_FORWARDED_PROTO=True`, `STACK_NUM_PROXIES=2` (the TLS proxy plus nginx).
   - `DJANGO_HSTS_SECONDS=300` for the first deploy. Raise it to `31536000` once HTTPS works, then consider `DJANGO_HSTS_INCLUDE_SUBDOMAINS` and `DJANGO_HSTS_PRELOAD` (only if every subdomain is HTTPS).
   - Media: keep `MEDIA_STORAGE=local` (photos stay in the `media` volume and are included in server backups), or use object storage with `MEDIA_STORAGE=s3` plus the `S3_*` variables and `CSP_IMG_SRC` including the media origin.
   - Remove the plain-HTTP overrides described above if you copied a local `.env`.
3. **Check the configuration** before starting: `docker compose run --rm --no-deps backend python manage.py check --deploy`. With HSTS include-subdomains and preload off, the two expected warnings are `security.W005` and `security.W021`; nothing else should appear.
4. **Start:** `docker compose up -d --build`, then `docker compose exec backend python manage.py createsuperuser`.
5. **Smoke test:** `curl -fsS https://market.example.co.ke/api/health/` returns `{"status": "ok"}`; sign in as the administrator; open `/admin`.
6. **Business setup** (Django Admin at `/django-admin/`): enter the real payment instructions, create staff users with role `staff`, and review the categories. In `frontend/src/config/site.js` replace the contact placeholders and set `SHOW_SAMPLE_DATA_NOTICE = false`, then rebuild `web`. Remove or archive the sample listings.

**Updating to a new release:** take a backup (below), `git pull`, `docker compose up -d --build`. The `migrate` service applies migrations before the new backend starts; if it fails, the old containers are replaced only after you fix it (`docker compose logs migrate`).

### Migrations procedure

- Create migrations in development (`manage.py makemigrations`), commit them, and keep `makemigrations --check --dry-run` passing (the test checklist below runs it).
- Prefer additive changes (new nullable columns, new tables). Remove or rename columns over two releases: first stop using them, then drop them.
- Before a release with migrations: back up, then deploy. Migrations run once, in the `migrate` release step, never inside web workers.
- Rolling back code after a migration: restore the backup taken before the release, or migrate the app back first with `docker compose run --rm backend python manage.py migrate <app> <previous_migration>`.

### Backups and restore

Back up the database daily and before every release. A custom-format dump:

```bash
docker compose exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom --no-owner' > mkulima-$(date +%F).dump
```

With `MEDIA_STORAGE=local`, also back up the photos:

```bash
docker compose exec -T backend tar -C /app/media -czf - . > mkulima-media-$(date +%F).tar.gz
```

Keep copies off the server, and test a restore regularly. To restore into an empty database:

```bash
docker compose stop backend web
docker compose exec -T db sh -c 'dropdb -U "$POSTGRES_USER" "$POSTGRES_DB" && createdb -U "$POSTGRES_USER" "$POSTGRES_DB"'
docker compose exec -T db sh -c 'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner --exit-on-error' < mkulima-YYYY-MM-DD.dump
docker compose exec -T backend tar -C /app/media -xzf - < mkulima-media-YYYY-MM-DD.tar.gz   # local media only
docker compose up -d
```

To check a backup without touching the live data, restore it into a scratch database (`createdb ... mkulima_restore_check`, `pg_restore -d mkulima_restore_check ...`), compare row counts, then `dropdb` it. This procedure was run in Phase 5: a dump restored with identical counts in every table checked.

## Testing checklist

Run all of these before a release:

| Check | Command | Phase 5 result |
| --- | --- | --- |
| Backend tests (PostgreSQL) | `cd backend && .venv/bin/python manage.py test` | 167 passed |
| Migrations up to date | `.venv/bin/python manage.py makemigrations --check --dry-run` | No changes detected |
| Deploy checklist | `check --deploy` with production values | Clean with HSTS subdomains and preload on; only W005 and W021 with them off |
| Frontend lint | `cd frontend && npm run lint` | 0 warnings |
| Frontend tests | `npm test` | 88 passed |
| Production build | `npm run build` | Succeeds, no size warning |
| Secret scan | `gitleaks dir` over the files Git would commit | No leaks |

What the backend tests cover beyond the earlier phases:
- Every API route is called as an anonymous visitor, a customer and staff. A new route that is not classified fails the suite.
- The app refuses to start, naming the problem, when a required variable is missing, the secret key is weak, `ALLOWED_HOSTS` is empty in production, or object storage lacks credentials.
- Hostile upload file names: path traversal, HTML or script in the name, very long names. SVG, HTML, PHP and double-extension uploads are rejected.

## API reference

Base path `/api/`. JSON only (photo upload uses multipart). Session authentication with Django's CSRF protection.

**Authentication.** `GET /auth/session/` returns `{"user": ...}` or `{"user": null}` and sets the `csrftoken` cookie. Every POST, PATCH and DELETE must send that value in the `X-CSRFToken` header, including sign-in and registration. A missing or stale token returns 403 `csrf_failed`; the frontend then fetches a fresh token and retries once. Signing in rotates both the session and the CSRF token. Sessions last `SESSION_COOKIE_AGE` seconds (12 hours by default) and stop working immediately if the account is suspended.

| Method | Path | Access | Notes |
| --- | --- | --- | --- |
| GET | `/health/` | Public | `{"status": "ok"}` when the database and cache answer, else 503. Used by container health checks. |
| GET | `/auth/session/` | Public | Current user or null; sets the CSRF cookie |
| POST | `/auth/register/` | Public, 10/hour per IP | `full_name`, `email`, `phone`, `password`. Django password validation. Always creates a customer and signs them in. |
| POST | `/auth/login/` | Public, 30/hour per IP and 10/hour per email | `email`, `password`. Wrong password and unknown email get the same 403 `invalid_credentials`. |
| POST | `/auth/logout/` | Anyone | Always 204 |

| Method | Path | Access | Notes |
| --- | --- | --- | --- |
| GET | `/livestock/` | Public | Published listings only. Query: `q`, `category` (slug), `breed` (case-insensitive), `min_price`, `max_price`, `status` (`available` / `reserved` / `sold`), `sort` = `newest` / `price_asc` / `price_desc`, `page`, `page_size` (max 50, default 9) |
| GET | `/livestock/{id}/` | Public | Adds `description` and `images` (primary first) |
| GET | `/livestock/{id}/related/` | Public | Up to 3 open listings in the same category |
| GET | `/livestock/breeds/` | Public | Distinct breeds of published listings |
| GET | `/categories/` | Public | Active categories |
| GET | `/payment-instructions/` | Public | `is_placeholder` is true until an administrator enters real payment details |
| POST | `/inquiries/` | Public, 10/hour | `listing`, `full_name`, `phone`, `email?`, `message` |
| POST | `/deposits/` | Signed in, 10/hour | `full_name`, `phone`, `amount`, `payment_reference`, `notes?` |
| POST | `/withdrawals/` | Signed in, 10/hour | `full_name`, `phone`, `amount`, `method` (`mpesa` with `mpesa_number`, or `bank` with `bank_name`, `account_name`, `account_number`), `reason?` |
| GET | `/inquiries/`, `/deposits/`, `/withdrawals/` | Signed in | Your own records only, newest first |
| GET | `/inquiries/{reference}/` (and deposits, withdrawals) | Signed in | Your own record with status history (status, reason, time). Someone else's reference returns 404. |

**Staff API** under `/api/admin/`. Staff and administrators only: anonymous requests get 403 `not_authenticated`, customers and suspended staff get 403 `permission_denied`. Lists take `page`, `page_size` (max 100, default 20), `q` (search) and the filters shown.

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/admin/summary/` | Counts by status for listings, inquiries, deposits, withdrawals; customer totals |
| GET, POST | `/admin/livestock/` | All statuses. Filters `status`, `category`; `sort` (`updated`, `created`, `price`, `title`, prefix `-` to reverse). POST creates a draft. |
| GET, PATCH | `/admin/livestock/{id}/` | Edit details. `status` is ignored here. |
| POST | `/admin/livestock/{id}/transition/` | `status`, `reason?` |
| POST | `/admin/livestock/{id}/images/` | Multipart `image`, `alt_text?`, `caption?`. Max 12 per listing; the first becomes the main photo. |
| PATCH, DELETE | `/admin/livestock/{id}/images/{image_id}/` | PATCH `alt_text`, `caption`, `sort_order`, `is_primary` |
| GET | `/admin/inquiries/`, `/admin/deposits/`, `/admin/withdrawals/` | Filter `status` (withdrawals also `method`); search covers reference, name, phone, email (deposits also payment reference) |
| GET | `/admin/{inquiries,deposits,withdrawals}/{reference}/` | Full record, `allowed_transitions`, status history with reviewer, linked transaction. Withdrawals include the full payout destination. |
| POST | `/admin/{inquiries,deposits,withdrawals}/{reference}/transition/` | `status`, `reason`, `confirmed` (bool), `external_reference` (withdrawal completion). See the workflow table above. |
| GET | `/admin/accounts/`, `/admin/accounts/{id}/` | Filters `role`, `is_active` |
| POST | `/admin/accounts/{id}/access/` | Administrators only. `is_active`, `reason`. Not for your own account or other administrators. |
| GET | `/admin/audit-log/` | Filters `action` (prefix, e.g. `depositrequest`), `target_type`, `target_id`, `actor`. Read-only. |

**Safe retries.** Send an `Idempotency-Key: <uuid>` header with POSTs to `/inquiries/`, `/deposits/` and `/withdrawals/`, and reuse the same key for every retry of one submission. The first request returns 201. Any repeat returns **200 with the original record**, so a timeout, a dropped connection or a double click can never create a second record. A key already used by a different user returns 409 `conflict`. A request rejected with 400 does not use up its key. The frontend generates a key per submission and keeps it until the submission succeeds.

A record created while signed in is linked to that session's user. The payload never decides identity. Phone numbers are normalized to `+2547XXXXXXXX` or `+2541XXXXXXXX`. Money is returned as a decimal string, for example `"5000.00"`. Withdrawal responses show a masked destination such as `M-Pesa ending 432`, never full account numbers.

Every error uses one envelope:

```json
{"error": {"code": "validation_error", "message": "Some of the information provided is not valid.", "fields": {"phone": ["Enter a valid Kenyan phone number, e.g. 0712 345 678."]}}}
```

Other codes include `conflict` (409, idempotency key reused by someone else), `invalid_transition` (409, status change not allowed from the current status), `invalid_credentials`, `csrf_failed`, `not_found`, `not_authenticated` (HTTP 403, because session auth sends no `WWW-Authenticate` challenge), `permission_denied`, `method_not_allowed`, `parse_error`, `throttled` (with `retry_after_seconds`) and `server_error` (no internal details).

## Environment variables

Root `.env.example` documents every backend and Docker variable, grouped as:
- Django: secret key, debug, allowed hosts, admin path, session length.
- HTTPS and proxies: SSL redirect, secure cookies, HSTS, trusting `X-Forwarded-Proto`, proxy counts.
- PostgreSQL.
- CORS and CSRF origins.
- Cache (`CACHE_URL`).
- Media storage (`MEDIA_STORAGE` and `S3_*`).
- Rate limits.
- Docker stack (`WEB_PORT`, `GUNICORN_WORKERS`, `STACK_NUM_PROXIES`, `CSP_IMG_SRC`).

Rules the settings enforce:
- `DJANGO_SECRET_KEY` and the `POSTGRES_*` credentials are required. Startup fails with `ImproperlyConfigured` naming the missing variable.
- `DEBUG` is off unless set. With it off, a weak or placeholder secret key, an empty `DJANGO_ALLOWED_HOSTS`, or `MEDIA_STORAGE=s3` without its credentials also stop startup.
- `DJANGO_NUM_PROXIES` must equal the number of reverse proxies in front of Django (0 with `runserver`). With 0, `X-Forwarded-For` is ignored, because clients can forge it to dodge rate limits or spoof audit-log IPs.

`frontend/.env.example` holds `VITE_API_BASE_URL`. Only `VITE_*` variables reach the browser, so they must never contain secrets. Real `.env` files are git-ignored. Variables already set in the environment always win over `.env`; `DJANGO_ENV_FILE` points at a different file.

## Placeholders that need real business information

- Contact details in the footer (`frontend/src/config/site.js`)
- Deposit payment instructions (edit in Django Admin under Payments > Payment instructions; the deposit page shows a warning until real details exist)
- Terms of use and privacy policy text (outlines only; these need legal review)
- Real listing photos, with permission to use them

## Troubleshooting

- **`npm install <pkg>` fails with `Cannot read properties of null (reading 'edgesOut')`.** This is an npm 10.9.x bug in peer-dependency resolution that the Vitest 5 dependency tree triggers. `npm ci` from the committed lockfile works with npm 10. To add or upgrade packages, use npm 11: `npx npm@11 install <pkg>`.
- **Port 5173 already in use.** Another Vite server is running. Stop it, or run `npm run dev -- --port 5174`.
- **Every page shows "could not reach the server".** The backend is not running on `API_PROXY_TARGET` (default `http://127.0.0.1:8000`).
- **Engine warnings for react-router.** Upgrade Node to 22.22.0 or newer.
- **`connection refused` on port 5432.** Start the database with `docker compose up -d db` and check it with `docker compose ps`.
- **Tests fail with `permission denied to create database`.** The PostgreSQL role needs `CREATEDB` (see above).
- **Images 404 on the Docker stack.** Uploaded photos live in the `media` volume, not `backend/media`. Copy development photos in with the `tar` command under "Running the production stack locally", or seed inside the container (`docker compose exec backend python manage.py seed_sample_data`; it skips listings that already have images).
- **The app will not start: `ImproperlyConfigured: DJANGO_SECRET_KEY must be a random value...`.** With `DEBUG` off the key must be at least 50 random characters. The same check covers an empty `DJANGO_ALLOWED_HOSTS`.
- **Every request to the Docker stack redirects to `https://127.0.0.1:8080`.** The stack is secure by default. For a plain-HTTP local run, add the three overrides in "Running the production stack locally".
- **Signing in works but the next request says "not signed in" on the Docker stack over HTTP.** `DJANGO_SECURE_COOKIES` is on, so the browser drops the cookie on plain HTTP. Same fix.
- **400 Bad Request from Django behind a proxy.** The `Host` the proxy sends is not in `DJANGO_ALLOWED_HOSTS`.
- **All visitors share one rate limit.** `STACK_NUM_PROXIES` (Docker) or `DJANGO_NUM_PROXIES` is lower than the number of proxies in front of Django, so Django sees the proxy's address as the client.
- **Images blocked in the browser after switching to S3.** Add the media origin to `CSP_IMG_SRC` and recreate the `web` container.
- **`docker compose ps` shows `migrate` as `Exited (0)`.** That is expected: it runs once per start.
- **Sample images.** The 42 WebP files in `backend/livestock/sample_data/images` were rendered once (1200x900) from the SVG source art in `frontend/scripts/sample-art/livestock`. They are original artwork, not photos.
- **403 `csrf_failed`.** The `csrftoken` cookie is missing or stale. Load any page first (the app calls `/api/auth/session/`, which sets it). When calling the API from scripts, GET that endpoint, then send the cookie value in `X-CSRFToken`.
- **Deposits or withdrawals return 403 `not_authenticated`.** These need a signed-in customer since Phase 4. Inquiries still work as a guest.
- **Staff cannot open `/admin` in the React app.** Check the user's role is `staff` or `admin` and the account is active (Django Admin > Users).
- **429 on sign-in after a few attempts.** Sign-in is limited per IP and per email (`THROTTLE_LOGIN`, `THROTTLE_LOGIN_ACCOUNT`). Counters live in the cache and reset when the server restarts in development.

## Remaining limitations

- **No payment provider integration.** M-Pesa (Daraja) and bank APIs are not connected. Staff confirm deposits and payouts by checking official statements manually, and the system records what they confirm. The integration needs real credentials and belongs in its own module, kept separate from the request and transaction logic.
- **No wallet or stored balance,** by design. Withdrawal approval relies on staff checking what the customer is owed. A wallet would need a ledger, row locking, balance constraints and idempotent callbacks before it could be added.
- **Real business details are still placeholders:** payment instructions, contact details, and the terms and privacy text (which need legal review).
- **Sample data:** the 14 listings and their illustrations are fictional. End-to-end test records from Phases 3 to 5 (accounts and requests labelled "E2E" or "Race", listing "E2E Sahiwal heifer") are in the development database only.
- **Not yet built:** password reset by email, email or SMS notifications, customer profile editing, and customers cancelling their own inquiries. There is no outgoing email configuration at all.
- **Operations not included:** monitoring and alerting, automated off-server backups, log shipping and malware scanning of uploads. Images are verified by decoding them and their file names are discarded.
- **Rate limits** count retries of the same submission, so a customer on a very unstable connection could reach the 10-per-hour limit on money requests sooner than expected.

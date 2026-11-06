"""Drop and recreate the E2E database so every run starts from the same seed.

Reads the same variables as Django (the repository .env, overridden by the
environment). Refuses to touch any database whose name does not end in
"_e2e", so it can never wipe the development or production database.
Run with the backend virtualenv's Python: it needs django-environ and psycopg.
"""

import os
import sys
from pathlib import Path

import environ
import psycopg
from psycopg import sql

REPO_ROOT = Path(__file__).resolve().parents[3]

env = environ.Env()
env_file = Path(os.environ.get("DJANGO_ENV_FILE", REPO_ROOT / ".env"))
if env_file.is_file():
    env.read_env(env_file)

name = env.str("POSTGRES_DB")
if not name.endswith("_e2e"):
    sys.exit(f"reset_db: refusing to reset '{name}': the E2E database name must end in _e2e.")

params = {
    "dbname": "postgres",
    "user": env.str("POSTGRES_USER"),
    "password": env.str("POSTGRES_PASSWORD"),
    "host": env.str("POSTGRES_HOST", default="localhost"),
    "port": env.int("POSTGRES_PORT", default=5432),
}

with psycopg.connect(**params, autocommit=True) as conn:
    conn.execute(sql.SQL("DROP DATABASE IF EXISTS {} WITH (FORCE)").format(sql.Identifier(name)))
    conn.execute(sql.SQL("CREATE DATABASE {}").format(sql.Identifier(name)))

print(f"reset_db: recreated {name}")

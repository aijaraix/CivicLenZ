"""Supervised HERMES database readiness check; preserves observation-only runtime.

Credentials are delivered by systemd LoadCredential to a dedicated OS identity.
This check proves connectivity, not scheduler activation or civic validation.
"""
import json
import os
from pathlib import Path
import runpy
import sqlite3
import time

import psycopg2


def check_database():
    credential_dir = Path(os.environ["CREDENTIALS_DIRECTORY"])
    password = (credential_dir / "database-password").read_text().strip()
    with psycopg2.connect(
        host="aws-0-us-west-2.pooler.supabase.com",
        port=5432,
        user="hermes_runtime.uazqyzmzydtmbypjuqjw",
        dbname="postgres",
        password=password,
        sslmode="verify-full",
        sslrootcert="/etc/civiclenz/supabase-prod-ca-2021.crt",
        connect_timeout=8,
        application_name="civiclenz-hermes-prime",
    ) as connection:
        with connection.cursor() as cursor:
            cursor.execute("SELECT current_user")
            identity = cursor.fetchone()[0]
            if identity != "hermes_runtime" or not connection.info.ssl_in_use:
                raise RuntimeError("HERMES database identity/TLS mismatch")
            cursor.execute("SELECT count(*) FROM public.jobs")
            visible_jobs = cursor.fetchone()[0]
        return {
            "database_identity": identity,
            "client_tls": connection.info.ssl_in_use,
            "tls_protocol": connection.info.ssl_attribute("protocol"),
            "visible_job_rows_including_tests": visible_jobs,
            "observed_at": time.time(),
            "dispatch_active": False,
        }


def main():
    # Never log connection exceptions: future driver messages may contain DSNs.
    try:
        result = check_database()
    except Exception:
        print(json.dumps({"database_readiness": "FAILED", "dispatch_active": False}), flush=True)
        raise SystemExit(1)
    state = Path("/var/lib/civiclenz/hermes-prime/operations.sqlite3")
    with sqlite3.connect(state) as database:
        database.execute(
            "CREATE TABLE IF NOT EXISTS database_readiness "
            "(observed_at REAL NOT NULL, snapshot TEXT NOT NULL)"
        )
        database.execute(
            "INSERT INTO database_readiness VALUES (?, ?)",
            (result["observed_at"], json.dumps(result, sort_keys=True)),
        )
    print(json.dumps({"database_readiness": result}), flush=True)
    runpy.run_path("/opt/civiclenz/hermes/current/observer.py", run_name="__main__")


if __name__ == "__main__":
    main()

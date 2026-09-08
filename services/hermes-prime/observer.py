"""Stage 2 HERMES observation runtime. Never dispatches or writes civic state."""
import argparse
import ctypes
import json
import os
from pathlib import Path
import select
import shutil
import signal
import sqlite3
import subprocess
import time
import urllib.request

VERSION = "0.1.0"
SERVICES = ("civiclenz-hermes-ingest", "civiclenz-cloudflared-ingest",
            "civiclenz-qwen", "civiclenz-openclaw")


def governor(memory_available, disk_free, load, cpus):
    reasons = []
    if memory_available < 2 * 1024**3:
        reasons.append("MEMORY_HEADROOM")
    if disk_free < 10 * 1024**3:
        reasons.append("DISK_HEADROOM")
    if load > max(1, cpus) * .85:
        reasons.append("CPU_HEADROOM")
    return {"state": "PAUSE_NEW_WORK" if reasons else "HEADROOM_AVAILABLE",
            "reasons": reasons, "dispatch_enabled": False,
            "dispatch_limit": 0}


def resources():
    memory = {}
    for line in Path("/proc/meminfo").read_text().splitlines():
        key, value = line.split(":", 1)
        memory[key] = int(value.split()[0]) * 1024
    return {"memory_available_bytes": memory["MemAvailable"],
            "swap_used_bytes": memory["SwapTotal"] - memory["SwapFree"],
            "disk_free_bytes": shutil.disk_usage("/opt/civiclenz").free,
            "load_one_minute": os.getloadavg()[0], "cpus": os.cpu_count() or 1}


def service_state(name):
    result = subprocess.run(["systemctl", "show", name, "--property=LoadState,ActiveState,UnitFileState"],
                            capture_output=True, text=True, timeout=5, check=False)
    if result.returncode:
        return {"state": "UNKNOWN", "error": "SERVICE_QUERY_FAILED"}
    fields = dict(line.split("=", 1) for line in result.stdout.splitlines() if "=" in line)
    return {"state": "NOT_IMPLEMENTED" if fields.get("LoadState") == "not-found"
            else fields.get("ActiveState", "UNKNOWN"),
            "boot": fields.get("UnitFileState", "unknown")}


def local_receiver_health():
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
    try:
        with opener.open("http://127.0.0.1:8788/v1/harvester/health", timeout=3) as response:
            return response.status == 200 and json.loads(response.read(4096)).get("status") == "ok"
    except (OSError, ValueError):
        return False


def observe(spool):
    measured = resources()
    receipts = spool / "receipts"
    count = sum(1 for p in receipts.iterdir() if p.is_file() and p.suffix == ".json") if receipts.exists() else 0
    return {"version": VERSION, "mode": "OBSERVATION_NO_DISPATCH",
            "observed_at": time.time(), "resources": measured,
            "governor": governor(measured["memory_available_bytes"], measured["disk_free_bytes"],
                                 measured["load_one_minute"], measured["cpus"]),
            "services": {name: service_state(name) for name in SERVICES},
            "receiver_health": local_receiver_health(), "local_receipt_files": count,
            "canonical_dispatch": "NOT_IMPLEMENTED",
            "canonical_work_ledger": "NOT_IMPLEMENTED",
            "civic_validation": "NOT_IMPLEMENTED"}


def persist(db, snapshot, trigger):
    """Operational samples only; this is not a civic database or research ledger."""
    stamp = snapshot["observed_at"]
    with db:
        db.execute("INSERT INTO observations(observed_at,trigger,snapshot) VALUES(?,?,?)",
                   (stamp, trigger, json.dumps(snapshot, sort_keys=True)))
        db.execute("DELETE FROM observations WHERE id NOT IN (SELECT id FROM observations ORDER BY id DESC LIMIT 2880)")
        problems = []
        if not snapshot["receiver_health"]:
            problems.append(("RECEIVER_UNHEALTHY", "Inspect receiver health and supervised recovery"))
        if snapshot["local_receipt_files"] and snapshot["canonical_dispatch"] == "NOT_IMPLEMENTED":
            problems.append(("INTAKE_PENDING_DOWNSTREAM", "Complete governed canonical dispatch; do not promote local intake"))
        for reason in snapshot["governor"]["reasons"]:
            problems.append((reason, "Measure sustained pressure before changing resource limits"))
        for key, proposal in problems:
            db.execute("""INSERT INTO academy_observations(reason,first_seen,last_seen,observations,proposal,state)
                VALUES(?,?,?,1,?,'PROPOSED_REQUIRES_TEST') ON CONFLICT(reason) DO UPDATE SET
                last_seen=excluded.last_seen, observations=academy_observations.observations+1""",
                       (key, stamp, stamp, proposal))


def database(path):
    db = sqlite3.connect(path)
    db.execute("PRAGMA journal_mode=WAL")
    db.execute("PRAGMA synchronous=FULL")
    db.executescript("""
      CREATE TABLE IF NOT EXISTS observations(id INTEGER PRIMARY KEY, observed_at REAL NOT NULL,
        trigger TEXT NOT NULL, snapshot TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS academy_observations(reason TEXT PRIMARY KEY,first_seen REAL NOT NULL,
        last_seen REAL NOT NULL,observations INTEGER NOT NULL,proposal TEXT NOT NULL,state TEXT NOT NULL);
    """)
    return db


def watch_receipts(path):
    """Linux filesystem events wake observation; heartbeat catches missed events."""
    libc = ctypes.CDLL(None, use_errno=True)
    fd = libc.inotify_init1(os.O_NONBLOCK | os.O_CLOEXEC)
    if fd < 0:
        return None
    if libc.inotify_add_watch(fd, os.fsencode(path), 0x00000100 | 0x00000080 | 0x00000200) < 0:
        os.close(fd)
        return None
    return fd


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--state", type=Path, default=Path("/var/lib/civiclenz/hermes-prime/operations.sqlite3"))
    parser.add_argument("--spool", type=Path, default=Path("/var/lib/civiclenz/hermes-ingest"))
    parser.add_argument("--health", action="store_true")
    args = parser.parse_args()
    if args.health:
        with sqlite3.connect(f"file:{args.state}?mode=ro", uri=True) as db:
            row = db.execute("SELECT observed_at FROM observations ORDER BY id DESC LIMIT 1").fetchone()
        healthy = bool(row and 0 <= time.time() - row[0] < 90)
        print(json.dumps({"healthy": healthy, "mode": "OBSERVATION_NO_DISPATCH"}))
        raise SystemExit(0 if healthy else 1)
    os.umask(0o077)
    args.state.parent.mkdir(parents=True, exist_ok=True)
    db = database(args.state)
    running = True

    def stop(*_):
        nonlocal running
        running = False

    signal.signal(signal.SIGTERM, stop)
    signal.signal(signal.SIGINT, stop)
    fd = watch_receipts(args.spool / "receipts")
    trigger = "STARTUP"
    try:
        while running:
            persist(db, observe(args.spool), trigger)
            # Bound event bursts to one observation per second; no payloads are read.
            time.sleep(1)
            ready, _, _ = select.select([fd] if fd is not None else [], [], [], 29)
            trigger = "RECEIPT_EVENT" if ready else "HEARTBEAT"
            if ready:
                os.read(fd, 65536)
    finally:
        if fd is not None:
            os.close(fd)
        db.close()


if __name__ == "__main__":
    main()

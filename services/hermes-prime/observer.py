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
import validation_telemetry

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
            "reasons": reasons, "dispatch_enabled": not reasons,
            "dispatch_limit": 0 if reasons else 1}


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
    allowance = governor(measured["memory_available_bytes"], measured["disk_free_bytes"],
                         measured["load_one_minute"], measured["cpus"])
    allowance["resource_dispatch_allowance"] = allowance["dispatch_limit"]
    if os.environ.get("HERMES_CONTRACT_DISPATCH") != "true":
        allowance.update(dispatch_enabled=False, dispatch_limit=0)
    receipts = spool / "receipts"
    count = sum(1 for p in receipts.iterdir() if p.is_file() and p.suffix == ".json") if receipts.exists() else 0
    validation = validation_telemetry.observe()
    receipt_dispatch_enabled = os.environ.get("HERMES_PRODUCER_RECEIPT_DISPATCH") == "true"
    return {"version": VERSION, "mode": "OBSERVATION_NO_DISPATCH",
            "observed_at": time.time(), "resources": measured,
            "governor": allowance,
            "services": {name: service_state(name) for name in SERVICES},
            "receiver_health": local_receiver_health(), "local_receipt_files": count,
            "canonical_dispatch": ("RECEIPT_DISPATCH_ENABLED_PENDING_TICK"
                                   if receipt_dispatch_enabled else "NOT_IMPLEMENTED"),
            "canonical_work_ledger": ("EXISTING_HERMES_LEDGER_PENDING_RECEIPT_HANDOFF"
                                      if receipt_dispatch_enabled else "NOT_IMPLEMENTED"),
            "civic_validation": validation["state"], "validation_telemetry": validation}


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
            row = db.execute("SELECT observed_at,snapshot FROM observations ORDER BY id DESC LIMIT 1").fetchone()
        healthy = bool(row and 0 <= time.time() - row[0] < 90)
        mode = json.loads(row[1]).get("mode", "UNKNOWN") if row else "UNKNOWN"
        print(json.dumps({"healthy": healthy, "mode": mode}))
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
    planning_enabled = os.environ.get("HERMES_PLAN_GAPS") == "true"
    inventory_enabled = os.environ.get("HERMES_BACKLOG_INVENTORY") == "true"
    inventory = {"state": "DISABLED"}
    next_inventory = 0.0
    next_planning = 0.0
    planning = {"state": "DISABLED"}
    try:
        while running:
            if planning_enabled and time.monotonic() >= next_planning:
                try:
                    from gap_planner import reconcile
                    planning = reconcile()
                except Exception:
                    # Never expose driver errors or connection strings in telemetry.
                    planning = {"state": "PLANNING_FAILED", "observed_at": time.time()}
                next_planning = time.monotonic() + 300
            if inventory_enabled and time.monotonic() >= next_inventory:
                try:
                    from backlog_inventory import reconcile as inventory_reconcile
                    inventory = inventory_reconcile()
                except Exception:
                    inventory = {"state": "INVENTORY_FAILED", "observed_at": time.time()}
                next_inventory = time.monotonic() + 300
            snapshot = observe(args.spool)
            snapshot["backlog_inventory"] = inventory
            receipt_dispatch_enabled = os.environ.get("HERMES_PRODUCER_RECEIPT_DISPATCH") == "true"
            receipt_consumed_allowance = False
            if receipt_dispatch_enabled:
                try:
                    from producer_receipt_dispatch import tick as producer_receipt_tick
                    snapshot["producer_receipt_dispatch"] = producer_receipt_tick(args.spool, snapshot["governor"])
                    receipt_state = snapshot["producer_receipt_dispatch"]["state"]
                    snapshot["canonical_dispatch"] = receipt_state
                    if receipt_state == "RECEIPT_CANONICAL_HANDOFF_PROVEN_VALIDATION_WORKER_GAP":
                        snapshot["canonical_work_ledger"] = "RECEIPT_HANDOFF_DURABLE_VALIDATION_WORKER_GAP"
                    elif receipt_state in ("RECEIPT_DISPATCH_FAILED_RECOVERABLE", "RECEIPT_REJECTED_FAIL_CLOSED",
                                           "CANONICAL_COMMITTED_RECEIPT_TRANSITION_PENDING"):
                        snapshot["canonical_work_ledger"] = "RECEIPT_HANDOFF_REQUIRES_RECOVERY"
                    receipt_consumed_allowance = bool(
                        snapshot["producer_receipt_dispatch"].get("eligible_receipts_observed", 0))
                except Exception:
                    snapshot["producer_receipt_dispatch"] = {"state": "RECEIPT_DISPATCH_TICK_FAILED"}
                    snapshot["canonical_dispatch"] = "RECEIPT_DISPATCH_TICK_FAILED"
                    snapshot["canonical_work_ledger"] = "RECEIPT_HANDOFF_REQUIRES_RECOVERY"
            if os.environ.get("HERMES_ROUTE_CONTRACTS") == "true":
                try:
                    from contract_dispatcher import tick
                    contract_governor = dict(snapshot["governor"])
                    if receipt_consumed_allowance:
                        contract_governor.update(dispatch_enabled=False, dispatch_limit=0)
                        snapshot["governor"]["receipt_dispatch_consumed_allowance"] = 1
                    snapshot["contract_dispatch"] = tick(contract_governor)
                    if not receipt_dispatch_enabled:
                        snapshot["canonical_dispatch"] = snapshot["contract_dispatch"]["state"]
                    if snapshot["contract_dispatch"]["state"] in ("DISPATCH_GATED", "BOUNDED_CANARY_BUDGET"):
                        snapshot["governor"].update(dispatch_enabled=False, dispatch_limit=0)
                except Exception:
                    if not receipt_dispatch_enabled:
                        snapshot["canonical_dispatch"] = "DISPATCH_TICK_FAILED"
                    snapshot["governor"].update(dispatch_enabled=False, dispatch_limit=0)
            if planning_enabled:
                snapshot["mode"] = "OBSERVATION_AND_GAP_PLANNING_NO_DISPATCH"
                snapshot["canonical_work_ledger"] = "PARTIAL"
                snapshot["gap_detector"] = planning
            if os.environ.get("HERMES_ROUTE_CONTRACTS") == "true":
                snapshot["mode"] = ("GAP_PLANNING_AND_BOUNDED_CONTRACT_ROUTING"
                                    if planning_enabled else "BOUNDED_CONTRACT_ROUTING")
            if receipt_dispatch_enabled:
                snapshot["mode"] += "_AND_PRODUCER_RECEIPT_HANDOFF"
            persist(db, snapshot, trigger)
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

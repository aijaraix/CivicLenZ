#!/usr/bin/env python3
"""Run an allowlisted CivicLenZ collection worker on existing hardware.

The worker polls the free control plane, leases one job, executes only a repository-
defined collector command, reports progress, and returns a compact result. Remote
job payloads are never interpreted as commands or filesystem paths.
"""

from __future__ import annotations

import argparse
import json
import os
import platform
import socket
import subprocess
import sys
import threading
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import requests

ROOT = Path(__file__).resolve().parents[2]
DEFAULT_REGISTRY = ROOT / "workers" / "orchestration" / "worker-registry.json"
MAX_LOG_CHARS = 20_000


@dataclass(frozen=True)
class Collector:
    key: str
    task_type: str
    command: tuple[str, ...]
    timeout_seconds: int
    output_roots: tuple[str, ...]
    validation_commands: tuple[tuple[str, ...], ...]


def load_collectors(path: Path) -> dict[str, Collector]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    raw_collectors = payload.get("collectors")
    if not isinstance(raw_collectors, dict) or not raw_collectors:
        raise ValueError("Worker registry must contain a non-empty collectors object")

    collectors: dict[str, Collector] = {}
    for key, value in raw_collectors.items():
        if not isinstance(value, dict):
            raise ValueError(f"Collector {key!r} must be an object")
        task_type = str(value.get("taskType", "")).strip()
        command = value.get("command")
        if not task_type or not isinstance(command, list) or not command:
            raise ValueError(f"Collector {key!r} requires taskType and command")
        command_tuple = tuple(str(part) for part in command)
        if any(not part or "\x00" in part for part in command_tuple):
            raise ValueError(f"Collector {key!r} contains an invalid command argument")
        timeout = int(value.get("timeoutSeconds", 1800))
        if timeout < 30 or timeout > 86_400:
            raise ValueError(f"Collector {key!r} timeout must be between 30 and 86400 seconds")
        roots = tuple(str(item) for item in value.get("outputRoots", []))
        for root in roots:
            resolved = (ROOT / root).resolve()
            if ROOT not in resolved.parents and resolved != ROOT:
                raise ValueError(f"Collector {key!r} output root escapes repository: {root}")
        validations_raw = value.get("validationCommands", [])
        if not isinstance(validations_raw, list):
            raise ValueError(f"Collector {key!r} validationCommands must be a list")
        validations = tuple(tuple(str(part) for part in item) for item in validations_raw)
        if any(not command for command in validations):
            raise ValueError(f"Collector {key!r} contains an empty validation command")
        collectors[str(key)] = Collector(
            key=str(key),
            task_type=task_type,
            command=command_tuple,
            timeout_seconds=timeout,
            output_roots=roots,
            validation_commands=validations,
        )
    return collectors


def clip(value: str) -> str:
    return value[-MAX_LOG_CHARS:]


def api_request(
    method: str,
    base_url: str,
    token: str,
    path: str,
    payload: dict[str, Any] | None = None,
    timeout: int = 60,
) -> dict[str, Any]:
    response = requests.request(
        method,
        f"{base_url.rstrip('/')}{path}",
        headers={
            "authorization": f"Bearer {token}",
            "content-type": "application/json",
            "user-agent": "CivicLenZ-self-hosted-worker/0.1",
        },
        json=payload,
        timeout=timeout,
    )
    response.raise_for_status()
    data = response.json()
    if not isinstance(data, dict):
        raise RuntimeError(f"Control-plane response for {path} was not an object")
    return data


def run_command(command: tuple[str, ...], timeout_seconds: int) -> dict[str, Any]:
    started = time.monotonic()
    completed = subprocess.run(
        command,
        cwd=ROOT,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        timeout=timeout_seconds,
        check=False,
        env={**os.environ, "PYTHONUNBUFFERED": "1"},
    )
    return {
        "command": list(command),
        "exitCode": completed.returncode,
        "durationSeconds": round(time.monotonic() - started, 3),
        "stdoutTail": clip(completed.stdout),
        "stderrTail": clip(completed.stderr),
    }


def changed_paths(output_roots: tuple[str, ...]) -> list[str]:
    if not output_roots:
        return []
    command = ["git", "status", "--porcelain", "--untracked-files=all", "--", *output_roots]
    result = subprocess.run(
        command,
        cwd=ROOT,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        timeout=60,
        check=False,
    )
    if result.returncode != 0:
        return []
    paths: list[str] = []
    for line in result.stdout.splitlines():
        if len(line) > 3:
            paths.append(line[3:].strip())
    return sorted(set(paths))[:10_000]


def output_summary(output_roots: tuple[str, ...]) -> dict[str, Any]:
    file_count = 0
    byte_count = 0
    existing_roots: list[str] = []
    for relative in output_roots:
        path = ROOT / relative
        if path.is_file():
            existing_roots.append(relative)
            file_count += 1
            byte_count += path.stat().st_size
        elif path.is_dir():
            existing_roots.append(relative)
            for child in path.rglob("*"):
                if child.is_file():
                    file_count += 1
                    byte_count += child.stat().st_size
    return {
        "declaredRoots": list(output_roots),
        "existingRoots": existing_roots,
        "fileCount": file_count,
        "byteCount": byte_count,
        "changedPaths": changed_paths(output_roots),
    }


class LeaseHeartbeat:
    def __init__(self, base_url: str, token: str, worker_id: str, job_id: int, interval: int):
        self.base_url = base_url
        self.token = token
        self.worker_id = worker_id
        self.job_id = job_id
        self.interval = max(30, interval)
        self.stop_event = threading.Event()
        self.thread = threading.Thread(target=self._run, daemon=True)

    def start(self) -> None:
        self.thread.start()

    def stop(self) -> None:
        self.stop_event.set()
        self.thread.join(timeout=5)

    def _run(self) -> None:
        while not self.stop_event.wait(self.interval):
            try:
                api_request(
                    "POST",
                    self.base_url,
                    self.token,
                    f"/jobs/{self.job_id}/heartbeat",
                    {"workerId": self.worker_id, "leaseSeconds": self.interval * 3},
                )
            except Exception as exc:
                print(f"Lease heartbeat failed for job {self.job_id}: {exc}", file=sys.stderr)


def execute_job(
    base_url: str,
    token: str,
    worker_id: str,
    job: dict[str, Any],
    collectors: dict[str, Collector],
    heartbeat_seconds: int,
) -> None:
    job_id = int(job["id"])
    collector_key = str(job.get("collectorKey") or "")
    task_type = str(job.get("taskType") or "")
    collector = collectors.get(collector_key)
    if collector is None:
        api_request(
            "POST",
            base_url,
            token,
            f"/jobs/{job_id}/fail",
            {"workerId": worker_id, "error": f"unknown_collector_key:{collector_key}"},
        )
        return
    if collector.task_type != task_type:
        api_request(
            "POST",
            base_url,
            token,
            f"/jobs/{job_id}/fail",
            {
                "workerId": worker_id,
                "error": f"task_type_mismatch:{task_type}:{collector.task_type}",
            },
        )
        return

    heartbeat = LeaseHeartbeat(base_url, token, worker_id, job_id, heartbeat_seconds)
    heartbeat.start()
    started_at = time.time()
    try:
        primary = run_command(collector.command, collector.timeout_seconds)
        validations: list[dict[str, Any]] = []
        success = primary["exitCode"] == 0
        if success:
            for validation_command in collector.validation_commands:
                validation = run_command(validation_command, min(collector.timeout_seconds, 1800))
                validations.append(validation)
                if validation["exitCode"] != 0:
                    success = False
                    break

        result = {
            "collectorKey": collector.key,
            "taskType": collector.task_type,
            "startedAtEpoch": int(started_at),
            "completedAtEpoch": int(time.time()),
            "primary": primary,
            "validations": validations,
            "outputs": output_summary(collector.output_roots),
        }
        if success:
            api_request(
                "POST",
                base_url,
                token,
                f"/jobs/{job_id}/complete",
                {"workerId": worker_id, "result": result},
            )
        else:
            error = primary.get("stderrTail") or primary.get("stdoutTail") or "collector_failed"
            api_request(
                "POST",
                base_url,
                token,
                f"/jobs/{job_id}/fail",
                {"workerId": worker_id, "error": clip(str(error))},
            )
    except subprocess.TimeoutExpired as exc:
        api_request(
            "POST",
            base_url,
            token,
            f"/jobs/{job_id}/fail",
            {"workerId": worker_id, "error": f"collector_timeout:{exc.timeout}"},
        )
    except Exception as exc:
        try:
            api_request(
                "POST",
                base_url,
                token,
                f"/jobs/{job_id}/fail",
                {"workerId": worker_id, "error": f"worker_exception:{type(exc).__name__}:{exc}"},
            )
        except Exception as reporting_error:
            print(f"Could not report job {job_id} failure: {reporting_error}", file=sys.stderr)
        raise
    finally:
        heartbeat.stop()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--control-url", default=os.getenv("CIVICLENZ_CONTROL_URL"))
    parser.add_argument("--token", default=os.getenv("CIVICLENZ_CONTROL_TOKEN"))
    parser.add_argument(
        "--worker-id",
        default=os.getenv("CIVICLENZ_WORKER_ID") or f"{socket.gethostname()}-{os.getpid()}",
    )
    parser.add_argument("--registry", type=Path, default=DEFAULT_REGISTRY)
    parser.add_argument("--region", default=os.getenv("CIVICLENZ_WORKER_REGION"))
    parser.add_argument("--poll-seconds", type=int, default=20)
    parser.add_argument("--heartbeat-seconds", type=int, default=60)
    parser.add_argument("--once", action="store_true")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    if not args.control_url or not args.token:
        raise SystemExit("CIVICLENZ_CONTROL_URL and CIVICLENZ_CONTROL_TOKEN are required")
    collectors = load_collectors(args.registry.resolve())
    capabilities = sorted({collector.task_type for collector in collectors.values()})

    api_request(
        "POST",
        args.control_url,
        args.token,
        "/workers/heartbeat",
        {
            "workerId": args.worker_id,
            "capabilities": capabilities,
            "region": args.region,
            "hostName": socket.gethostname(),
            "version": "0.1.0",
            "state": "online",
            "metadata": {
                "platform": platform.platform(),
                "python": platform.python_version(),
                "collectorKeys": sorted(collectors),
            },
        },
    )

    while True:
        claim = api_request(
            "POST",
            args.control_url,
            args.token,
            "/jobs/claim",
            {
                "workerId": args.worker_id,
                "capabilities": capabilities,
                "region": args.region,
                "limit": 1,
                "leaseSeconds": args.heartbeat_seconds * 3,
            },
        )
        jobs = claim.get("jobs")
        if isinstance(jobs, list) and jobs:
            execute_job(
                args.control_url,
                args.token,
                args.worker_id,
                jobs[0],
                collectors,
                args.heartbeat_seconds,
            )
        elif args.once:
            return 0
        else:
            time.sleep(max(5, args.poll_seconds))

        if args.once:
            return 0


if __name__ == "__main__":
    raise SystemExit(main())

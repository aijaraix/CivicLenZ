from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from workers.orchestration.run_worker import Collector, load_collectors, output_summary, run_command


class OrchestrationWorkerTests(unittest.TestCase):
    def test_loads_repository_registry(self):
        registry = Path("workers/orchestration/worker-registry.json")
        collectors = load_collectors(registry.resolve())
        self.assertIn("florida-baseline", collectors)
        self.assertIn("legacy-dataset-inventory", collectors)
        self.assertEqual(collectors["florida-baseline"].task_type, "static-http")
        self.assertGreaterEqual(collectors["florida-baseline"].timeout_seconds, 30)

    def test_rejects_output_path_escape(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "registry.json"
            path.write_text(
                json.dumps(
                    {
                        "collectors": {
                            "bad": {
                                "taskType": "static-http",
                                "command": ["python", "example.py"],
                                "timeoutSeconds": 60,
                                "outputRoots": ["../../outside"],
                                "validationCommands": [],
                            }
                        }
                    }
                ),
                encoding="utf-8",
            )
            with self.assertRaises(ValueError):
                load_collectors(path)

    def test_rejects_remote_or_empty_command_shape(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "registry.json"
            path.write_text(
                json.dumps(
                    {
                        "collectors": {
                            "bad": {
                                "taskType": "static-http",
                                "command": [],
                                "outputRoots": [],
                            }
                        }
                    }
                ),
                encoding="utf-8",
            )
            with self.assertRaises(ValueError):
                load_collectors(path)

    def test_run_command_does_not_use_shell(self):
        result = run_command(
            ("python", "-c", "print('safe worker')"),
            timeout_seconds=30,
        )
        self.assertEqual(result["exitCode"], 0)
        self.assertIn("safe worker", result["stdoutTail"])

    @patch("workers.orchestration.run_worker.changed_paths", return_value=["artifacts/example.json"])
    def test_output_summary_counts_files(self, _changed_paths):
        with tempfile.TemporaryDirectory() as directory:
            # output_summary resolves paths from repository root, so use a temporary
            # collector object only to verify its immutable shape here.
            collector = Collector(
                key="example",
                task_type="local-inventory",
                command=("python", "example.py"),
                timeout_seconds=60,
                output_roots=(),
                validation_commands=(),
            )
            self.assertEqual(collector.output_roots, ())
            summary = output_summary(collector.output_roots)
            self.assertEqual(summary["fileCount"], 0)
            self.assertEqual(summary["byteCount"], 0)


if __name__ == "__main__":
    unittest.main()

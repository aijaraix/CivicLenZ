import { readFile } from "node:fs/promises";
import path from "node:path";
import { loadBridgeSecret } from "./auth.ts";

import { createHermesIngestServer } from "./server.ts";
import type { ProducerRegistry, ReceiverConfig } from "./types.ts";

function requiredEnvironment(name: string): string {
  const value = process.env[name];
  if (!value || value.trim().length === 0) throw new Error(`${name} is required`);
  return value;
}

function boundedInteger(name: string, fallback: number, minimum: number, maximum: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < minimum || parsed > maximum) throw new Error(`${name} must be an integer from ${minimum} to ${maximum}`);
  return parsed;
}

async function loadRegistry(file: string): Promise<ProducerRegistry> {
  const parsed = JSON.parse(await readFile(file, "utf8")) as ProducerRegistry;
  if (!parsed || !Array.isArray(parsed.producers)) throw new Error("producer registry is invalid");
  return parsed;
}

async function main(): Promise<void> {
  const registryPath = process.env.HERMES_INGEST_PRODUCER_REGISTRY ?? path.join(process.cwd(), "config/producers/registry.json");
  const config: ReceiverConfig = {
    bindHost: process.env.HERMES_INGEST_BIND_HOST ?? "127.0.0.1",
    port: boundedInteger("HERMES_INGEST_PORT", 8788, 1, 65535),
    maxBodyBytes: boundedInteger("HERMES_INGEST_MAX_BODY_BYTES", 20 * 1024 * 1024, 1024, 64 * 1024 * 1024),
    maxPendingReceipts: boundedInteger("HERMES_INGEST_MAX_PENDING_RECEIPTS", 1000, 1, 100_000),
    retryAfterSeconds: boundedInteger("HERMES_INGEST_RETRY_AFTER_SECONDS", 60, 1, 3600),
    maxClockSkewMs: boundedInteger("HERMES_INGEST_MAX_CLOCK_SKEW_MS", 5 * 60 * 1000, 10_000, 60 * 60 * 1000),
    spoolDirectory: process.env.HERMES_INGEST_SPOOL_DIRECTORY ?? "/var/lib/civiclenz/hermes-ingest",
    bridgeSecret: loadBridgeSecret(requiredEnvironment("CIVICLENZ_HARVESTER_SHARED_SECRET")),
    intakePaused: process.env.HERMES_INGEST_INTAKE_PAUSED === "true",
    registry: await loadRegistry(registryPath),
  };
  if (config.bindHost !== "127.0.0.1" && config.bindHost !== "::1") {
    throw new Error("HERMES_INGEST_BIND_HOST must remain loopback-only until an approved HTTPS gateway is deployed");
  }
  const { server } = await createHermesIngestServer(config);
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(config.port, config.bindHost, () => {
      server.off("error", reject);
      resolve();
    });
  });
  const shutdown = () => server.close(() => process.exit(0));
  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "failed to start";
  process.stderr.write(`civiclenz-hermes-ingest: ${message}\n`);
  process.exitCode = 1;
});

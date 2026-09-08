import { createHash, randomUUID } from "node:crypto";
import { link, mkdir, open, readdir, readFile, rename, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

import { sha256Hex } from "./contract.ts";
import type {
  BridgeTelemetry,
  BridgeTelemetryOutcome,
  PersistedBridgeTelemetry,
  ResearchIngestEnvelope,
  SpoolAcceptResult,
  StoredEvidenceArtifact,
  StoredReceipt,
} from "./types.ts";

type JobIndex = {
  receipt_id: string;
  result_content_hash: string;
};

type PreparedEvidence = {
  artifact: StoredEvidenceArtifact;
  bytes?: Buffer;
};

const LOCK_STALE_MS = 60_000;

function hashText(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function jsonBuffer(value: unknown): Buffer {
  return Buffer.from(`${JSON.stringify(value)}\n`, "utf8");
}

function isNodeError(error: unknown, code: string): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === code;
}

async function fsyncDirectory(directory: string): Promise<void> {
  const handle = await open(directory, "r");
  try {
    await handle.sync();
  } finally {
    await handle.close();
  }
}

async function writeAtomic(target: string, bytes: Buffer, mode = 0o600): Promise<void> {
  const directory = path.dirname(target);
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const temporary = path.join(directory, `.${path.basename(target)}.${process.pid}.${randomUUID()}.tmp`);
  const handle = await open(temporary, "wx", mode);
  try {
    await handle.writeFile(bytes);
    await handle.sync();
  } finally {
    await handle.close();
  }
  await rename(temporary, target);
  await fsyncDirectory(directory);
}

async function writeIfAbsent(target: string, bytes: Buffer, mode = 0o600): Promise<boolean> {
  const directory = path.dirname(target);
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const temporary = path.join(directory, `.${path.basename(target)}.${process.pid}.${randomUUID()}.tmp`);
  const handle = await open(temporary, "wx", mode);
  try {
    await handle.writeFile(bytes);
    await handle.sync();
  } finally {
    await handle.close();
  }
  try {
    await link(temporary, target);
    await fsyncDirectory(directory);
    return true;
  } catch (error) {
    if (isNodeError(error, "EEXIST")) return false;
    throw error;
  } finally {
    await unlink(temporary).catch(() => undefined);
  }
}

async function readJson<T>(file: string): Promise<T | undefined> {
  try {
    return JSON.parse(await readFile(file, "utf8")) as T;
  } catch (error) {
    if (isNodeError(error, "ENOENT")) return undefined;
    throw error;
  }
}

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export class DurableIntakeSpool {
  readonly directory: string;
  private readonly maxPendingReceipts: number;
  private readonly receiptsDirectory: string;
  private readonly evidenceDirectory: string;
  private readonly jobsDirectory: string;
  private readonly locksDirectory: string;
  private readonly quarantineDirectory: string;
  private readonly telemetryPath: string;
  private initialized = false;
  private telemetryMutation: Promise<void> = Promise.resolve();

  constructor(directory: string, maxPendingReceipts: number) {
    this.directory = directory;
    this.maxPendingReceipts = maxPendingReceipts;
    this.receiptsDirectory = path.join(directory, "receipts");
    this.evidenceDirectory = path.join(directory, "evidence");
    this.jobsDirectory = path.join(directory, "jobs");
    this.locksDirectory = path.join(directory, "locks");
    this.quarantineDirectory = path.join(directory, "quarantine");
    this.telemetryPath = path.join(directory, "telemetry.json");
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;
    await Promise.all(
      [this.directory, this.receiptsDirectory, this.evidenceDirectory, this.jobsDirectory, this.locksDirectory, this.quarantineDirectory].map(
        (directory) => mkdir(directory, { recursive: true, mode: 0o700 }),
      ),
    );
    await this.recoverIndexes();
    this.initialized = true;
  }

  private receiptPath(receiptId: string): string {
    return path.join(this.receiptsDirectory, `${receiptId}.json`);
  }

  private jobKey(producerId: string, jobId: string): string {
    return hashText(`${producerId}\n${jobId}`);
  }

  private idempotencyKey(producerId: string, jobId: string, resultContentHash: string): string {
    return hashText(`${producerId}\n${jobId}\n${resultContentHash}`);
  }

  private jobIndexPath(producerId: string, jobId: string): string {
    return path.join(this.jobsDirectory, `${this.jobKey(producerId, jobId)}.json`);
  }

  private async recoverIndexes(): Promise<void> {
    const entries = await readdir(this.receiptsDirectory, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith(".json")) continue;
      const receipt = await readJson<StoredReceipt>(path.join(this.receiptsDirectory, entry.name));
      if (!receipt?.producer_id || !receipt.job_id || !receipt.receipt_id || !receipt.result_content_hash) continue;
      const indexPath = this.jobIndexPath(receipt.producer_id, receipt.job_id);
      const existing = await readJson<JobIndex>(indexPath);
      if (!existing) {
        await writeIfAbsent(indexPath, jsonBuffer({ receipt_id: receipt.receipt_id, result_content_hash: receipt.result_content_hash }));
      }
    }
  }

  private emptyTelemetry(): PersistedBridgeTelemetry {
    return {
      telemetry_version: "CIVICLENZ_HARVESTER_TELEMETRY_V1",
      authentication_successes: 0,
      authentication_failures: 0,
      submissions: 0,
      accepted_for_validation: 0,
      duplicates: 0,
      schema_rejects: 0,
      policy_rejects: 0,
      hash_mismatches: 0,
      identity_resolution_requirements: 0,
      partially_accepted: 0,
      retry_later: 0,
      canonical_conflicts: 0,
      producer_versions: {},
      observed_contract_versions: {},
    };
  }

  private async readTelemetry(): Promise<PersistedBridgeTelemetry> {
    return (await readJson<PersistedBridgeTelemetry>(this.telemetryPath)) ?? this.emptyTelemetry();
  }

  async recordOutcome(
    outcome: BridgeTelemetryOutcome,
    details: { producer_id?: string; producer_version?: string; contract_version?: string } = {},
  ): Promise<void> {
    await this.initialize();
    const mutation = this.telemetryMutation.then(async () => {
      const telemetry = await this.readTelemetry();
      telemetry.last_harvester_contact_at = new Date().toISOString();
      if (outcome === "authentication_success" || outcome === "authentication_failure") telemetry.submissions += 1;
      if (details.producer_id && details.producer_version) telemetry.producer_versions[details.producer_id] = details.producer_version;
      if (details.contract_version) {
        telemetry.observed_contract_versions[details.contract_version] = (telemetry.observed_contract_versions[details.contract_version] ?? 0) + 1;
      }
      switch (outcome) {
        case "authentication_success":
          telemetry.authentication_successes += 1;
          break;
        case "authentication_failure":
          telemetry.authentication_failures += 1;
          break;
        case "accepted_for_validation":
          telemetry.accepted_for_validation += 1;
          break;
        case "duplicate":
          telemetry.duplicates += 1;
          break;
        case "schema_reject":
          telemetry.schema_rejects += 1;
          break;
        case "policy_reject":
          telemetry.policy_rejects += 1;
          break;
        case "hash_mismatch":
          telemetry.hash_mismatches += 1;
          break;
        case "identity_resolution_requirement":
          telemetry.identity_resolution_requirements += 1;
          break;
        case "partially_accepted":
          telemetry.partially_accepted += 1;
          break;
        case "retry_later":
          telemetry.retry_later += 1;
          break;
        case "canonical_conflict":
          telemetry.canonical_conflicts += 1;
          break;
      }
      await writeAtomic(this.telemetryPath, jsonBuffer(telemetry));
    });
    this.telemetryMutation = mutation.catch(() => undefined);
    return mutation;
  }

  private async withJobLock<T>(producerId: string, jobId: string, action: () => Promise<T>): Promise<T> {
    const lockPath = path.join(this.locksDirectory, `${this.jobKey(producerId, jobId)}.lock`);
    for (let attempt = 0; attempt < 50; attempt += 1) {
      try {
        await writeFile(lockPath, `${process.pid}\n${Date.now()}\n`, { encoding: "utf8", mode: 0o600, flag: "wx" });
        try {
          return await action();
        } finally {
          await unlink(lockPath).catch(() => undefined);
        }
      } catch (error) {
        if (!isNodeError(error, "EEXIST")) throw error;
        const lockStat = await stat(lockPath).catch(() => undefined);
        if (lockStat && Date.now() - lockStat.mtimeMs > LOCK_STALE_MS) {
          await unlink(lockPath).catch(() => undefined);
          continue;
        }
        await sleep(10);
      }
    }
    throw new Error("intake lock is saturated");
  }

  private async prepareEvidence(envelope: ResearchIngestEnvelope, resultContentHash: string): Promise<
    | { ok: true; artifacts: PreparedEvidence[] }
    | { ok: false; evidenceKeys: string[] }
  > {
    const prepared: PreparedEvidence[] = [];
    const mismatches: Array<{ evidenceKey: string; bytes: Buffer; declaredHash: string; actualHash: string }> = [];
    for (const evidence of envelope.evidence) {
      if (!evidence.content_base64) {
        prepared.push({
          artifact: {
            evidence_key: evidence.evidence_key,
            declared_sha256: evidence.sha256,
            byte_length: evidence.byte_length,
            integrity_state: "METADATA_ONLY",
          },
        });
        continue;
      }
      const bytes = Buffer.from(evidence.content_base64, "base64");
      const actualHash = sha256Hex(bytes);
      if (actualHash !== evidence.sha256 || bytes.byteLength !== evidence.byte_length) {
        mismatches.push({ evidenceKey: evidence.evidence_key, bytes, declaredHash: evidence.sha256, actualHash });
        continue;
      }
      prepared.push({
        artifact: {
          evidence_key: evidence.evidence_key,
          declared_sha256: evidence.sha256,
          actual_sha256: actualHash,
          byte_length: bytes.byteLength,
          integrity_state: "MATCH",
          local_spool_path: path.posix.join("evidence", `${actualHash}.bin`),
        },
        bytes,
      });
    }
    if (mismatches.length > 0) {
      for (const mismatch of mismatches) {
        const prefix = `${resultContentHash}.${mismatch.evidenceKey.replace(/[^A-Za-z0-9._-]/g, "_")}`;
        await writeAtomic(path.join(this.quarantineDirectory, `${prefix}.bin`), mismatch.bytes);
        await writeAtomic(
          path.join(this.quarantineDirectory, `${prefix}.json`),
          jsonBuffer({
            evidence_key: mismatch.evidenceKey,
            declared_sha256: mismatch.declaredHash,
            actual_sha256: mismatch.actualHash,
            quarantined_at: new Date().toISOString(),
          }),
        );
      }
      return { ok: false, evidenceKeys: mismatches.map((mismatch) => mismatch.evidenceKey) };
    }
    return { ok: true, artifacts: prepared };
  }

  private async storeEvidence(prepared: PreparedEvidence[]): Promise<StoredEvidenceArtifact[]> {
    for (const evidence of prepared) {
      if (evidence.bytes && evidence.artifact.actual_sha256) {
        await writeIfAbsent(path.join(this.evidenceDirectory, `${evidence.artifact.actual_sha256}.bin`), evidence.bytes);
      }
    }
    return prepared.map((evidence) => evidence.artifact);
  }

  async pendingReceiptCount(): Promise<number> {
    await this.initialize();
    const entries = await readdir(this.receiptsDirectory, { withFileTypes: true });
    let count = 0;
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith(".json")) continue;
      const receipt = await readJson<StoredReceipt>(path.join(this.receiptsDirectory, entry.name));
      if (receipt?.dispatch_state === "PENDING_CANONICAL_DISPATCH" || receipt?.dispatch_state === "DISPATCH_FAILED") count += 1;
    }
    return count;
  }

  async accept(envelope: ResearchIngestEnvelope, rawBody: Buffer, acknowledgementState: StoredReceipt["acknowledgement_state"]): Promise<SpoolAcceptResult> {
    await this.initialize();
    const resultContentHash = sha256Hex(rawBody);
    const producerId = envelope.producer.producer_id;
    const jobId = envelope.job.job_id;
    return this.withJobLock(producerId, jobId, async () => {
      const indexPath = this.jobIndexPath(producerId, jobId);
      const existingIndex = await readJson<JobIndex>(indexPath);
      if (existingIndex) {
        const existingReceipt = await readJson<StoredReceipt>(this.receiptPath(existingIndex.receipt_id));
        if (!existingReceipt) throw new Error("intake job index references a missing receipt");
        return existingIndex.result_content_hash === resultContentHash
          ? { kind: "duplicate", receipt: existingReceipt }
          : { kind: "conflict", receipt: existingReceipt };
      }
      if ((await this.pendingReceiptCount()) >= this.maxPendingReceipts) return { kind: "backpressure" };

      const prepared = await this.prepareEvidence(envelope, resultContentHash);
      if (!prepared.ok) return { kind: "hash_mismatch", evidence_keys: prepared.evidenceKeys };
      const artifacts = await this.storeEvidence(prepared.artifacts);
      const receiptId = randomUUID();
      const receipt: StoredReceipt = {
        receipt_version: "CIVICLENZ_HARVESTER_RECEIPT_V1",
        receipt_id: receiptId,
        producer_id: producerId,
        producer_version: envelope.producer.producer_version,
        contract_version: envelope.contract_version,
        job_id: jobId,
        research_work_identity: envelope.job.research_work_identity,
        research_reservation_id: envelope.job.research_reservation?.reservation_id,
        result_content_hash: resultContentHash,
        idempotency_key: this.idempotencyKey(producerId, jobId, resultContentHash),
        received_at: new Date().toISOString(),
        acknowledgement_state: acknowledgementState,
        dispatch_state: "PENDING_CANONICAL_DISPATCH",
        evidence: artifacts,
        envelope,
      };
      await writeAtomic(this.receiptPath(receiptId), jsonBuffer(receipt));
      await writeAtomic(indexPath, jsonBuffer({ receipt_id: receiptId, result_content_hash: resultContentHash }));
      return { kind: "accepted", receipt };
    });
  }

  async getReceipt(receiptId: string): Promise<StoredReceipt | undefined> {
    await this.initialize();
    return readJson<StoredReceipt>(this.receiptPath(receiptId));
  }

  async markDispatched(receiptId: string): Promise<StoredReceipt | undefined> {
    const receipt = await this.getReceipt(receiptId);
    if (!receipt) return undefined;
    const updated: StoredReceipt = { ...receipt, dispatch_state: "DISPATCHED" };
    await writeAtomic(this.receiptPath(receiptId), jsonBuffer(updated));
    return updated;
  }

  async telemetry(knownProducers: Array<{ producer_id: string; active: boolean }>, contractVersions: string[]): Promise<BridgeTelemetry> {
    await this.initialize();
    const receiptEntries = await readdir(this.receiptsDirectory, { withFileTypes: true });
    const quarantineEntries = await readdir(this.quarantineDirectory, { withFileTypes: true });
    const telemetry = await this.readTelemetry();
    return {
      contract_versions: contractVersions,
      known_producers: knownProducers,
      pending_canonical_dispatch: await this.pendingReceiptCount(),
      receipts: receiptEntries.filter((entry) => entry.isFile() && entry.name.endsWith(".json")).length,
      quarantined_evidence: quarantineEntries.filter((entry) => entry.isFile() && entry.name.endsWith(".bin")).length,
      last_harvester_contact_at: telemetry.last_harvester_contact_at,
      authentication_successes: telemetry.authentication_successes,
      authentication_failures: telemetry.authentication_failures,
      submissions: telemetry.submissions,
      accepted_for_validation: telemetry.accepted_for_validation,
      duplicates: telemetry.duplicates,
      schema_rejects: telemetry.schema_rejects,
      policy_rejects: telemetry.policy_rejects,
      hash_mismatches: telemetry.hash_mismatches,
      identity_resolution_requirements: telemetry.identity_resolution_requirements,
      partially_accepted: telemetry.partially_accepted,
      retry_later: telemetry.retry_later,
      canonical_conflicts: telemetry.canonical_conflicts,
      producer_versions: telemetry.producer_versions,
      observed_contract_versions: telemetry.observed_contract_versions,
    };
  }
}

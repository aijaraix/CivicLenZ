import { randomUUID } from "node:crypto";

import { verifyHarvesterAuthentication, type AuthHeaders } from "./auth.ts";
import { isPartialSubmission, requiresIdentityResolution, validateResearchIngestEnvelope } from "./contract.ts";
import { DurableIntakeSpool } from "./spool.ts";
import {
  RESEARCH_INGEST_CONTRACT_VERSION,
  type AcknowledgementState,
  type IntakeAcknowledgement,
  type ProducerDefinition,
  type ReceiverConfig,
  type ReceiverResult,
  type ResearchIngestEnvelope,
  type StoredReceipt,
} from "./types.ts";

function acknowledgement(
  acknowledgementState: AcknowledgementState,
  correlationId: string,
  details: Partial<IntakeAcknowledgement> = {},
): IntakeAcknowledgement {
  return {
    acknowledgement_version: "CIVICLENZ_HARVESTER_ACK_V1",
    acknowledgement_state: acknowledgementState,
    correlation_id: correlationId,
    ...details,
  };
}

function storedReceiptAcknowledgement(
  acknowledgementState: AcknowledgementState,
  correlationId: string,
  receipt: StoredReceipt,
  reasons?: string[],
): IntakeAcknowledgement {
  return acknowledgement(acknowledgementState, correlationId, {
    receipt_id: receipt.receipt_id,
    producer_id: receipt.producer_id,
    job_id: receipt.job_id,
    research_work_identity: receipt.research_work_identity,
    result_content_hash: receipt.result_content_hash,
    reasons,
  });
}

function registeredProducer(config: ReceiverConfig, producerId: string): ProducerDefinition | undefined {
  return config.registry.producers.find((producer) => producer.producer_id === producerId);
}

function policyFailure(producer: ProducerDefinition | undefined, envelope: ResearchIngestEnvelope): string | undefined {
  if (!producer) return "producer_id is not registered";
  if (!producer.active) return "producer is not active";
  if (!producer.allowed_result_contracts.includes(envelope.contract_version)) return "producer is not authorized for this result contract";
  if (producer.direct_canonical_storage_access || producer.canonical_verification_authority || producer.canonical_publication_authority) {
    return "producer manifest violates the canonical authority boundary";
  }
  if (!producer.allowed_capabilities.includes("*") && !producer.allowed_capabilities.includes(envelope.capability)) {
    return "capability is not declared by the producer manifest";
  }
  return undefined;
}

function acknowledgementStateFor(envelope: ResearchIngestEnvelope): StoredReceipt["acknowledgement_state"] {
  if (requiresIdentityResolution(envelope)) return "NEEDS_IDENTITY_RESOLUTION";
  const evidenceWithoutBytes = envelope.evidence.filter((evidence) => evidence.content_base64 === undefined).length;
  if (envelope.evidence.length === 0 || evidenceWithoutBytes === envelope.evidence.length) return "NEEDS_MORE_EVIDENCE";
  if (isPartialSubmission(envelope)) return "PARTIALLY_ACCEPTED";
  return "ACCEPTED_FOR_VALIDATION";
}

export class HermesIngestReceiver {
  readonly config: ReceiverConfig;
  readonly spool: DurableIntakeSpool;

  constructor(config: ReceiverConfig, spool?: DurableIntakeSpool) {
    this.config = config;
    this.spool = spool ?? new DurableIntakeSpool(config.spoolDirectory, config.maxPendingReceipts);
  }

  async initialize(): Promise<void> {
    await this.spool.initialize();
  }

  async handle(headers: AuthHeaders, rawBody: Buffer): Promise<ReceiverResult> {
    const correlationId = randomUUID();
    const authentication = verifyHarvesterAuthentication(headers, rawBody, this.config.bridgeSecret, this.config.maxClockSkewMs);
    if (!authentication.ok) {
      await this.spool.recordOutcome("authentication_failure").catch(() => undefined);
      return {
        statusCode: 401,
        acknowledgement: acknowledgement("REJECTED_POLICY", correlationId, { reasons: ["authentication was not accepted"] }),
      };
    }
    await this.spool.recordOutcome("authentication_success", { producer_id: authentication.producerId }).catch(() => undefined);

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawBody.toString("utf8"));
    } catch {
      await this.spool.recordOutcome("schema_reject").catch(() => undefined);
      return {
        statusCode: 400,
        acknowledgement: acknowledgement("REJECTED_SCHEMA", correlationId, { reasons: ["request body is not valid JSON"] }),
      };
    }

    const validation = validateResearchIngestEnvelope(parsed);
    if (!validation.ok) {
      await this.spool.recordOutcome("schema_reject").catch(() => undefined);
      return {
        statusCode: 400,
        acknowledgement: acknowledgement("REJECTED_SCHEMA", correlationId, { reasons: validation.errors.slice(0, 8) }),
      };
    }
    const envelope = validation.envelope;
    const producer = registeredProducer(this.config, envelope.producer.producer_id);
    const failure = authentication.producerId !== envelope.producer.producer_id ? "authenticated producer does not match payload producer" : policyFailure(producer, envelope);
    if (failure) {
      await this.spool
        .recordOutcome("policy_reject", {
          producer_id: envelope.producer.producer_id,
          producer_version: envelope.producer.producer_version,
          contract_version: envelope.contract_version,
        })
        .catch(() => undefined);
      return {
        statusCode: 403,
        acknowledgement: acknowledgement("REJECTED_POLICY", correlationId, { reasons: [failure] }),
      };
    }

    const requestedAcknowledgement = acknowledgementStateFor(envelope);
    let result;
    try {
      result = await this.spool.accept(envelope, rawBody, requestedAcknowledgement);
    } catch {
      await this.spool
        .recordOutcome("retry_later", {
          producer_id: envelope.producer.producer_id,
          producer_version: envelope.producer.producer_version,
          contract_version: envelope.contract_version,
        })
        .catch(() => undefined);
      return {
        statusCode: 503,
        acknowledgement: acknowledgement("RETRY_LATER", correlationId, {
          retry_after_seconds: this.config.retryAfterSeconds,
          reasons: ["durable intake is temporarily unavailable"],
        }),
      };
    }

    const telemetryDetails = {
      producer_id: envelope.producer.producer_id,
      producer_version: envelope.producer.producer_version,
      contract_version: envelope.contract_version,
    };
    switch (result.kind) {
      case "accepted": {
        const outcome =
          requestedAcknowledgement === "NEEDS_IDENTITY_RESOLUTION"
            ? "identity_resolution_requirement"
            : requestedAcknowledgement === "PARTIALLY_ACCEPTED" || requestedAcknowledgement === "NEEDS_MORE_EVIDENCE"
              ? "partially_accepted"
              : "accepted_for_validation";
        await this.spool.recordOutcome(outcome, telemetryDetails).catch(() => undefined);
        return {
          statusCode: 202,
          acknowledgement: storedReceiptAcknowledgement(requestedAcknowledgement, correlationId, result.receipt),
        };
      }
      case "duplicate":
        await this.spool.recordOutcome("duplicate", telemetryDetails).catch(() => undefined);
        return {
          statusCode: 200,
          acknowledgement: storedReceiptAcknowledgement("DUPLICATE", correlationId, result.receipt),
        };
      case "conflict":
        await this.spool.recordOutcome("canonical_conflict", telemetryDetails).catch(() => undefined);
        return {
          statusCode: 409,
          acknowledgement: storedReceiptAcknowledgement("CANONICAL_CONFLICT", correlationId, result.receipt, [
            "job_id was already accepted with a different result content hash",
          ]),
        };
      case "hash_mismatch":
        await this.spool.recordOutcome("hash_mismatch", telemetryDetails).catch(() => undefined);
        return {
          statusCode: 422,
          acknowledgement: acknowledgement("REJECTED_POLICY", correlationId, {
            producer_id: envelope.producer.producer_id,
            job_id: envelope.job.job_id,
            research_work_identity: envelope.job.research_work_identity,
            reasons: ["evidence content hash or byte length did not match the declared metadata", ...result.evidence_keys.slice(0, 4)],
          }),
        };
      case "backpressure":
        await this.spool.recordOutcome("retry_later", telemetryDetails).catch(() => undefined);
        return {
          statusCode: 429,
          acknowledgement: acknowledgement("RETRY_LATER", correlationId, {
            producer_id: envelope.producer.producer_id,
            job_id: envelope.job.job_id,
            research_work_identity: envelope.job.research_work_identity,
            retry_after_seconds: this.config.retryAfterSeconds,
            reasons: ["canonical intake is at its configured durable pending limit"],
          }),
        };
    }
  }

  async telemetry() {
    return this.spool.telemetry(
      this.config.registry.producers.map((producer) => ({ producer_id: producer.producer_id, active: producer.active })),
      [RESEARCH_INGEST_CONTRACT_VERSION],
    );
  }
}

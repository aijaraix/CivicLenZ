import { randomUUID } from "node:crypto";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";

import { HermesIngestReceiver } from "./receiver.ts";
import type { IntakeAcknowledgement, ReceiverConfig } from "./types.ts";

type RunningReceiverServer = {
  server: Server;
  receiver: HermesIngestReceiver;
};

function isLocalAddress(address: string | undefined): boolean {
  return address === "127.0.0.1" || address === "::1" || address === "::ffff:127.0.0.1";
}

function writeJson(response: ServerResponse, statusCode: number, body: unknown, headers: Record<string, string> = {}): void {
  response.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    ...headers,
  });
  response.end(`${JSON.stringify(body)}\n`);
}

function safeMethodNotAllowed(response: ServerResponse): void {
  writeJson(response, 405, { error: "method_not_allowed" }, { allow: "GET, POST" });
}

function readRequestBody(request: IncomingMessage, maxBodyBytes: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const declaredLength = Number(request.headers["content-length"] ?? 0);
    if (Number.isFinite(declaredLength) && declaredLength > maxBodyBytes) {
      request.resume();
      reject(new Error("body_too_large"));
      return;
    }
    const chunks: Buffer[] = [];
    let total = 0;
    request.on("data", (chunk: Buffer) => {
      total += chunk.byteLength;
      if (total > maxBodyBytes) {
        request.destroy();
        reject(new Error("body_too_large"));
        return;
      }
      chunks.push(Buffer.from(chunk));
    });
    request.on("end", () => resolve(Buffer.concat(chunks)));
    request.on("error", reject);
    request.on("aborted", () => reject(new Error("request_aborted")));
  });
}

function acknowledgementBody(acknowledgement: IntakeAcknowledgement) {
  return { acknowledgement };
}

export async function createHermesIngestServer(config: ReceiverConfig): Promise<RunningReceiverServer> {
  const receiver = new HermesIngestReceiver(config);
  await receiver.initialize();
  const server = createServer(async (request, response) => {
    const requestPath = new URL(request.url ?? "/", "http://localhost").pathname;
    const local = isLocalAddress(request.socket.remoteAddress);
    if ((requestPath === "/health" || requestPath === "/v1/harvester/health") && request.method === "GET") {
      writeJson(response, 200, { status: "ok", receiver: "civiclenz-hermes-ingest" });
      return;
    }
    if ((requestPath === "/v1/harvester/capabilities" || requestPath === "/v1/harvester/bridge/telemetry") && request.method === "GET") {
      if (!local) {
        writeJson(response, 404, { error: "not_found" });
        return;
      }
      if (requestPath.endsWith("capabilities")) {
        writeJson(response, 200, {
          result_contracts: ["CIVICLENZ_RESEARCH_INGEST_CONTRACT_V1"],
          acknowledgement_version: "CIVICLENZ_HARVESTER_ACK_V1",
          intake_state: "DURABLE_LOCAL_SPOOL_PENDING_CANONICAL_DISPATCH",
        });
        return;
      }
      writeJson(response, 200, await receiver.telemetry());
      return;
    }
    if (requestPath !== "/v1/harvester/results") {
      writeJson(response, 404, { error: "not_found" });
      return;
    }
    if (request.method !== "POST") {
      safeMethodNotAllowed(response);
      return;
    }
    let rawBody: Buffer;
    try {
      rawBody = await readRequestBody(request, config.maxBodyBytes);
    } catch (error) {
      const tooLarge = error instanceof Error && error.message === "body_too_large";
      writeJson(response, tooLarge ? 413 : 400, {
        acknowledgement: {
          acknowledgement_version: "CIVICLENZ_HARVESTER_ACK_V1",
          acknowledgement_state: tooLarge ? "RETRY_LATER" : "REJECTED_SCHEMA",
          correlation_id: randomUUID(),
          ...(tooLarge ? { retry_after_seconds: config.retryAfterSeconds } : {}),
        },
      });
      return;
    }
    const result = await receiver.handle(request.headers, rawBody);
    const headers: Record<string, string> = result.acknowledgement.retry_after_seconds
      ? { "retry-after": String(result.acknowledgement.retry_after_seconds) }
      : {};
    writeJson(response, result.statusCode, acknowledgementBody(result.acknowledgement), headers);
  });
  return { server, receiver };
}

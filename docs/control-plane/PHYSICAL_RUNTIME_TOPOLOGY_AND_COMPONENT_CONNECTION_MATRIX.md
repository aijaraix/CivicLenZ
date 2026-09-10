# CivicLenZ Physical Runtime Topology & Component Connection Matrix

## 1. Purpose
This document defines the physical runtime topology of CivicLenZ and the mandatory method for proving how every production component is installed, started, supervised, connected, persisted, secured, and consumed.

It complements `BEHAVIORAL_EXECUTION_PROOF_AND_ANTI_SIMULATION_CONTRACT.md`.

The purpose is to prevent architecture diagrams, class names, service names, configuration files, local source trees, status strings, or generated reports from being mistaken for the actual running system.

The physical system is the combination of:

```text
SOURCE
→ BUILD / DEPLOYMENT ARTIFACT
→ HOST / MANAGED RUNTIME
→ SERVICE / CONTAINER / WORKER
→ PROCESS / EXECUTION IDENTITY
→ INPUT BOUNDARY
→ ACTUAL EXECUTION
→ DURABLE OUTPUT / STATE
→ DOWNSTREAM CONSUMER
→ INDEPENDENT ATTESTATION
```

Every material component must be traceable through this chain.

---

## 2. Governing invariants

### 2.1 One physical fact, one proof
A component is not considered running merely because:
- source code exists;
- a service definition exists;
- a container image exists;
- a Worker script is deployed;
- a cron trigger is configured;
- a queue exists;
- a process name appears in documentation;
- a local AI Studio process reports itself healthy.

Runtime status requires physical runtime evidence.

### 2.2 Loaded configuration versus configuration on disk
The system must distinguish:

```text
CONFIG_IN_GIT
CONFIG_ON_HOST
CONFIG_LOADED_BY_SUPERVISOR
PROCESS_EFFECTIVE_CONFIG
```

These states may differ.

A changed systemd unit on disk does not alter a running process until systemd reload/restart semantics make it effective.

### 2.3 Source versus deployment
Always distinguish:

```text
CANONICAL_GITHUB_COMMIT
PRODUCER_GITHUB_COMMIT
LOCAL_WORKSPACE_COMMIT
DEPLOYED_SOURCE_COMMIT
RUNNING_ARTIFACT_ID
```

Never report a local commit as deployed merely because tests passed locally.

### 2.4 Service versus behavior
A running service proves process liveness only.

It does not prove:
- useful work is dispatched;
- queues are consumed;
- evidence is created;
- downstream systems consume output;
- autonomous research advances.

### 2.5 No duplicate authority
Only one component may own each exclusive authority at a time, including canonical scheduling, canonical validation, current-state projection, publication authority, and Academy promotion authority.

Multiple workers/producers may execute research, but they may not create competing canonical control planes.

---

## 3. Current physically observed CivicLenZ VPS baseline

This section records the physically inspected baseline observed on the CivicLenZ VPS before the next activation/reconciliation pass.

This is a checkpoint, not an assumption that the state remains unchanged forever. Future agents MUST re-inspect before making changes.

### 3.1 Host

Observed host class:
- Ubuntu Linux VPS
- approximately 4 CPU cores
- approximately 16 GB provisioned memory class
- approximately 79 GB root filesystem class
- approximately 2 GB swap
- current host has substantial disk headroom

The VPS is the intended persistent CivicLenZ control-plane host.

It is not intended to absorb unlimited browser/model concurrency. Distributed and high-volume deterministic work may execute through Cloudflare or other approved worker fabrics while canonical orchestration remains centralized.

### 3.2 Observed systemd services

The following services were physically observed as enabled and running:

| Service | Observed role | Observed execution |
|---|---|---|
| `civiclenz-hermes-prime.service` | HERMES Prime observation runtime | Python `observer.py` |
| `civiclenz-openclaw.service` | private OpenClaw gateway | Node/OpenClaw gateway |
| `civiclenz-qwen.service` | localhost Qwen3 4B reasoning utility | llama.cpp server |
| `civiclenz-hermes-ingest.service` | canonical Harvester intake receiver | Node TypeScript service |
| `civiclenz-cloudflared-ingest.service` | Cloudflare Tunnel for HERMES ingress | cloudflared |

All were observed enabled for boot survival.

### 3.3 Critical current interpretation
`civiclenz-hermes-prime.service` is currently named/described as an **observation runtime** and executes:

```text
/usr/bin/python3 /opt/civiclenz/hermes/current/observer.py
```

Therefore:

```text
HERMES_SERVICE_RUNNING = TRUE
```

does NOT currently prove:

```text
FULL_CANONICAL_HERMES_EXECUTIVE_DISPATCH_ACTIVE = TRUE
```

The transition from observer to canonical executive must be behaviorally proven under the Anti-Simulation Contract.

---

## 4. Current service matrix

### 4.1 HERMES Prime

```text
COMPONENT_ID: canonical_hermes_prime
SERVICE: civiclenz-hermes-prime.service
HOST: CivicLenZ VPS
USER/GROUP: civiclenz / civiclenz
CURRENT_EXECSTART: /usr/bin/python3 /opt/civiclenz/hermes/current/observer.py
CURRENT_ROLE: observation runtime
SUPERVISOR: systemd
AUTOSTART: enabled
RESTART_POLICY: on-failure
STATE_DIRECTORY: civiclenz/hermes-prime
MEMORY_MAX: 192M
CPU_QUOTA: 25%
TASKS_MAX: 32
```

Current authority classification:

```text
OBSERVATION = ACTIVE
FULL_EXECUTIVE_DISPATCH = NOT_PROVEN / MUST BE RECONCILED
```

Required future proof:
- persistent ResearchNeed scan/event intake;
- canonical scheduler decision;
- durable ResearchWorkIdentity;
- lease/reservation;
- actual dispatch;
- downstream worker consumption;
- persisted result;
- next-work progression.

### 4.2 OpenClaw

```text
COMPONENT_ID: canonical_openclaw_gateway
SERVICE: civiclenz-openclaw.service
HOST: CivicLenZ VPS
USER/GROUP: civiclenz-openclaw / civiclenz-openclaw
CONFIG: /etc/civiclenz-openclaw/openclaw.json
STATE: /var/lib/civiclenz-openclaw
SUPERVISOR: systemd
AUTOSTART: enabled
RESTART_POLICY: on-failure
NETWORK: localhost-only by systemd IP policy
MEMORY_MAX: 1536M
CPU_QUOTA: 50%
TASKS_MAX: 128
```

OpenClaw is an execution/tool gateway. It is not a canonical truth authority and is not an alternate HERMES orchestrator.

Required behavioral proof:

```text
HERMES/authorized work
→ OpenClaw request
→ actual tool/browser execution
→ physical response/artifact
→ consuming worker/HERMES
```

A generated OpenClaw response object without tool execution is insufficient.

### 4.3 Qwen

```text
COMPONENT_ID: local_qwen_reasoning
SERVICE: civiclenz-qwen.service
HOST: CivicLenZ VPS
USER/GROUP: civiclenz / civiclenz
MODEL: /opt/civiclenz/models/Qwen3-4B-Q4_K_M.gguf
SERVER: llama.cpp
BIND: 127.0.0.1:8081
ALIAS: qwen3-4b
CONTEXT: 16384
PARALLEL: 1
THREADS: 3
SUPERVISOR: systemd
AUTOSTART: enabled
RESTART_POLICY: on-failure
MEMORY_MAX: 6G
CPU_QUOTA: 300%
TASKS_MAX: 64
```

Observed memory use was close to the configured 6 GB service ceiling during inspection. This must be included in capacity/resource-governor decisions before adding substantial local concurrency.

Qwen is a reasoning utility, not evidence and not canonical validation authority.

Required behavioral proof:

```text
authorized work ID
→ actual localhost model request
→ model response telemetry
→ consuming component
```

### 4.4 HERMES Harvester ingest receiver

```text
COMPONENT_ID: canonical_harvester_ingest
SERVICE: civiclenz-hermes-ingest.service
HOST: CivicLenZ VPS
USER/GROUP: civiclenz / civiclenz
WORKING_DIRECTORY: /opt/civiclenz/current
ENTRYPOINT: services/hermes-ingest/src/main.ts
BIND_HOST: 127.0.0.1
PORT: 8788
SPOOL: /var/lib/civiclenz/hermes-ingest
PRODUCER_REGISTRY: /opt/civiclenz/current/config/producers/registry.json
SUPERVISOR: systemd
AUTOSTART: enabled
RESTART_POLICY: on-failure
```

The receiver is the canonical producer ingress boundary.

Producer success requires two-sided proof:

```text
PRODUCER says SENT
+
RECEIVER says RECEIVED
```

A producer-created `acknowledged_by_consumer=true` is forbidden.

Current deployment has had an explicit canary/intake hold configuration. Any future agent must physically inspect whether intake remains paused before claiming canonical receipt/processing.

### 4.5 Cloudflare ingress Tunnel

```text
COMPONENT_ID: canonical_ingest_tunnel
SERVICE: civiclenz-cloudflared-ingest.service
HOST: CivicLenZ VPS
USER/GROUP: civiclenz / civiclenz
BINARY: /usr/local/bin/cloudflared
METRICS: 127.0.0.1:20241
TOKEN_FILE: /etc/civiclenz/cloudflared-ingest.token
SUPERVISOR: systemd
AUTOSTART: enabled
RESTART_POLICY: on-failure
```

The Tunnel provides transport/routing only.

Tunnel health does not prove:
- receiver authentication success;
- package acceptance;
- durable intake;
- validation;
- canonical promotion.

---

## 5. Loaded-versus-disk systemd reconciliation
During physical inspection, systemd reported that the unit files/source configuration/drop-ins for the five CivicLenZ services had changed on disk after being loaded.

Affected observed units:
- `civiclenz-hermes-prime.service`
- `civiclenz-openclaw.service`
- `civiclenz-qwen.service`
- `civiclenz-hermes-ingest.service`
- `civiclenz-cloudflared-ingest.service`

This creates a required reconciliation step.

Before any reload/restart:
1. capture currently loaded unit definition;
2. capture unit/drop-ins on disk;
3. diff them;
4. determine intended canonical version;
5. verify source/deployment provenance;
6. determine restart impact;
7. preserve queues/state;
8. execute controlled `daemon-reload` only when safe;
9. restart only services requiring new effective configuration;
10. verify post-restart behavior, not just process state.

Do not blindly restart all services merely because systemd emits the warning.

---

## 6. Intended single-control-plane topology

The intended production topology is:

```text
                         GitHub
              canonical + producer source
                           │
              ┌────────────┴────────────┐
              │                         │
            Codex                 Google/Gemini
        engineering agent          engineering /
                                  research producer
              │                         │
              └────────────┬────────────┘
                           │ deploy/sync through governed process
                           ▼
                  CIVICLENZ CONTROL PLANE
                        VPS / HERMES
                           │
       ┌───────────────────┼────────────────────┐
       │                   │                    │
   OpenClaw              Qwen            Producer Intake
       │                   │                    │
       └──────────────┬────┘                    │
                      │                         │
                      ▼                         ▼
              canonical work flow       extracted_unreviewed
                      │                   producer packages
                      │                         │
          ┌───────────┼────────────┐            │
          │           │            │            │
      Supabase    Cloudflare       R2 <─────────┘ where governed
      canonical   execution      evidence
      structured  fabric         artifacts
      state
```

Codex and Google/Gemini are not production orchestrators merely because they can modify code.

---

## 7. Single-orchestrator boundary
The canonical production system must have one authoritative orchestration plane for:
- canonical ResearchNeed scheduling;
- canonical ResearchWorkIdentity reservation;
- canonical queue routing policy;
- canonical currentness/revalidation planning;
- canonical validation coordination;
- canonical monitoring planning;
- Academy controlled promotion authority.

Google/CivicsLenZz, Cloudflare collectors, OpenClaw, Qwen, deterministic adapters and future producers/workers may execute delegated work but must not create competing canonical authority.

A dedicated Single-Orchestrator/Multi-Producer contract further defines this boundary.

---

## 8. CivicsLenZz / Google producer topology

CivicsLenZz is a producer/research implementation, not canonical truth authority.

Target topology:

```text
CivicsLenZz research work
→ real source/tool execution
→ raw artifact
→ extraction
→ precise evidence locator
→ extracted_unreviewed result
→ HMAC-signed producer package
→ canonical ingest receiver
→ receiver-generated acknowledgement
→ canonical HERMES processing
```

CivicsLenZz must not:
- write canonical validation state;
- write canonical publication state;
- create receiver acknowledgements;
- run a competing canonical HERMES executive;
- count synthetic fallback objects as physical retrievals;
- use generated proof artifacts as production truth.

### 8.1 Potential VPS producer service
If CivicsLenZz is deployed onto the shared VPS, it must receive a distinct runtime identity such as:

```text
SERVICE: civicslenzz-harvester.service
USER: dedicated producer identity
STATE: dedicated producer state directory
INPUT: governed producer work / independent frontier policy
OUTPUT: canonical bridge only
NETWORK: least privilege
CPU/MEMORY: bounded
SUPERVISOR: systemd
```

The exact service name and limits must be finalized before deployment.

Do not copy the Google AI Studio interactive runtime directly into production.

---

## 9. Cloudflare execution fabric
Cloudflare is intended for scalable deterministic/event-driven work where appropriate.

Inventory must physically map every deployed:
- Worker script;
- deployment/version;
- cron trigger;
- Queue producer;
- Queue consumer;
- dead-letter path;
- R2 binding;
- environment variable/flag;
- `DRY_RUN` state;
- last real execution;
- last real consumed message;
- downstream canonical handoff.

A deployed Worker with a cron trigger is not proof that research is progressing.

Required proof:

```text
trigger/event
→ Worker execution ID
→ real source request
→ actual response
→ durable queue/object/result
→ downstream consumer
```

---

## 10. Supabase canonical structured state
Supabase/Postgres is intended to hold approved canonical structured state and operational ledger data according to canonical schemas.

Physical inventory must include:
- project/environment identity;
- schema version;
- migration commit;
- table names;
- service-role boundaries;
- row-level security where applicable;
- writer identities;
- reader identities;
- queue/job/validation/currentness tables;
- backup/restore state.

No producer may bypass canonical intake by writing directly to canonical truth tables.

### 10.1 Required transaction proof
For any claimed canonical database transition:

```text
input event/package
→ authorized service identity
→ database transaction ID/log
→ affected row IDs
→ independent query confirms state
```

A generated SQL object or mocked repository return is not proof.

---

## 11. R2 evidence/object storage
R2 is intended to preserve evidence artifacts and other approved object classes.

Physical inventory must identify:
- bucket name;
- binding/service identity;
- object-key policy;
- immutable/content-addressed rules where applicable;
- metadata;
- retention;
- writer identity;
- reader identity;
- object existence checks;
- hash reconciliation.

### 11.1 Artifact proof
For a claimed evidence object:

```text
source retrieval
→ actual bytes
→ computed SHA-256
→ R2 PUT/object creation
→ R2 object ID/key
→ independent R2 HEAD/GET
→ recomputed SHA-256
→ match
```

Returning an R2-looking path without a physical object fails proof.

---

## 12. Canonical bridge communication matrix

### 12.1 Producer → receiver

```text
PRODUCER:
  creates extracted_unreviewed package
  signs according to canonical HMAC protocol
  records SENT/RETRYING

RECEIVER:
  authenticates independently
  validates envelope policy/schema
  persists intake or returns governed retry/rejection
  generates acknowledgement/correlation ID

PRODUCER:
  consumes receiver response
  records receiver-derived acknowledgement state
```

No component may fabricate the opposite side's state.

### 12.2 Receiver → HERMES
The receiver must hand durable intake
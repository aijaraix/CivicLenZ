# CivicLenZ Physical Swarm Capability Activation Matrix — 2026-09-18

## Purpose
Launch truth table for physical research execution. It operationalizes the existing Worker Catalog and Physical Capability Registry contracts and must be refreshed from live telemetry before production claims.

`DECLARED != READY != ACTIVE`. ACTIVE requires a recent real production worker_run plus appropriate durable source/evidence lineage.

## Required fields
Every logical capability must resolve to: capability key/family; implementation state; physical module/service; runtime/deployment; queue/pool; source/tool authority; input contract; output contract; evidence obligation; validation/reconciliation path; backlog; concurrency policy; last successful physical run; blocker; next activation action.

## Launch families
| Family | Priority capabilities | Launch requirement |
|---|---|---|
| Foundation/source | source discovery, identity, current officeholder, jurisdiction, Seat | reusable discovery/retrieval + quarantine; no false attribution |
| Social/media | social account discovery, portrait/media, social content | account-context evidence; bounded platform/time work; lawful access |
| Background | biography, education, career, public/military service, political history, prior offices | multi-source evidence and open-ended coverage |
| Elections/campaign | election history/discovery, candidate discovery/status, campaign context | Seat/election/cycle identity preserved |
| Finance/disclosure | committees, finance, contributions, expenditures, PAC relationships, reconciliation, disclosures/assets/liabilities/income/business interests | finite partitioning and reconciliation |
| Government activity | executive actions/orders, vetoes, signings, appointments, budgets, decisions, releases | action/time/source partitioning |
| Promises/statements | promises, commitments, statements, speeches, debates, interviews, podcasts, ads | attributable context, atomic commitments, neutral evidence relationships |
| News/relationships/public records | news, organizations, staff/appointment/donor/business relationships, ethics/investigations/public records | no unsupported motive/causation; procedural context |
| GIS | jurisdiction/district boundaries, SeatBoundaryAssignments, redistricting/election linkage | authoritative versioned provenance |
| Quality/monitoring | evidence validation, entity/contradiction resolution, reconciliation, completeness, publication gate, source health/change detection | independent validation/audit and persistent monitoring |

## State rules
- NOT_IMPLEMENTED: no production-reachable physical path.
- READY: implementation/configuration may exist but lacks qualifying recent production proof.
- ACTIVE: qualifying recent physical execution exists.
- DEGRADED: physical path exists but health/currentness threshold is violated.
- BLOCKED: named dependency prevents execution.
- FAILED: terminal implementation/runtime failure requiring repair.

Never promote state because a class, queue, configuration or catalog entry exists.

## Activation wave
Attempt multiple distinct families after source/quarantine enablement. A blocked family does not block independent families.

## Worker-pool doctrine
Do not create one permanent process per logical capability. Compatible capabilities may share reusable workers. Report logical capabilities, physical processes/deployments, effective concurrent work and queued/leased/running work separately.

A worker completing one bounded unit immediately becomes eligible for the next compatible unit, including another subject.

## Required physical proof
For every activation preserve/link: canonical SHA; deployment ID; capability key; ResearchNeed/ResearchWork/job; lease/attempt token; worker_run; source locator; retrieval ID/hash/bytes where applicable; evidence object; handoff/validation; coverage update; next work consumed.

No synthetic artifact counts as production proof.

## Initial dated checkpoint
At revision 10, generic HERMES routing remained evidence-only and the generic Cloudflare deployment configured for dispatch was stale. No non-evidence capability was to be mislabeled ACTIVE. Revalidate before use.

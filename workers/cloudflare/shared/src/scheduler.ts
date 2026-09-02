import { electionMonitorDedupeKey, ingestDedupeKey, monitorDedupeKey, queueSenderForRoute, toQueueMessage } from "./jobs.ts";
import { isUuid, uuidFromName } from "./ids.ts";
import { COUNTY_JURISDICTION_KEYS, SOUTH_FLORIDA_COUNTIES, firstWaveIngestSources } from "./slice.ts";
import type { CivicStore } from "./store.ts";
import type { JobRecord, QueueJobMessage, RuntimeQueues } from "./types.ts";

export type SchedulerPlan = {
  scheduled: JobRecord[];
  skippedActive: string[];
  enqueued: QueueJobMessage[];
  dryRun: boolean;
  dueSources: number;
  dueJobs: number;
  dueElections: number;
  dueMonitoringTargets: number;
  staleClaims: number;
  wouldEnqueue: number;
  queueRoutes: string[];
  dedupeKeys: string[];
};

export async function planAndEnqueue(input: {
  store: CivicStore;
  queues?: RuntimeQueues;
  now?: Date;
  dryRun: boolean;
}): Promise<SchedulerPlan> {
  const now = input.now ?? new Date();
  const scheduled: JobRecord[] = [];
  const skippedActive: string[] = [];

  for (const source of firstWaveIngestSources()) {
    const result = await input.store.scheduleJob({
      dedupeKey: ingestDedupeKey(source.sourceKey, now),
      route: "ingest",
      sourceKey: source.sourceKey,
      payload: { sourceUrl: source.url, sourceType: source.sourceType, sourceKey: source.sourceKey },
      scheduledFor: now.toISOString(),
    });
    if (result.created) scheduled.push(result.job);
    else skippedActive.push(result.job.dedupeKey);
  }

  const election = await input.store.scheduleJob({
    dedupeKey: electionMonitorDedupeKey("us-fl", now),
    route: "monitor",
    entityType: "election_calendar",
    payload: {
      sourceUrl: "https://dos.fl.gov/elections/",
      entityId: "us-fl",
      monitoringClass: "daily",
      note: "Florida election calendar monitor. Does not ingest candidate lists in first wave.",
    },
    scheduledFor: now.toISOString(),
  });
  if (election.created) scheduled.push(election.job);
  else skippedActive.push(election.job.dedupeKey);

  for (const county of SOUTH_FLORIDA_COUNTIES) {
    const key = COUNTY_JURISDICTION_KEYS[county];
    const jurisdiction = await input.store.upsertJurisdiction({
      jurisdictionKey: key,
      name: `${county} County`,
      jurisdictionType: "county",
      stateCode: "FL",
      countyName: county,
    });
    const monitor = await input.store.scheduleJob({
      dedupeKey: monitorDedupeKey("jurisdiction", key, "daily", now),
      route: "monitor",
      entityType: "jurisdiction",
      entityId: jurisdiction.jurisdictionId,
      payload: {
        county,
        entityId: key,
        monitoringClass: "daily",
        note:
          county === "Miami-Dade"
            ? "Miami-Dade official PDF is the first-wave ingest source."
            : `${county} has no first-wave official source URL in source-registry.json. Monitor only; do not invent sources.`,
      },
      scheduledFor: now.toISOString(),
    });
    if (monitor.created) scheduled.push(monitor.job);
    else skippedActive.push(monitor.job.dedupeKey);
    await input.store.upsertMonitoringState({
      targetType: "jurisdiction",
      targetId: jurisdiction.jurisdictionId,
      active: true,
      monitoringClass: "daily",
      nextCheckAt: now.toISOString(),
      configuration: { jurisdictionKey: key },
    });
  }

  const governorSeatId = await uuidFromName("seat:us-fl-governor");
  const governorMonitor = await input.store.scheduleJob({
    dedupeKey: monitorDedupeKey("seat", "us-fl-governor", "daily", now),
    route: "monitor",
    entityType: "seat",
    entityId: governorSeatId,
    payload: {
      sourceUrl: "https://www.flgov.com/",
      entityId: "us-fl-governor",
      monitoringClass: "daily",
      note: "Governor seat monitor. Not a person-name special case.",
    },
    scheduledFor: now.toISOString(),
  });
  if (governorMonitor.created) scheduled.push(governorMonitor.job);
  else skippedActive.push(governorMonitor.job.dedupeKey);

  const due = await input.store.getDueJobs(now, 100);
  const enqueued: QueueJobMessage[] = [];
  if (!input.dryRun && input.queues) {
    for (const job of due) {
      const message = toQueueMessage(job, false);
      const queue = queueSenderForRoute(message.route, input.queues);
      if (!queue) continue;
      await queue.send(message);
      enqueued.push(message);
    }
  }
  const [elections, claims, monitoring] = await Promise.all([
    input.store.listElections(),
    input.store.listClaims(),
    input.store.listMonitoringState(),
  ]);
  return {
    scheduled,
    skippedActive,
    enqueued,
    dryRun: input.dryRun,
    dueSources: firstWaveIngestSources().length,
    dueJobs: due.length,
    dueElections: elections.filter((row) => row.electionDate && Date.parse(row.electionDate) >= now.getTime()).length,
    dueMonitoringTargets: monitoring.filter((row) => row.active && (!row.nextCheckAt || Date.parse(row.nextCheckAt) <= now.getTime())).length,
    staleClaims: claims.filter((claim) => claim.verificationState === "stale").length,
    wouldEnqueue: due.length,
    queueRoutes: due.map((job) => job.jobType),
    dedupeKeys: due.map((job) => job.dedupeKey),
  };
}

export { isUuid };

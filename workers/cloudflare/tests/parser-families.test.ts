import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { runCollectorJob } from "../shared/src/collector.ts";
import { CivicError } from "../shared/src/errors.ts";
import { createMemoryBucket } from "../shared/src/memory-bucket.ts";
import {
  PARSER_FAMILIES,
  parseFloridaHouseDirectory,
  parseFloridaSenateDirectory,
  parseHtmlDirectory,
  parseXmlFeed,
  parserFamilyFor,
} from "../shared/src/parser-families.ts";
import { createQueueJobMessage } from "../shared/src/queue-messages.ts";
import { firstWaveSourceAdapters, operatorControlledSources, sourceAdapter } from "../shared/src/source-config.ts";
import { createMemoryStore } from "../shared/src/store.ts";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../../..");
const senateHtml = readFileSync(path.join(repoRoot, "tests/fixtures/florida_senate_directory.html"), "utf8");
const houseHtml = readFileSync(path.join(repoRoot, "tests/fixtures/florida_house_directory.html"), "utf8");
const senateXml = readFileSync(path.join(repoRoot, "tests/fixtures/us_senate_florida.xml"), "utf8");

test("parser families are reusable and Senate/House are HTML_DIRECTORY", () => {
  assert.ok(PARSER_FAMILIES.includes("HTML_DIRECTORY"));
  assert.ok(PARSER_FAMILIES.includes("XML_FEED"));
  assert.ok(PARSER_FAMILIES.includes("JSON_API"));
  assert.ok(PARSER_FAMILIES.includes("CSV"));
  assert.ok(PARSER_FAMILIES.includes("OFFICIAL_PROFILE"));
  assert.ok(PARSER_FAMILIES.includes("ELECTION_PORTAL"));
  const senate = sourceAdapter("florida-senate-members");
  const house = sourceAdapter("florida-house-members");
  assert.equal(senate?.parserFamily, "HTML_DIRECTORY");
  assert.equal(house?.parserFamily, "HTML_DIRECTORY");
  assert.equal(senate?.parserKey, "html-directory");
  assert.equal(house?.parserKey, "html-directory");
  assert.equal(parserFamilyFor(senate!), "HTML_DIRECTORY");
  assert.equal(senate?.firstWaveActive, false);
  assert.equal(house?.firstWaveActive, false);
  assert.equal(senate?.operatorControlled, true);
  assert.equal(house?.operatorControlled, true);
  assert.equal(firstWaveSourceAdapters().every((item) => item.sourceKey === "miami-dade-county-elected-officials"), true);
  assert.deepEqual(
    operatorControlledSources().map((item) => item.sourceKey).sort(),
    ["florida-house-members", "florida-senate-members"],
  );
});

test("Florida Senate HTML_DIRECTORY extracts current occupants and vacant seats", () => {
  const senate = sourceAdapter("florida-senate-members")!;
  const holders = parseFloridaSenateDirectory(senateHtml, senate, 2);
  assert.equal(holders.length, 3);
  assert.equal(holders.filter((item) => !item.vacant).length, 2);
  assert.equal(holders[0]?.displayName, "Arrington, Kristen Aston");
  assert.equal(holders[0]?.districtNumber, "25");
  assert.equal(holders[0]?.seatKey, "us-fl-state-senate-district-25");
  assert.equal(holders[0]?.partyName, "Democrat");
  assert.equal(holders[1]?.displayName, "Albritton, Ben");
  assert.equal(holders[2]?.vacant, true);
  assert.equal(holders[2]?.districtNumber, "39");
  assert.equal(holders[2]?.displayName, "Vacant");
});

test("Florida House HTML_DIRECTORY skips resigned current occupancy and keeps the seat", () => {
  const house = sourceAdapter("florida-house-members")!;
  const holders = parseFloridaHouseDirectory(houseHtml, house, 2);
  const current = holders.filter((item) => !item.vacant);
  const former = holders.filter((item) => item.vacant);
  assert.equal(current.length, 2);
  assert.equal(current[0]?.displayName, "Salzman, Michelle");
  assert.equal(current[0]?.districtNumber, "1");
  assert.equal(current[0]?.externalIdentifiers?.legislative_id, "4763");
  assert.equal(current[0]?.partyName, "Republican");
  assert.equal(current[1]?.districtNumber, "2");
  assert.equal(former.length, 1);
  assert.equal(former[0]?.districtNumber, "3");
  assert.equal(former[0]?.occupancyStatus, "former");
  assert.equal(former[0]?.displayName, "Rudman, Dr. Joel");
});

test("HTML_DIRECTORY fails closed on a partial Senate directory", () => {
  const senate = sourceAdapter("florida-senate-members")!;
  assert.throws(
    () => parseHtmlDirectory("<html><body>no members</body></html>", senate, 30),
    (error: unknown) => error instanceof CivicError && error.errorClass === "parser_failure",
  );
});

test("XML_FEED family keeps only Florida U.S. senators", () => {
  const config = sourceAdapter("us-senate-members")!;
  const holders = parseXmlFeed(senateXml, config, 2);
  assert.equal(holders.length, 2);
  assert.equal(holders.every((item) => item.stateCode === "FL"), true);
  assert.ok(holders.some((item) => item.displayName.includes("Rubio")));
  assert.ok(holders.some((item) => item.displayName.includes("Scott")));
});

test("collector persists Florida Senate seats to us-fl, not Miami-Dade, and does not invent Vacant persons", async () => {
  const store = createMemoryStore();
  const result = await runCollectorJob({
    store,
    message: createQueueJobMessage({
      jobId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      dedupeKey: "ingest:florida-senate-members:2026-09-02",
      route: "ingest",
      sourceKey: "florida-senate-members",
      sourceUrl: "https://www.flsenate.gov/Senators",
      attempt: 0,
      scheduledFor: "2026-09-02T00:00:00.000Z",
      dryRun: false,
    }),
    bucket: createMemoryBucket(),
    worker: { workerKey: "civiclenz-collector", runtime: "test" },
    fetchImpl: async () => new Response(senateDirectoryHtml(39, 40), { status: 200, headers: { "content-type": "text/html" } }),
  });
  assert.equal(result.status, "collected");
  assert.equal(result.extractedCount, 40);
  const jurisdictions = await store.listJurisdictions();
  assert.ok(jurisdictions.some((row) => row.jurisdictionKey === "us-fl"));
  assert.equal(jurisdictions.some((row) => row.jurisdictionKey === "us-fl-miami-dade"), false);
  const seats = await store.listSeats();
  assert.equal(seats.length, 40);
  assert.ok(seats.every((seat) => seat.seatKey.startsWith("us-fl-state-senate-district-")));
  const vacant = seats.find((seat) => seat.seatKey.endsWith("-40"));
  assert.equal(vacant?.occupancyStatus, "vacant");
  const people = await store.listPersons();
  assert.equal(people.some((person) => person.canonicalName.toLowerCase() === "vacant"), false);
  assert.equal(people.length, 39);
  const occupancies = await store.listOccupancies();
  assert.equal(occupancies.filter((row) => row.occupancyStatus === "current").length, 39);
  const claims = await store.listClaims();
  assert.ok(claims.some((claim) => claim.fieldKey === "current_occupant" && claim.verificationState === "collected_unreviewed"));
  assert.equal(claims.some((claim) => claim.verificationState === "verified"), false);
});

test("collector persists Florida House current occupancy and former resigned seat", async () => {
  const store = createMemoryStore();
  const result = await runCollectorJob({
    store,
    message: createQueueJobMessage({
      jobId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      dedupeKey: "ingest:florida-house-members:2026-09-02",
      route: "ingest",
      sourceKey: "florida-house-members",
      sourceUrl: "https://www.flhouse.gov/Representatives",
      attempt: 0,
      scheduledFor: "2026-09-02T00:00:00.000Z",
      dryRun: false,
    }),
    bucket: createMemoryBucket(),
    worker: { workerKey: "civiclenz-collector", runtime: "test" },
    fetchImpl: async () => new Response(houseDirectoryHtml(115, 116), { status: 200, headers: { "content-type": "text/html" } }),
  });
  assert.equal(result.status, "collected");
  const seats = await store.listSeats();
  assert.equal(seats.some((seat) => seat.seatKey === "us-fl-state-house-district-1"), true);
  assert.equal(seats.find((seat) => seat.seatKey === "us-fl-state-house-district-116")?.occupancyStatus, "vacant");
  const occupancies = await store.listOccupancies();
  assert.equal(occupancies.filter((row) => row.occupancyStatus === "current").length, 115);
  assert.equal(occupancies.filter((row) => row.occupancyStatus === "former").length, 1);
});

test("House former occupant in a filled district does not vacate the current seat", async () => {
  const store = createMemoryStore();
  const result = await runCollectorJob({
    store,
    message: createQueueJobMessage({
      jobId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      dedupeKey: "ingest:florida-house-members:2026-09-03",
      route: "ingest",
      sourceKey: "florida-house-members",
      sourceUrl: "https://www.flhouse.gov/Representatives",
      attempt: 0,
      scheduledFor: "2026-09-02T00:00:00.000Z",
      dryRun: false,
    }),
    bucket: createMemoryBucket(),
    worker: { workerKey: "civiclenz-collector", runtime: "test" },
    fetchImpl: async () => new Response(houseDirectoryHtml(115, 1), { status: 200, headers: { "content-type": "text/html" } }),
  });
  assert.equal(result.status, "collected");
  const seats = await store.listSeats();
  assert.equal(seats.find((seat) => seat.seatKey === "us-fl-state-house-district-1")?.occupancyStatus, "occupied");
  const occupancies = await store.listOccupancies();
  const districtOne = occupancies.filter((row) => {
    const seat = seats.find((item) => item.seatId === row.seatId);
    return seat?.seatKey === "us-fl-state-house-district-1";
  });
  assert.equal(districtOne.filter((row) => row.occupancyStatus === "current").length, 1);
  assert.equal(districtOne.filter((row) => row.occupancyStatus === "former").length, 1);
});

function senateDirectoryHtml(currentCount: number, vacantDistrict: number): string {
  const rows: string[] = [];
  for (let district = 1; district <= currentCount; district += 1) {
    rows.push(`
      <tr>
        <th><a href="/Senators/2024-2026/S${district}">Member, ${district}</a></th>
        <td>${district}</td>
        <td>Republican</td>
        <td>Consists of Example county ${district}</td>
      </tr>`);
  }
  rows.push(`
    <tr>
      <th><a href="/Senators/2024-2026/S${vacantDistrict}">Vacant</a></th>
      <td>${vacantDistrict}</td>
      <td></td>
      <td>Consists of part of Miami-Dade county</td>
    </tr>`);
  return `<html><head><title>Senators - The Florida Senate</title></head><body><h1>2024-2026 Senators</h1><table>${rows.join("")}</table></body></html>`;
}

function houseDirectoryHtml(currentCount: number, resignedDistrict: number): string {
  const cards: string[] = [];
  for (let district = 1; district <= currentCount; district += 1) {
    cards.push(`
      <div class="team-box">
        <a href="/Sections/Representatives/details.aspx?MemberId=${1000 + district}&LegislativeTermId=91">
          <h5>Member, ${district}</h5>
          <p>Republican &mdash; District: ${district} Example County 11/06/24 - 11/03/26</p>
        </a>
      </div>`);
  }
  cards.push(`
    <div class="team-box">
      <a href="/Sections/Representatives/details.aspx?MemberId=9&LegislativeTermId=91">
        <h5>Former, Member</h5>
        <p>Republican &mdash; District: ${resignedDistrict} Example County 11/06/24 - 01/01/25 (Resigned)</p>
      </a>
    </div>`);
  return `<html><head><title>Representatives for 2024 - 2026</title></head><body>${cards.join("")}</body></html>`;
}

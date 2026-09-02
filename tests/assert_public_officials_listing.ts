import { getAllOfficials, getOfficialBySlug, publicSeatKey } from '../lib/officials.ts';

const LIVE_SITE_STAGING_LEAKS = [
  { name: 'Rick Scott', slug: 'rick-scott-united-states-senator' },
  { name: 'Ashley Moody', slug: 'ashley-moody-united-states-senator' },
  { name: 'Aaron Bean', slug: 'aaron-bean-united-states-representative' },
  { name: 'Anna Paulina Luna', slug: 'anna-paulina-luna-united-states-representative' },
];

const officials = getAllOfficials();
const names = officials.map((official) => official.person.displayName);
const slugs = officials.map((official) => official.slug);
const failures: string[] = [];

if (officials.length === 0) {
  failures.push('Public officials list is empty; expected reviewed canonical profiles from data/officials.');
}

for (const official of officials) {
  if (official.publicationStage && official.publicationStage !== 'reviewed_profile') {
    failures.push(`${official.person.displayName} is on the public list with publicationStage=${official.publicationStage}`);
  }
  if (official.dataState === 'partially_verified' && official.sourceKey === 'us-senate-members') {
    failures.push(`${official.person.displayName} looks like an unreviewed US-Senate-Members staging card`);
  }
}

for (const leak of LIVE_SITE_STAGING_LEAKS) {
  if (names.includes(leak.name)) {
    failures.push(`Staging-only ${leak.name} leaked onto the public officials list`);
  }
  if (slugs.includes(leak.slug)) {
    failures.push(`Staging-only slug ${leak.slug} leaked onto the public officials list`);
  }
  if (getOfficialBySlug(leak.slug)) {
    failures.push(`getOfficialBySlug(${leak.slug}) returned a public profile for an unreviewed staging record`);
  }
}

if (!names.includes('Ron DeSantis')) {
  failures.push('Canonical reviewed profile Ron DeSantis is missing from the public list');
}

for (const official of officials) {
  const seatKey = publicSeatKey(official);
  if (!seatKey) {
    failures.push(`${official.slug} has no public seat key for static export`);
  }
  if (seatKey === official.slug) {
    failures.push(`${official.slug} used a person slug as a seat route`);
  }
}

if (failures.length) {
  console.error(JSON.stringify({ publicCount: officials.length, names, slugs, failures }, null, 2));
  process.exit(1);
}

console.log(
  JSON.stringify({
    status: 'ok',
    publicCount: officials.length,
    names,
    slugs,
  }),
);

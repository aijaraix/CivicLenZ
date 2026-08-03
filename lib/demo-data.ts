export type GovernmentLevel = 'Federal' | 'State' | 'Local' | 'School Board';

export type DemoOfficial = {
  slug: string;
  name: string;
  title: string;
  level: GovernmentLevel;
  party: string;
  district: string;
  color: string;
  initials: string;
  score: number;
  promises: number;
  bills: number;
  votes: number;
  detail: string;
  office: string;
  phone: string;
  email: string;
  nextElection: string;
};

export const addressSuggestions = [
  '1600 Pennsylvania Avenue NW, Washington, DC 20500',
  '3500 Parkway, Ft. Pierce, FL 34902',
  '221B Peachtree Street, Atlanta, GA 30309',
  '500 S Orange Ave, Orlando, FL 32801',
];

export const demoOfficials: DemoOfficial[] = [
  {
    slug: 'elena-morgan', name: 'Elena Morgan', title: 'U.S. Representative · FL-14', level: 'Federal',
    party: 'Example Party', district: 'Florida · District 14', color: '#1d4ed8', initials: 'EM', score: 82,
    promises: 24, bills: 28, votes: 824, detail: 'Representative example',
    office: '500 Civic Avenue, Tampa, FL 33602', phone: '(202) 555-0140', email: 'contact@example.civicslenz', nextElection: 'November 3, 2026',
  },
  {
    slug: 'david-chen', name: 'David Chen', title: 'U.S. Senator · Florida', level: 'Federal',
    party: 'Example Party', district: 'Florida', color: '#0f766e', initials: 'DC', score: 76,
    promises: 18, bills: 31, votes: 762, detail: 'Representative example',
    office: '201 Constitution Way, Tallahassee, FL 32399', phone: '(202) 555-0174', email: 'contact@example.civicslenz', nextElection: 'November 3, 2028',
  },
  {
    slug: 'aisha-thompson', name: 'Aisha Thompson', title: 'State Senator · District 19', level: 'State',
    party: 'Example Party', district: 'Florida · District 19', color: '#b45309', initials: 'AT', score: 74,
    promises: 17, bills: 19, votes: 441, detail: 'Representative example',
    office: '404 Capitol Center, Tallahassee, FL 32399', phone: '(850) 555-0191', email: 'contact@example.civicslenz', nextElection: 'November 3, 2026',
  },
  {
    slug: 'maria-sanchez', name: 'Maria Sanchez', title: 'County Commissioner · District 4', level: 'Local',
    party: 'Nonpartisan office', district: 'Example County · District 4', color: '#be123c', initials: 'MS', score: 88,
    promises: 12, bills: 11, votes: 136, detail: 'Representative example',
    office: '75 Government Plaza, Example County, FL', phone: '(305) 555-0188', email: 'contact@example.civicslenz', nextElection: 'November 3, 2026',
  },
  {
    slug: 'james-patel', name: 'James Patel', title: 'City Council Member · Seat 2', level: 'Local',
    party: 'Nonpartisan office', district: 'Example City · Seat 2', color: '#7c3aed', initials: 'JP', score: 79,
    promises: 14, bills: 9, votes: 98, detail: 'Representative example',
    office: '1 City Hall, Example City, FL', phone: '(786) 555-0102', email: 'contact@example.civicslenz', nextElection: 'November 3, 2027',
  },
  {
    slug: 'taylor-brooks', name: 'Taylor Brooks', title: 'School Board Member · Seat 5', level: 'School Board',
    party: 'Nonpartisan office', district: 'Example Schools · Seat 5', color: '#0369a1', initials: 'TB', score: 84,
    promises: 10, bills: 6, votes: 74, detail: 'Representative example',
    office: '900 Learning Lane, Example City, FL', phone: '(305) 555-0125', email: 'contact@example.civicslenz', nextElection: 'August 18, 2026',
  },
];

export const activityItems = [
  { type: 'Vote', title: 'Voted on H.R. 204 — Community Schools Act', date: 'May 7, 2026', tone: 'blue' },
  { type: 'Promise', title: 'Status changed: affordable housing commitment', date: 'May 5, 2026', tone: 'orange' },
  { type: 'Statement', title: 'Public statement added to the record', date: 'May 2, 2026', tone: 'purple' },
  { type: 'Bill', title: 'Co-sponsored S. 617 — Protect Our Seniors Act', date: 'April 29, 2026', tone: 'green' },
];

export const demoPetitions = [
  {
    slug: 'protect-public-housing', title: 'Protect affordable housing in our community', official: 'Elena Morgan',
    summary: 'Ask our representatives to publish a clear plan for preserving affordable homes and protecting renters.',
    signatures: 12840, goal: 25000, age: '3 days ago', color: '#2563eb', category: 'Housing',
  },
  {
    slug: 'safe-school-crossings', title: 'Fund safe school crossings before the new term', official: 'Taylor Brooks',
    summary: 'Call for a public timeline and transparent spending plan for the highest-priority school crossing upgrades.',
    signatures: 7340, goal: 10000, age: '8 days ago', color: '#0f766e', category: 'Education',
  },
  {
    slug: 'open-budget-hearings', title: 'Hold open budget hearings in every district', official: 'Maria Sanchez',
    summary: 'Request accessible public hearings and a plain-language county budget summary before the final vote.',
    signatures: 4826, goal: 15000, age: '11 days ago', color: '#be123c', category: 'Public Money',
  },
];

export const dataSources = ['USA.gov', 'Congress.gov', 'OpenSecrets', 'FEC', 'State.gov', 'County records'];

export function getDemoOfficial(slug: string) {
  return demoOfficials.find((official) => official.slug === slug);
}

'use client';

import Link from 'next/link';
import { useState } from 'react';
import { AppShell } from '@/components/app-shell';
import { DemoAvatar } from '@/components/demo-avatar';
import { Icon } from '@/components/icons';
import { activityItems, demoOfficials } from '@/lib/demo-data';

export type WorkspacePage = 'promises' | 'contact' | 'activity' | 'reports' | 'settings';

const pageCopy: Record<WorkspacePage, { eyebrow: string; title: string; description: string; active: string; icon: 'target' | 'message' | 'chart' | 'file' | 'settings' }> = {
  promises: {
    eyebrow: 'PROMISE TRACKER',
    title: 'Promises, commitments, and follow-through',
    description: 'See what has been said, what changed, and the source behind every status.',
    active: 'Promise Tracker',
    icon: 'target',
  },
  contact: {
    eyebrow: 'CONTACT OFFICIALS',
    title: 'Make your voice heard',
    description: 'Choose an office, shape a message, and keep a private record of the outreach you decide to send.',
    active: 'Contact Officials',
    icon: 'message',
  },
  activity: {
    eyebrow: 'MY ACTIVITY',
    title: 'Your civic activity',
    description: 'A private timeline of the officials, petitions, issues, and updates you choose to follow.',
    active: 'My Activity',
    icon: 'chart',
  },
  reports: {
    eyebrow: 'REPORTS',
    title: 'Your civic briefings',
    description: 'A home for weekly summaries, saved research, and source-linked reports across your watchlist.',
    active: 'Reports',
    icon: 'file',
  },
  settings: {
    eyebrow: 'SETTINGS',
    title: 'Your preferences and privacy',
    description: 'Choose what CivicLenZ may save, the alerts you want, and how your member experience works.',
    active: 'Settings',
    icon: 'settings',
  },
};

export function WorkspaceExperience({ page }: { page: WorkspacePage }) {
  const copy = pageCopy[page];
  return (
    <AppShell active={copy.active}>
      <div className="app-page workspace-page">
        <div className="prototype-label"><Icon name="sparkles" size={15} /> This is the full visual workflow for the database-connected product. All names, records, and counts are illustrative until the production provider is connected.</div>
        <section className="app-greeting workspace-heading">
          <div>
            <span className="small-label">{copy.eyebrow}</span>
            <h1>{copy.title}</h1>
            <p>{copy.description}</p>
          </div>
          <span className="workspace-heading-icon"><Icon name={copy.icon} size={24} /></span>
        </section>
        {page === 'promises' ? <PromiseTracker /> : null}
        {page === 'contact' ? <ContactOfficial /> : null}
        {page === 'activity' ? <ActivityTimeline /> : null}
        {page === 'reports' ? <ReportsLibrary /> : null}
        {page === 'settings' ? <SettingsPanel /> : null}
      </div>
    </AppShell>
  );
}

function PromiseTracker() {
  const rows = [
    ['Affordable housing plan', 'In progress', 'May 5, 2026', 'orange'],
    ['Protect school funding', 'Kept', 'April 19, 2026', 'green'],
    ['Publish quarterly town-hall calendar', 'Needs review', 'April 8, 2026', 'blue'],
    ['Expand local transit access', 'Not started', 'March 21, 2026', 'gray'],
  ] as const;
  return <div className="workspace-grid workspace-grid-main">
    <section className="app-card workspace-card promise-workspace-card">
      <div className="app-card-heading">
        <div><span className="small-label">TRACKED ACROSS YOUR OFFICIALS</span><h2>Promise status overview</h2></div>
        <button className="btn btn-outline btn-small" type="button"><Icon name="filter" size={16} /> Filter</button>
      </div>
      <div className="promise-kpis">
        <article><b>24</b><span>Total promises</span><small>Across 12 officials</small></article>
        <article><b>8</b><span>Kept</span><small className="tone-positive">Source confirmed</small></article>
        <article><b>5</b><span>Needs review</span><small className="tone-warning">New information</small></article>
        <article><b>11</b><span>In progress</span><small>Tracked over time</small></article>
      </div>
      <div className="workspace-table" role="table" aria-label="Illustrative promise tracker">
        <div className="workspace-table-head" role="row"><span>Commitment</span><span>Status</span><span>Last update</span><span /></div>
        {rows.map(([title, status, date, tone]) => <div className="workspace-table-row" role="row" key={title}>
          <div><span className={`status-dot ${tone}`} /><b>{title}</b><small>Sample source-linked record</small></div>
          <span className={`status-pill ${tone}`}>{status}</span>
          <span>{date}</span>
          <Link href="/officials/elena-morgan/" aria-label={`Open ${title}`}><Icon name="chevron-right" size={18} /></Link>
        </div>)}
      </div>
    </section>
    <aside className="app-card workspace-side-card">
      <span className="small-label">HOW STATUS WORKS</span><h2>Every change needs context.</h2>
      <ol className="workspace-steps"><li><b>1</b><span><strong>Capture</strong><small>Record the original statement or commitment.</small></span></li><li><b>2</b><span><strong>Verify</strong><small>Attach a dated public source and show uncertainty.</small></span></li><li><b>3</b><span><strong>Follow</strong><small>Notify you only when the record changes.</small></span></li></ol>
      <Link className="card-inline-link" href="/research/">Read the source standards <Icon name="arrow-right" size={15} /></Link>
    </aside>
  </div>;
}

function ContactOfficial() {
  const [selected, setSelected] = useState(demoOfficials[0].slug);
  const [topic, setTopic] = useState('Affordable housing');
  const [drafted, setDrafted] = useState(false);
  const official = demoOfficials.find((item) => item.slug === selected) ?? demoOfficials[0];
  return <div className="workspace-grid workspace-grid-contact">
    <section className="app-card contact-composer">
      <div className="app-card-heading"><div><span className="small-label">START A MESSAGE</span><h2>Write to an office</h2></div><span className="composer-lock"><Icon name="lock" size={15} /> Private draft</span></div>
      <div className="composer-fields">
        <label>Official<select value={selected} onChange={(event) => setSelected(event.target.value)}>{demoOfficials.map((item) => <option key={item.slug} value={item.slug}>{item.name} — {item.title}</option>)}</select></label>
        <label>Topic<input value={topic} onChange={(event) => setTopic(event.target.value)} /></label>
        <label>Message<textarea defaultValue={`Hello ${official.name},\n\nI am writing about ${topic.toLowerCase()}. I would appreciate a clear public update on the next steps and the records that support them.\n\nThank you.`} /></label>
      </div>
      <div className="composer-actions"><button className="btn btn-primary" type="button" onClick={() => setDrafted(true)}><Icon name="sparkles" size={17} /> Prepare my draft</button><button className="btn btn-outline" type="button"><Icon name="file" size={17} /> Save for later</button></div>
      {drafted ? <p className="workspace-confirm"><Icon name="check" size={16} /> Draft ready. In production, you will review the final text before anything is sent to an official&apos;s office.</p> : null}
    </section>
    <aside className="app-card contact-recipient-card"><DemoAvatar official={official} size="xl" /><span className="small-label">SELECTED OFFICE</span><h2>{official.name}</h2><p>{official.title}</p><dl><div><dt>District</dt><dd>{official.district}</dd></div><div><dt>Office contact</dt><dd>{official.phone}</dd></div><div><dt>Reply preference</dt><dd>Email update</dd></div></dl><Link className="card-inline-link" href={`/officials/${official.slug}/`}>View full profile <Icon name="arrow-right" size={15} /></Link></aside>
  </div>;
}

function ActivityTimeline() {
  const [filter, setFilter] = useState('All activity');
  const filters = ['All activity', 'Officials', 'Petitions', 'Alerts'];
  const rows = [...activityItems, { type: 'Petition', title: 'You supported safer school crossings', date: 'April 25, 2026', tone: 'red' }, { type: 'Official', title: 'You began following Elena Morgan', date: 'April 12, 2026', tone: 'blue' }];
  return <div className="workspace-grid workspace-grid-main">
    <section className="app-card activity-workspace-card"><div className="app-card-heading"><div><span className="small-label">PRIVATE MEMBER TIMELINE</span><h2>Recent activity</h2></div><button className="btn btn-outline btn-small" type="button"><Icon name="filter" size={16} /> Filter</button></div><div className="filter-pill-row">{filters.map((item) => <button type="button" className={filter === item ? 'active' : ''} onClick={() => setFilter(item)} key={item}>{item}</button>)}</div><div className="personal-timeline">{rows.map((item, index) => <article key={`${item.title}-${index}`}><span className={`timeline-marker ${item.tone}`}><Icon name={item.type === 'Petition' ? 'edit' : item.type === 'Official' ? 'star' : item.type === 'Vote' ? 'check' : 'bell'} size={15} /></span><div><span className="small-label">{item.type} · {item.date}</span><h2>{item.title}</h2><p>Illustrative activity detail. The connected product will show the official, source, and action history here.</p></div><Icon name="chevron-right" size={18} /></article>)}</div></section>
    <aside className="app-card workspace-side-card"><span className="small-label">YOUR CIVIC FOOTPRINT</span><h2>Participation at a glance</h2><div className="footprint-stats"><span><b>12</b>Officials followed</span><span><b>3</b>Petitions supported</span><span><b>7</b>Saved updates</span><span><b>2</b>Message drafts</span></div><Link href="/watchlist/" className="btn btn-outline btn-small">Open my officials <Icon name="arrow-right" size={15} /></Link></aside>
  </div>;
}

function ReportsLibrary() {
  const reports = [
    ['Weekly civic briefing', 'A concise look at your officials, alerts, and activity.', 'Ready today'],
    ['Representation summary', 'A map-led overview of the offices connected to your address.', 'Updated May 7'],
    ['Accountability watchlist', 'The promises, votes, and source changes you saved.', 'Updated May 5'],
  ];
  return <div className="reports-grid"><section className="app-card reports-library"><div className="app-card-heading"><div><span className="small-label">SAVED & SCHEDULED</span><h2>Report library</h2></div><button className="btn btn-primary btn-small" type="button"><Icon name="plus" size={16} /> Create report</button></div>{reports.map(([title, description, date]) => <article className="report-row" key={title}><span className="report-file"><Icon name="file" size={22} /></span><div><h2>{title}</h2><p>{description}</p><small>{date} · Sample report</small></div><button className="btn btn-outline btn-small" type="button">Preview <Icon name="arrow-right" size={15} /></button></article>)}</section><section className="app-card schedule-card"><span className="small-label">DELIVERY SCHEDULE</span><h2>Stay informed without the noise.</h2><p>Choose a summary cadence once account and alert delivery are connected.</p><div className="schedule-options"><button type="button" className="active">Weekly digest<span>Monday at 8:00 AM</span></button><button type="button">Monthly overview<span>First day of the month</span></button></div><Link className="card-inline-link" href="/settings/">Manage notification settings <Icon name="arrow-right" size={15} /></Link></section></div>;
}

function SettingsPanel() {
  const [settings, setSettings] = useState({ alerts: true, digest: true, location: false, research: true });
  const toggle = (key: keyof typeof settings) => setSettings((current) => ({ ...current, [key]: !current[key] }));
  const items: Array<[keyof typeof settings, string, string, 'bell' | 'file' | 'pin' | 'shield']> = [
    ['alerts', 'Important alerts', 'Notify me about high-priority changes to officials I follow.', 'bell'],
    ['digest', 'Weekly civic digest', 'Send one source-linked summary of my watchlist.', 'file'],
    ['location', 'Saved address', 'Keep my representation location available in my account.', 'pin'],
    ['research', 'Product research notices', 'Share optional product updates and early-access invitations.', 'shield'],
  ];
  return <div className="settings-layout"><section className="app-card settings-card"><div className="app-card-heading"><div><span className="small-label">NOTIFICATIONS & DATA</span><h2>Member preferences</h2></div><Icon name="settings" size={22} /></div>{items.map(([key, title, description, icon]) => <div className="setting-row" key={key}><span className="setting-row-icon"><Icon name={icon} size={20} /></span><div><h3>{title}</h3><p>{description}</p></div><button type="button" aria-pressed={settings[key]} onClick={() => toggle(key)} className={`toggle ${settings[key] ? 'on' : ''}`}><span /></button></div>)}</section><aside className="app-card privacy-card"><span className="small-label">PRIVACY CENTER</span><h2>Your account is separate from the public record.</h2><p>Production data controls, export, and account deletion live here. The prototype does not store account data.</p><button className="btn btn-outline btn-small" type="button"><Icon name="file" size={16} /> Export my data</button><Link className="card-inline-link" href="/research/">Read privacy and source standards <Icon name="arrow-right" size={15} /></Link></aside></div>;
}

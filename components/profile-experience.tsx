'use client';

import Link from 'next/link';
import { useState } from 'react';
import { DemoAvatar } from '@/components/demo-avatar';
import { Icon } from '@/components/icons';
import { MapVisual } from '@/components/map-visual';
import { activityItems, DemoOfficial } from '@/lib/demo-data';

const tabs = ['Overview', 'Votes', 'Promises', 'AI Monitor', 'Financials', 'Legislation', 'Bio'];

export function ProfileExperience({ official }: { official: DemoOfficial }) {
  const [active, setActive] = useState('Overview');
  const [following, setFollowing] = useState(false);
  const [contacted, setContacted] = useState(false);
  return (
    <div className="profile-page-new">
      <div className="prototype-label profile-prototype"><Icon name="sparkles" size={15} /> Prototype profile · sample interface and illustrative data only. The production profile will connect to CivicLenZ&apos;s source-verified official records.</div>
      <section className="profile-top">
        <div className="site-width">
          <Link className="back-link profile-back" href="/search/"><Icon name="arrow-left" size={16} /> Back to results</Link>
          <div className="profile-identity-row">
            <DemoAvatar official={official} size="xl" />
            <div className="profile-identity"><h1>{official.name} <span className="verified">✓</span></h1><p>{official.title}</p><span>{official.party}</span></div>
            <div className="profile-contact-strip"><span><Icon name="pin" size={16} /> 327 Hart Senate Office Building<br />Washington, DC 20510</span><span><Icon name="phone" size={16} /> {official.phone}</span><span><Icon name="mail" size={16} /> Email office</span><span><Icon name="globe" size={16} /> Official website</span></div>
            <div className="profile-actions"><button className="btn btn-primary btn-small" type="button" onClick={() => setContacted(!contacted)}><Icon name="message" size={16} /> {contacted ? 'Message Drafted' : 'Contact Official'}</button><button className={`btn btn-outline btn-small ${following ? 'is-active' : ''}`} type="button" onClick={() => setFollowing(!following)}><Icon name="star" size={16} /> {following ? 'Following' : 'Follow'}</button></div>
          </div>
          <nav className="profile-tabs" aria-label="Official profile sections">{tabs.map((tab) => <button type="button" className={active === tab ? 'active' : ''} onClick={() => setActive(tab)} key={tab}>{tab}</button>)}</nav>
        </div>
      </section>
      <div className="site-width profile-content-grid">
        <main className="profile-main-content">
          {active === 'Overview' ? <Overview official={official} /> : <ProfileTabPanel active={active} official={official} />}
        </main>
        <aside className="profile-side-column"><ProfileQuickActions /><div className="profile-mini-card"><h2>Where they represent</h2><MapVisual compact labelled={false} /><p><Icon name="pin" size={15} /> {official.district}</p></div></aside>
      </div>
    </div>
  );
}

function Overview({ official }: { official: DemoOfficial }) {
  return <>
    <section className="profile-score-layout"><article className="profile-card score-card"><div className="profile-card-heading"><div><span className="small-label">AI ACCOUNTABILITY SCORE</span><h2>{official.score}<small>/100</small></h2></div><span className="score-chip">Needs improvement</span></div><p>Measured across votes, public commitments, transparency signals, and source coverage.</p><SparkChart /></article><article className="profile-card promise-card"><div className="profile-card-heading"><div><span className="small-label">PROMISE TRACKER</span><h2>{official.promises} <small>tracked</small></h2></div><Icon name="target" size={22} /></div><div className="promise-summary"><span><b>8</b> Kept</span><span><b>5</b> Broken</span><span><b>11</b> In Progress</span></div><Link href="#activity" className="card-inline-link">See all promises <Icon name="arrow-right" size={15} /></Link></article></section>
    <section className="profile-card about-profile"><div className="profile-card-heading"><div><span className="small-label">ABOUT</span><h2>Public profile overview</h2></div><Icon name="user" size={21} /></div><p>This is where an official&apos;s verified biography, district, education, professional experience, office contacts, and source provenance will sit. Every production claim will link to a public record or be clearly marked as incomplete.</p><dl className="profile-facts"><div><dt>District / State</dt><dd>{official.district}</dd></div><div><dt>Current office</dt><dd>{official.title}</dd></div><div><dt>Next election</dt><dd>{official.nextElection}</dd></div><div><dt>Profile status</dt><dd>Illustrative interface</dd></div></dl></section>
    <section className="metric-strip">{[[official.votes, 'Votes Cast'], [official.bills, 'Bills Sponsored'], [official.promises, 'Promises Tracked'], ['3%', 'Missed Votes']].map(([number, label]) => <article key={String(label)}><b>{number}</b><span>{label}</span><small>Prototype metric</small></article>)}</section>
    <section id="activity" className="profile-card activity-profile"><div className="profile-card-heading"><div><span className="small-label">RECENT ACTIVITY</span><h2>Updates connected to the public record</h2></div><button className="icon-button" type="button"><Icon name="filter" size={18} /></button></div><div className="activity-list">{activityItems.map((item) => <article key={item.title}><span className={`activity-icon ${item.tone}`}><Icon name={item.type === 'Vote' ? 'check' : item.type === 'Promise' ? 'target' : item.type === 'Bill' ? 'file' : 'message'} size={15} /></span><div><small>{item.type}</small><h3>{item.title}</h3><p>{item.date}</p></div><Icon name="chevron-right" size={18} /></article>)}</div><Link href="/monitor/" className="card-inline-link activity-view-all">View all activity <Icon name="arrow-right" size={15} /></Link></section>
  </>;
}

function ProfileTabPanel({ active, official }: { active: string; official: DemoOfficial }) {
  if (active === 'Votes') return <VotesPanel official={official} />;
  if (active === 'Promises') return <PromisesPanel official={official} />;
  if (active === 'AI Monitor') return <MonitorPanel official={official} />;
  if (active === 'Financials') return <FinancialsPanel official={official} />;
  if (active === 'Legislation') return <LegislationPanel official={official} />;
  return <BioPanel official={official} />;
}

function VotesPanel({ official }: { official: DemoOfficial }) {
  const rows = [
    ['May 7, 2026', 'Community Schools Act', 'Voted yes', 'Vote record'],
    ['April 24, 2026', 'Public Infrastructure Amendment', 'Voted no', 'Vote record'],
    ['April 3, 2026', 'Local Services Funding Bill', 'Present', 'Vote record'],
  ];
  return <section className="profile-card tab-panel profile-data-panel"><div className="profile-card-heading"><div><span className="small-label">VOTING RECORD</span><h2>Votes and attendance</h2></div><span className="profile-panel-stat">{official.votes} recorded</span></div><p>Each production row will link directly to its official vote, meeting record, or source document.</p><div className="profile-record-list">{rows.map(([date, title, stance, source]) => <article key={title}><span className="record-date">{date}</span><div><h3>{title}</h3><small>{source} · Illustrative sample</small></div><span className={`vote-chip ${stance === 'Voted no' ? 'no' : stance === 'Present' ? 'present' : ''}`}>{stance}</span><Icon name="chevron-right" size={18} /></article>)}</div></section>;
}

function PromisesPanel({ official }: { official: DemoOfficial }) {
  const rows = [['Affordable housing commitment', 'In progress', 'May 5, 2026', 'orange'], ['Support public-school funding', 'Kept', 'April 19, 2026', 'green'], ['Publish district town-hall dates', 'Needs review', 'April 8, 2026', 'blue']];
  return <section className="profile-card tab-panel profile-data-panel"><div className="profile-card-heading"><div><span className="small-label">PROMISE TRACKER</span><h2>{official.promises} commitments tracked</h2></div><Icon name="target" size={22} /></div><p>Production data will preserve the original statement, source date, related actions, status rationale, and every change in the record.</p><div className="profile-promise-grid"><article><b>8</b><span>Kept</span></article><article><b>5</b><span>Needs review</span></article><article><b>11</b><span>In progress</span></article></div><div className="profile-record-list">{rows.map(([title, status, date, tone]) => <article key={title}><span className={`status-dot ${tone}`} /><div><h3>{title}</h3><small>Last updated {date} · Sample source-linked record</small></div><span className={`status-pill ${tone}`}>{status}</span><Icon name="chevron-right" size={18} /></article>)}</div></section>;
}

function MonitorPanel({ official }: { official: DemoOfficial }) {
  return <section className="profile-card tab-panel profile-data-panel"><div className="profile-card-heading"><div><span className="small-label">AI MONITOR</span><h2>What changed around this office</h2></div><Link href="/monitor/" className="card-inline-link">Open monitor <Icon name="arrow-right" size={15} /></Link></div><p>AI assists with organizing source-backed changes; it does not replace the underlying record or silently invent conclusions.</p><div className="profile-record-list monitor-record-list">{activityItems.slice(0, 3).map((item) => <article key={item.title}><span className={`activity-icon ${item.tone}`}><Icon name={item.type === 'Vote' ? 'check' : item.type === 'Promise' ? 'target' : 'file'} size={15} /></span><div><small>{item.type} · {item.date}</small><h3>{item.title}</h3><p>Illustrative monitoring summary with space for source link, context, and review state.</p></div><Icon name="chevron-right" size={18} /></article>)}</div></section>;
}

function FinancialsPanel({ official }: { official: DemoOfficial }) {
  return <section className="profile-card tab-panel profile-data-panel"><div className="profile-card-heading"><div><span className="small-label">FINANCIALS</span><h2>Campaign and disclosure record</h2></div><Icon name="chart" size={22} /></div><p>Finance records are shown with their filing period and original source so users can distinguish reported dollars, external analysis, and data gaps.</p><div className="financial-summary"><article><span>Latest filing</span><b>Q1 2026</b><small>Illustrative filing window</small></article><article><span>Contributions</span><b>Source-linked</b><small>Database field and source index</small></article><article><span>Disclosures</span><b>4 records</b><small>Example only</small></article></div><div className="profile-record-list"><article><span className="record-date">Q1 2026</span><div><h3>Campaign finance filing</h3><small>Original filing link and indexed details appear here.</small></div><Link href="/research/" className="card-inline-link">Source standards</Link><Icon name="chevron-right" size={18} /></article><article><span className="record-date">2025</span><div><h3>Annual financial disclosure</h3><small>Production view includes the document, source agency, and review status.</small></div><span className="status-pill blue">Indexed</span><Icon name="chevron-right" size={18} /></article></div></section>;
}

function LegislationPanel({ official }: { official: DemoOfficial }) {
  const rows = [['Public Infrastructure Amendment', 'Co-sponsored', 'April 24, 2026'], ['Community Schools Act', 'Voted', 'May 7, 2026'], ['Open Government Records Bill', 'In committee', 'March 29, 2026']];
  return <section className="profile-card tab-panel profile-data-panel"><div className="profile-card-heading"><div><span className="small-label">LEGISLATION</span><h2>Bills, resolutions, and actions</h2></div><span className="profile-panel-stat">{official.bills} total</span></div><p>Every bill or action in the live product can carry sponsorship, vote, committee, topic, date, and a direct public-source connection.</p><div className="profile-record-list">{rows.map(([title, status, date]) => <article key={title}><span className="record-date">{date}</span><div><h3>{title}</h3><small>Legislative record · Sample data</small></div><span className="status-pill blue">{status}</span><Icon name="chevron-right" size={18} /></article>)}</div></section>;
}

function BioPanel({ official }: { official: DemoOfficial }) {
  return <section className="profile-card tab-panel profile-data-panel"><div className="profile-card-heading"><div><span className="small-label">BIOGRAPHY & OFFICE</span><h2>Background and public service</h2></div><Icon name="user" size={22} /></div><p>This is the structured home for verified biography, office history, education, career experience, district information, and source provenance—not a marketing biography.</p><dl className="bio-fact-grid"><div><dt>Current office</dt><dd>{official.title}</dd></div><div><dt>District</dt><dd>{official.district}</dd></div><div><dt>Next election</dt><dd>{official.nextElection}</dd></div><div><dt>Public office</dt><dd>{official.office}</dd></div></dl><section className="bio-source-panel"><span className="small-label">SOURCE PROVENANCE</span><h3>What the live profile will show</h3><ul><li>Original publisher and date for every factual claim.</li><li>Clear distinction between verified, incomplete, and contested information.</li><li>A correction path with review history for material updates.</li></ul></section></section>;
}

function ProfileQuickActions() {
  return <section className="quick-action-card"><span className="small-label">TAKE ACTION</span><h2>Make your voice count.</h2><Link href="/sign-up/" className="quick-action blue"><Icon name="message" size={21} /><span><b>Contact an Official</b><small>Send a message with AI assistance</small></span><Icon name="chevron-right" size={17} /></Link><Link href="/petitions/" className="quick-action red"><Icon name="edit" size={21} /><span><b>Start a Petition</b><small>Create or support a public petition</small></span><Icon name="chevron-right" size={17} /></Link><button className="quick-action gray" type="button"><Icon name="share" size={21} /><span><b>Share this profile</b><small>Bring the record to your community</small></span><Icon name="chevron-right" size={17} /></button></section>;
}

function SparkChart() {
  return <svg className="spark-chart" viewBox="0 0 320 94" preserveAspectRatio="none" aria-label="Illustrative accountability score trend"><path d="M0 72H320M0 44H320M0 16H320" stroke="#E3E8F0" strokeWidth="1"/><path d="M0 67C22 68 31 59 50 62s24-13 43-8c19 5 22 1 41 5s26-10 44-7 25-2 40-17 25 7 39 3 22-13 33-16" fill="none" stroke="#E63946" strokeWidth="3" strokeLinecap="round"/><circle cx="132" cy="59" r="4" fill="#E63946"/><circle cx="279" cy="40" r="4" fill="#E63946"/></svg>;
}

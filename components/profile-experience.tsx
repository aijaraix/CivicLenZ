'use client';

import Link from 'next/link';
import { useState } from 'react';
import { DemoAvatar } from '@/components/demo-avatar';
import { Icon } from '@/components/icons';
import { MapVisual } from '@/components/map-visual';
import { activityItems, DemoOfficial } from '@/lib/demo-data';

const tabs = ['Overview', 'Votes', 'Bills', 'Campaign Finance', 'Committees', 'News', 'More'];

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
          {active === 'Overview' ? <Overview official={official} /> : <TabPlaceholder active={active} official={official} />}
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

function TabPlaceholder({ active, official }: { active: string; official: DemoOfficial }) {
  const title = active === 'Campaign Finance' ? 'Campaign finance' : active;
  return <section className="profile-card tab-panel"><span className="small-label">{title.toUpperCase()}</span><h2>{title} will be organized in this same profile.</h2><p>This interactive wireframe shows where structured, source-linked {title.toLowerCase()} records will live for {official.name}. It is deliberately using sample content until the production data pipeline is connected.</p><div className="tab-placeholder-lines"><span /><span /><span /><span /></div></section>;
}

function ProfileQuickActions() {
  return <section className="quick-action-card"><span className="small-label">TAKE ACTION</span><h2>Make your voice count.</h2><Link href="/sign-up/" className="quick-action blue"><Icon name="message" size={21} /><span><b>Contact an Official</b><small>Send a message with AI assistance</small></span><Icon name="chevron-right" size={17} /></Link><Link href="/petitions/" className="quick-action red"><Icon name="edit" size={21} /><span><b>Start a Petition</b><small>Create or support a public petition</small></span><Icon name="chevron-right" size={17} /></Link><button className="quick-action gray" type="button"><Icon name="share" size={21} /><span><b>Share this profile</b><small>Bring the record to your community</small></span><Icon name="chevron-right" size={17} /></button></section>;
}

function SparkChart() {
  return <svg className="spark-chart" viewBox="0 0 320 94" preserveAspectRatio="none" aria-label="Illustrative accountability score trend"><path d="M0 72H320M0 44H320M0 16H320" stroke="#E3E8F0" strokeWidth="1"/><path d="M0 67C22 68 31 59 50 62s24-13 43-8c19 5 22 1 41 5s26-10 44-7 25-2 40-17 25 7 39 3 22-13 33-16" fill="none" stroke="#E63946" strokeWidth="3" strokeLinecap="round"/><circle cx="132" cy="59" r="4" fill="#E63946"/><circle cx="279" cy="40" r="4" fill="#E63946"/></svg>;
}

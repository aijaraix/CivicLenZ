'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { DemoAvatar } from '@/components/demo-avatar';
import { Icon } from '@/components/icons';
import { MapVisual } from '@/components/map-visual';
import { demoOfficials, GovernmentLevel } from '@/lib/demo-data';

const filters: Array<'All' | GovernmentLevel> = ['All', 'Federal', 'State', 'Local', 'School Board'];

export function SearchExperience({ directory = false }: { directory?: boolean }) {
  const params = useSearchParams();
  const incomingAddress = params.get('address') ?? '1600 Pennsylvania Avenue NW, Washington, DC 20500';
  const [search, setSearch] = useState(incomingAddress);
  const [level, setLevel] = useState<'All' | GovernmentLevel>('All');
  const [submitted, setSubmitted] = useState(true);
  const result = useMemo(() => demoOfficials.filter((official) => level === 'All' || official.level === level), [level]);

  return (
    <section className="search-page">
      <div className="site-width">
        <div className="prototype-label"><Icon name="sparkles" size={15} /> Full UI prototype · all names, scores, activity, and petition counts on this branch are illustrative sample data.</div>
        <div className="search-topbar">
          <Link href="/" className="back-link"><Icon name="arrow-left" size={16} /> Back</Link>
          <form onSubmit={(event) => { event.preventDefault(); setSubmitted(true); }} className="search-master-input"><Icon name="search" size={18} /><input aria-label="Search by address, official, or location" value={search} onChange={(event) => setSearch(event.target.value)} /><button type="submit" aria-label="Search"><Icon name="arrow-right" size={18} /></button></form>
          <button className="round-action" type="button" aria-label="Saved address"><Icon name="check" size={18} /></button>
        </div>
        <div className="search-main-grid">
          <section className="official-results-panel">
            <div className="section-panel-heading"><div><span className="small-label">{directory ? 'OFFICIAL DIRECTORY' : 'YOUR ELECTED OFFICIALS'}</span><h1>{directory ? 'Explore public profiles' : 'Your elected officials'}</h1></div><span className="result-total">{result.length} shown</span></div>
            <div className="filter-tabs" role="tablist">{filters.map((filter) => <button key={filter} type="button" className={filter === level ? 'active' : ''} onClick={() => setLevel(filter)}>{filter}</button>)}</div>
            <div className="official-result-list">
              {submitted && result.map((official) => <article className="official-result" key={official.slug}><DemoAvatar official={official} size="md" /><div className="official-result-copy"><span>{official.level}</span><h2>{official.name}</h2><p>{official.title}</p><small>{official.party}</small></div><Link href={`/officials/${official.slug}/`} className="profile-arrow" aria-label={`View ${official.name} profile`}><Icon name="chevron-right" size={20} /></Link></article>)}
            </div>
            <Link href="/officials/" className="view-all-link">Explore all matching officials <Icon name="arrow-right" size={17} /></Link>
          </section>
          <aside className="representation-panel"><div className="section-panel-heading"><div><span className="small-label">WHERE THEY REPRESENT YOU</span><h2>Representation map</h2></div><Icon name="map" size={21} /></div><MapVisual /><div className="representation-address"><Icon name="pin" size={16} /><span>{search}</span></div></aside>
        </div>
      </div>
    </section>
  );
}

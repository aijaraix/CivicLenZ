'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { OfficialProfile } from '@/lib/officials';

function displayInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

export function OfficialDirectory({ officials }: { officials: OfficialProfile[] }) {
  const [query, setQuery] = useState('');
  const [level, setLevel] = useState<'all' | 'federal' | 'state'>('all');

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return officials.filter((official) => {
      if (level !== 'all' && official.office.governmentLevel !== level) return false;
      if (!normalizedQuery) return true;

      const searchable = [
        official.person.displayName,
        official.office.title,
        official.office.districtName,
        official.office.districtNumber,
        official.jurisdiction.name,
        official.party?.name,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchable.includes(normalizedQuery);
    });
  }, [officials, level, query]);

  return (
    <>
      <div className="search-panel">
        <input
          className="input"
          aria-label="Search officials"
          placeholder="Search by name, office, jurisdiction, or district"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>
      <div className="filter-row" aria-label="Filter officials">
        {(['all', 'federal', 'state'] as const).map((option) => {
          const active = level === option;
          return (
            <button
              className="filter-chip"
              style={active ? { color: '#fff', background: '#2563eb', borderColor: '#2563eb' } : undefined}
              type="button"
              key={option}
              onClick={() => setLevel(option)}
              aria-pressed={active}
            >
              {option === 'all' ? 'All Florida officials' : option === 'federal' ? 'Federal delegation' : 'State government'}
            </button>
          );
        })}
      </div>

      <div className="section-heading" style={{ marginTop: '2rem' }}>
        <div>
          <h2>{filtered.length} Florida official{filtered.length === 1 ? '' : 's'} indexed</h2>
        </div>
        <p>These cards are reviewed canonical profiles. Unreviewed collector extracts are not shown here.</p>
      </div>

      {filtered.length ? (
        <div className="official-grid">
          {filtered.map((official) => (
            <article className="card official-card" key={official.officialId}>
              <div className="official-card-top">
                <div className="avatar" aria-hidden="true">{displayInitials(official.person.displayName)}</div>
              </div>
              <div className="official-card-body">
                <div className="badges" style={{ justifyContent: 'flex-start' }}>
                  <span className={official.publicationStage === 'reviewed_profile' ? 'badge badge-green' : 'badge'}>
                    {official.publicationStage === 'reviewed_profile' ? 'Reviewed profile' : 'Baseline record'}
                  </span>
                </div>
                <h3>{official.person.displayName}</h3>
                <p>{official.office.title}</p>
                <p>{official.jurisdiction.name}</p>
                <div className="badges">
                  {official.party?.name ? <span className="badge badge-blue">{official.party.name}</span> : null}
                  <span className="badge badge-green">{official.office.governmentLevel.replaceAll('_', ' ')}</span>
                </div>
                <Link className="button button-primary" href={`/officials/${official.slug}/`}>
                  View sourced record
                </Link>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-state">No Florida officials match this search.</div>
      )}
    </>
  );
}

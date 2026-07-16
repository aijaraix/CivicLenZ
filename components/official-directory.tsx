'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { initials, type DirectoryEntry } from '@/lib/officials';

type ListingFilter = 'all' | 'profile' | 'source_listing';

const filters: Array<{ value: ListingFilter; label: string }> = [
  { value: 'all', label: 'All results' },
  { value: 'profile', label: 'Published profiles' },
  { value: 'source_listing', label: 'Source listings' },
];

function listingLabel(entry: DirectoryEntry): string {
  return entry.listingType === 'profile'
    ? 'Published CivicLenZ profile'
    : 'Florida Senate source listing';
}

export function OfficialDirectory({ entries }: { entries: DirectoryEntry[] }) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<ListingFilter>('all');

  const results = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return entries.filter((entry) => {
      const matchesType = filter === 'all' || entry.listingType === filter;
      if (!matchesType) return false;
      if (!normalizedQuery) return true;

      return [
        entry.displayName,
        entry.officeTitle,
        entry.jurisdictionName,
        entry.districtName ?? '',
        entry.partyName ?? '',
        entry.countyDescription ?? '',
      ]
        .join(' ')
        .toLowerCase()
        .includes(normalizedQuery);
    });
  }, [entries, filter, query]);

  return (
    <div className="directory-experience">
      <div className="directory-controls" aria-label="Search and filter official directory">
        <label className="directory-search">
          <span className="sr-only">Search the Florida official directory</span>
          <span aria-hidden="true">⌕</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search a name, office, district, county, or party"
          />
        </label>
        <div className="directory-filter-row" role="group" aria-label="Filter directory results">
          {filters.map((item) => (
            <button
              className={filter === item.value ? 'directory-filter is-active' : 'directory-filter'}
              key={item.value}
              onClick={() => setFilter(item.value)}
              type="button"
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="directory-results-meta" aria-live="polite">
        <strong>{results.length}</strong> result{results.length === 1 ? '' : 's'}
        {query ? <span> matching “{query}”</span> : null}
      </div>

      {results.length ? (
        <div className="directory-results">
          {results.map((entry) => (
            <article className={"directory-card directory-card--" + entry.listingType} key={entry.id}>
              <div className="directory-card-head">
                <div className="directory-avatar" aria-hidden="true">
                  {entry.portraitUrl ? <img alt="" src={entry.portraitUrl} /> : initials(entry.displayName)}
                </div>
                <div>
                  <span className="directory-status">{listingLabel(entry)}</span>
                  <h2>{entry.displayName}</h2>
                  <p>{entry.officeTitle}</p>
                </div>
              </div>

              <div className="directory-card-details">
                <span>{entry.jurisdictionName}</span>
                {entry.districtName ? <span>{entry.districtName}</span> : null}
                {entry.partyName ? <span>{entry.partyName}</span> : null}
              </div>

              {entry.listingType === 'source_listing' ? (
                <p className="directory-card-note">
                  Basic office information is linked to its primary Florida Senate source. Contact, social, biography, voting, and issue research are not yet published.
                </p>
              ) : (
                <p className="directory-card-note">
                  Review the available sources, profile status, and research coverage for this office-term record.
                </p>
              )}

              <div className="directory-card-actions">
                <Link className="button button-primary" href={"/officials/" + entry.slug + "/"}>
                  {entry.listingType === 'profile' ? 'View profile' : 'View source listing'}
                </Link>
                {entry.sourceUrl ? (
                  <a className="text-link" href={entry.sourceUrl} rel="noreferrer" target="_blank">
                    Original source ↗
                  </a>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="directory-empty">
          <strong>No matching directory records.</strong>
          <p>Try an official’s last name, a Florida Senate district, or clear the active filter.</p>
        </div>
      )}
    </div>
  );
}

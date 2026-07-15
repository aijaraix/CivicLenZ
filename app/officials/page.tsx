import Link from 'next/link';
import { getAllOfficials, initials } from '@/lib/officials';

export default function OfficialsPage() {
  const officials = getAllOfficials();

  return (
    <>
      <section className="page-hero">
        <div className="shell">
          <span className="eyebrow">Official directory</span>
          <h1>Find elected officials</h1>
          <p>
            Search and filters are being connected to the canonical JSON index. Every result represents one person in one office-term context.
          </p>
          <div className="search-panel">
            <input className="input" aria-label="Search officials" placeholder="Search by name, office, jurisdiction, district, or issue" />
            <button className="button button-primary" type="button">Search</button>
          </div>
          <div className="filter-row" aria-label="Browse by state">
            <span className="filter-chip">Florida</span>
            <span className="filter-chip">State officials</span>
            <span className="filter-chip">Current officeholders</span>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="shell">
          <div className="section-heading">
            <div>
              <h2>{officials.length} canonical result{officials.length === 1 ? '' : 's'}</h2>
            </div>
            <p>Scraper output is validated and reviewed before it appears here.</p>
          </div>
          {officials.length ? (
            <div className="official-grid">
              {officials.map((official) => (
                <article className="card official-card" key={official.officialId}>
                  <div className="official-card-top">
                    <div className="avatar" aria-hidden="true">{initials(official.person.displayName)}</div>
                  </div>
                  <div className="official-card-body">
                    <h3>{official.person.displayName}</h3>
                    <p>{official.office.title}</p>
                    <p>{official.jurisdiction.name}</p>
                    <div className="badges">
                      {official.party?.name ? <span className="badge badge-blue">{official.party.name}</span> : null}
                      <span className="badge badge-green">{official.office.governmentLevel.replaceAll('_', ' ')}</span>
                    </div>
                    <Link className="button button-primary" href={`/officials/${official.slug}/`}>
                      View sourced profile
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">No reviewed official profiles have been published yet.</div>
          )}
        </div>
      </section>
    </>
  );
}

import { OfficialDirectory } from '@/components/official-directory';
import { getDirectoryCoverage, getDirectoryEntries } from '@/lib/officials';

export default function OfficialsPage() {
  const entries = getDirectoryEntries();
  const coverage = getDirectoryCoverage();

  return (
    <>
      <section className="page-hero directory-hero">
        <div className="shell">
          <span className="eyebrow">Florida-first public directory</span>
          <h1>Find the people and offices that represent Florida.</h1>
          <p>
            CivicLenZ starts with primary public sources. A result can be a published, source-backed profile or a clearly labeled
            government-directory listing while deeper research is underway.
          </p>

          <div className="directory-coverage" aria-label="Current Florida directory coverage">
            <div>
              <strong>{coverage.total}</strong>
              <span>Florida directory records</span>
            </div>
            <div>
              <strong>{coverage.publishedProfiles}</strong>
              <span>Published profile{coverage.publishedProfiles === 1 ? '' : 's'}</span>
            </div>
            <div>
              <strong>{coverage.sourceListings}</strong>
              <span>Florida Senate source listings</span>
            </div>
          </div>
        </div>
      </section>

      <section className="section directory-section">
        <div className="shell">
          <div className="section-heading directory-heading">
            <div>
              <span className="eyebrow eyebrow-dark">Search the directory</span>
              <h2>Start with a name, district, office, county, or party.</h2>
            </div>
            <p>
              A source listing confirms only the directory facts shown on its original government page. It is not a finished profile,
              score, or judgment.
            </p>
          </div>

          <OfficialDirectory entries={entries} />

          <aside className="directory-disclosure">
            <strong>How coverage grows</strong>
            <p>
              Every official moves from primary-source listing to reviewed profile. Contact details, public accounts, biography,
              actions, finance, and issue evidence are each added with their own source trail—never guessed from a name or handle.
            </p>
          </aside>
        </div>
      </section>
    </>
  );
}

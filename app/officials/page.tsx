import { OfficialDirectory } from '@/components/official-directory';
import { getAllOfficials } from '@/lib/officials';

export default function OfficialsPage() {
  const officials = getAllOfficials();

  return (
    <>
      <section className="page-hero">
        <div className="shell">
          <span className="eyebrow">Florida official directory</span>
          <h1>Find the people representing Florida</h1>
          <p>
            CivicLenZ now publishes validated baseline records from official government directories while deeper research—contact details, biography, votes, promises, finance, and evidence—is completed.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="shell">
          <OfficialDirectory officials={officials} />
        </div>
      </section>
    </>
  );
}


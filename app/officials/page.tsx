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
            CivicLenZ publishes reviewed official profiles. Newly collected directory extracts remain in staging until a reviewer promotes them.
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

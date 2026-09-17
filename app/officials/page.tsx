import { OfficialDirectory } from '@/components/official-directory';
import { getCanonicalPublicOfficials } from '@/lib/civic-data/supabase-server';

export const dynamic = 'force-dynamic';

export default async function OfficialsPage() {
  const officials = await getCanonicalPublicOfficials();

  return (
    <>
      <section className="page-hero">
        <div className="shell">
          <span className="eyebrow">Florida official directory</span>
          <h1>Find the people representing Florida</h1>
          <p>
            CivicLenZ publishes canonical, publication-eligible official profiles. Unreviewed extracts remain private.
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

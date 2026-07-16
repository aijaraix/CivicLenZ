import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAllOfficials, getOfficialBySlug, humanize, initials } from '@/lib/officials';

export function generateStaticParams() {
  return getAllOfficials().map((official) => ({ slug: official.slug }));
}

export default async function OfficialProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const official = getOfficialBySlug(slug);
  if (!official) notFound();

  const scores = official.civicScores ?? [];
  const metrics = official.performanceMetrics ?? [];
  const trackers = official.issueTrackers ?? [];
  const website = official.websites?.find((item) => item.type === 'official');
  const isBaseline = official.publicationStage === 'baseline_record';
  const researchLabel = isBaseline ? 'Baseline record' : 'Reviewed profile';
  const sourceUrl = official.sourceMemberUrl || official.sourceUrl || website?.url;

  return (
    <>
      <section className="profile-hero">
        <div className="shell">
          <Link href="/officials/">← Back to officials</Link>
          <div className="profile-hero-grid">
            <div className="profile-avatar" aria-hidden="true">{initials(official.person.displayName)}</div>
            <div>
              <span className="eyebrow">Last collected {official.lastTrackedAt ? new Date(official.lastTrackedAt).toLocaleDateString() : 'pending'}</span>
              <h1>{official.person.displayName}</h1>
              <p className="profile-title">{official.office.title}</p>
              <div className="badges" style={{ justifyContent: 'flex-start' }}>
                {official.party?.name ? <span className="badge badge-blue">{official.party.name}</span> : null}
                <span className="badge badge-green">{humanize(official.office.governmentLevel)}</span>
                <span className="badge">{official.jurisdiction.name}</span>
              </div>
              <p className="profile-meta">
                {official.term?.startDate ? `Started ${official.term.startDate}` : 'Term dates pending source verification'}
                {official.term?.endDate ? ` · Ends ${official.term.endDate}` : ''}
              </p>
            </div>
            <aside className="meter-card">
              <div className="meter-value" style={{ fontSize: '1.35rem' }}>{researchLabel}</div>
              <div>{isBaseline ? 'Official-source identity and office data collected' : 'Structured profile under continuing research'}</div>
              <div className="progress-row">
                <span className={isBaseline ? 'badge' : 'badge badge-green'}>
                  {isBaseline ? 'Deep research queued' : 'Evidence review active'}
                </span>
              </div>
            </aside>
          </div>
        </div>
      </section>

      <section className="action-bar">
        <div className="shell action-grid">
          <div>
            <strong>Take Civic Action</strong>
            <div>Contact the office or follow verified civic activity.</div>
          </div>
          <div className="action-buttons">
            <button className="button button-danger" type="button">Start Petition</button>
            <button className="button button-success" type="button">Send AI-Powered Message</button>
          </div>
        </div>
      </section>

      <div className="shell profile-stack">
        <section className="card profile-card">
          <h2 className="card-title">Research Status</h2>
          <p className="card-subtitle">
            CivicLenZ separates official-source baseline facts from deeper biography, policy, finance, promise, integrity, and performance research.
          </p>
          <div className="detail-grid">
            <div><strong>Publication stage</strong><span>{researchLabel}</span></div>
            <div><strong>Data state</strong><span>{humanize(official.dataState ?? 'partially_verified')}</span></div>
            <div><strong>Source system</strong><span>{official.sourceKey ? humanize(official.sourceKey) : 'Canonical CivicLenZ record'}</span></div>
            {sourceUrl ? (
              <div>
                <strong>Primary official source</strong>
                <a href={sourceUrl} target="_blank" rel="noreferrer">Review source ↗</a>
              </div>
            ) : null}
          </div>
          {isBaseline ? (
            <div className="analysis-box" style={{ marginTop: '1rem' }}>
              <strong>What this means</strong><br />
              The person, office, district, party, and official source were collected from a government directory. No civic score or policy judgment is published until the supporting evidence has been gathered and reviewed.
            </div>
          ) : null}
        </section>

        <section className="card profile-card">
          <h2 className="card-title">Active Petitions</h2>
          <p className="card-subtitle">Current reviewed petitions seeking signatures for this office.</p>
          <div className="empty-state">No reviewed active petitions are attached to this profile.</div>
        </section>

        <section className="card profile-card">
          <h2 className="card-title">Contact Information</h2>
          <p className="card-subtitle">Official public contact channels with source verification.</p>
          {official.contactPoints?.length || website ? (
            <div className="detail-grid">
              {official.contactPoints?.map((contact, index) => (
                <div key={`${contact.type}-${index}`}>
                  <strong>{contact.label ?? humanize(contact.type)}</strong>
                  <span>{contact.value}</span>
                </div>
              ))}
              {website ? (
                <div>
                  <strong>Official website</strong>
                  <a href={website.url} target="_blank" rel="noreferrer">Visit source ↗</a>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="empty-state">Contact research is in progress.</div>
          )}
        </section>

        <section className="card profile-card">
          <h2 className="card-title">Civic Scores</h2>
          <p className="card-subtitle">Evidence-based performance metrics; ideological alignment is scored separately.</p>
          {scores.length ? (
            <div className="score-grid">
              {scores.map((score, index) => (
                <div className={`score ${['score-blue','score-green','score-purple','score-yellow'][index % 4]}`} key={score.scoreType}>
                  <strong>{score.value}%</strong>
                  <span>{humanize(score.scoreType)}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">Insufficient reviewed evidence to publish civic scores. No placeholder percentage is shown.</div>
          )}
          {metrics.map((metric) => (
            <div className="progress-row" key={metric.metricType}>
              <div className="progress-label"><span>{humanize(metric.metricType)}</span><strong>{metric.value}%</strong></div>
              <div className="progress"><span style={{ width: `${Math.max(0, Math.min(100, metric.value))}%` }} /></div>
            </div>
          ))}
        </section>

        <section className="card profile-card">
          <h2 className="card-title">Biography</h2>
          <p>{official.biography?.long ?? official.biography?.short ?? 'Biographical research is in progress.'}</p>
          <div className="detail-grid">
            <div><strong>Birthdate</strong><span>{official.biography?.birthDate ?? 'Not yet verified'}</span></div>
            <div><strong>Birthplace</strong><span>{official.biography?.birthplace ?? 'Not yet verified'}</span></div>
            <div><strong>Profile status</strong><span>{humanize(official.recordStatus)}</span></div>
          </div>
        </section>

        {trackers.length ? trackers.map((tracker) => (
          <section className="card policy-card" key={tracker.title}>
            <div className="section-heading">
              <div>
                <h3>{tracker.title}</h3>
                <p>{tracker.description}</p>
              </div>
              <span className="badge badge-yellow">{tracker.status}</span>
            </div>
            {typeof tracker.score === 'number' ? (
              <div className="progress-row">
                <div className="progress-label"><span>Alignment score</span><strong>{tracker.score}/100</strong></div>
                <div className="progress"><span style={{ width: `${tracker.score}%` }} /></div>
              </div>
            ) : null}
            <div className="analysis-box"><strong>AI analysis draft</strong><br />{tracker.analysis ?? 'Analysis awaits reviewed evidence.'}</div>
          </section>
        )) : (
          <section className="card profile-card">
            <h2 className="card-title">Issue Position Trackers</h2>
            <div className="empty-state">Issue research is in progress. No alignment score has been published.</div>
          </section>
        )}

        <section className="card profile-card">
          <h2 className="card-title">Campaign Finance & Promises</h2>
          <div className="empty-state">Finance ingestion and promise extraction are queued for the Florida enrichment pipeline.</div>
        </section>

        <section className="card profile-card">
          <h2 className="card-title">News & Real-Time Activity</h2>
          <div className="empty-state">Monitoring will begin after baseline aggregation and profile enrichment are complete.</div>
        </section>
      </div>
    </>
  );
}

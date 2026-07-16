import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  getAllOfficials,
  getOfficialBySlug,
  getSourceListedOfficialBySlug,
  getSourceListedOfficials,
  humanize,
  initials,
  type OfficialProfile,
  type SourceListedOfficial,
} from '@/lib/officials';

export function generateStaticParams() {
  return [
    ...getAllOfficials().map((official) => ({ slug: official.slug })),
    ...getSourceListedOfficials().map((official) => ({ slug: official.slug })),
  ];
}

function formatDate(value?: string | null) {
  if (!value) return 'Not yet available';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? value
    : new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(parsed);
}

function accountTypeLabel(value?: string | null) {
  const labels: Record<string, string> = {
    office: 'Office account',
    official: 'Official public account',
    campaign: 'Campaign account',
    personal: 'Personal public account',
    other: 'Public account',
    unclassified: 'Classification under review',
  };
  return value ? labels[value] ?? humanize(value) : 'Public account';
}

function contactLink(value: string) {
  return /^https?:\/\//i.test(value) ? value : undefined;
}

function SourceListedProfile({ official }: { official: SourceListedOfficial }) {
  return (
    <>
      <section className="profile-hero source-listing-hero">
        <div className="shell">
          <Link href="/officials/">← Back to officials</Link>
          <div className="profile-hero-grid">
            <div className="profile-avatar" aria-hidden="true">{initials(official.displayName)}</div>
            <div>
              <span className="eyebrow">Primary-source directory listing</span>
              <h1>{official.displayName}</h1>
              <p className="profile-title">{official.officeTitle}</p>
              <div className="badges" style={{ justifyContent: 'flex-start' }}>
                {official.partyName ? <span className="badge badge-blue">{official.partyName}</span> : null}
                <span className="badge badge-green">{humanize(official.governmentLevel)}</span>
                <span className="badge">{official.jurisdictionName}</span>
              </div>
              {official.countyDescription ? <p className="profile-meta">{official.countyDescription}</p> : null}
            </div>
            <aside className="meter-card source-listing-meter">
              <strong>Source listing</strong>
              <span>Basic office facts are linked to the original government directory page.</span>
              <span>Full profile research is in progress.</span>
            </aside>
          </div>
        </div>
      </section>

      <div className="shell profile-stack">
        <section className="card profile-card">
          <h2 className="card-title">What CivicLenZ has confirmed so far</h2>
          <p className="card-subtitle">This is a directory record, not a completed CivicLenZ evaluation.</p>
          <div className="detail-grid">
            <div><strong>Office</strong><span>{official.officeTitle}</span></div>
            <div><strong>Jurisdiction</strong><span>{official.jurisdictionName}</span></div>
            {official.districtName ? <div><strong>District</strong><span>{official.districtName}</span></div> : null}
            {official.partyName ? <div><strong>Party</strong><span>{official.partyName}</span></div> : null}
            <div><strong>Source checked</strong><span>{formatDate(official.fetchedAt)}</span></div>
          </div>
        </section>

        <section className="card profile-card">
          <h2 className="card-title">Original government source</h2>
          <p>
            CivicLenZ found this listing in an official Florida government directory. You can inspect the original record
            before relying on this record.
          </p>
          <div className="profile-action-row">
            <a className="button button-primary" href={official.sourceUrl} rel="noreferrer" target="_blank">Open government source ↗</a>
            <a className="text-link" href={official.sourceDirectoryUrl} rel="noreferrer" target="_blank">View the Senate directory ↗</a>
          </div>
        </section>

        <section className="card profile-card">
          <h2 className="card-title">Research status</h2>
          <div className="research-status-grid">
            <div><strong>✓ Identity and office</strong><span>Listed by an official Florida government directory.</span></div>
            <div><strong>○ Contact and public accounts</strong><span>Not yet reviewed for publication.</span></div>
            <div><strong>○ Biography and public service</strong><span>Research in progress.</span></div>
            <div><strong>○ Actions, votes, promises, and finance</strong><span>Not yet researched for this profile.</span></div>
          </div>
        </section>
      </div>
    </>
  );
}

function CanonicalProfile({ official }: { official: OfficialProfile }) {
  const scores = official.civicScores ?? [];
  const metrics = official.performanceMetrics ?? [];
  const trackers = official.issueTrackers ?? [];
  const officialWebsite = official.websites?.find((item) => item.type === 'official');
  const contactForm = official.contactPoints?.find((item) => item.type === 'contact_form');
  const contactUrl = contactForm ? contactLink(contactForm.value) : official.websites?.find((item) => item.type === 'contact')?.url;
  const sources = official.sourceReferences ?? [];
  const accounts = official.socialAccounts ?? [];

  return (
    <>
      <section className="profile-hero">
        <div className="shell">
          <Link href="/officials/">← Back to officials</Link>
          <div className="profile-hero-grid">
            <div className="profile-avatar profile-portrait" aria-hidden="true">
              {official.person.portraitUrl ? <img alt="" src={official.person.portraitUrl} /> : initials(official.person.displayName)}
            </div>
            <div>
              <span className="eyebrow">Last source check {formatDate(official.lastTrackedAt)}</span>
              <h1>{official.person.displayName}</h1>
              <p className="profile-title">{official.office.title}</p>
              <div className="badges" style={{ justifyContent: 'flex-start' }}>
                {official.party?.name ? <span className="badge badge-blue">{official.party.name}</span> : null}
                <span className="badge badge-green">{humanize(official.office.governmentLevel)}</span>
                <span className="badge">{official.jurisdiction.name}</span>
              </div>
              <p className="profile-meta">
                {official.term?.startDate ? 'Started ' + formatDate(official.term.startDate) : 'Term dates are being verified'}
                {official.term?.endDate ? ' · Ends ' + formatDate(official.term.endDate) : ''}
              </p>
            </div>
            <aside className="meter-card">
              <div className="meter-value">{official.profileCompleteness ?? 0}%</div>
              <div>Profile coverage</div>
              <div className="progress-row">
                <div className="progress"><span style={{ width: (official.profileCompleteness ?? 0) + '%' }} /></div>
              </div>
              <span className="profile-data-state">{humanize(official.dataState ?? 'unknown')}</span>
            </aside>
          </div>
        </div>
      </section>

      <section className="action-bar">
        <div className="shell action-grid">
          <div>
            <strong>Use the public record</strong>
            <div>Inspect sources, contact the public office, or follow coverage as the research expands.</div>
          </div>
          <div className="action-buttons">
            {contactUrl ? <a className="button button-primary" href={contactUrl} rel="noreferrer" target="_blank">Contact official office ↗</a> : null}
            <Link className="button button-outline" href="/research/">See research standards</Link>
          </div>
        </div>
      </section>

      <div className="shell profile-stack">
        <section className="card profile-card profile-status-card">
          <div className="section-heading">
            <div>
              <span className="eyebrow eyebrow-dark">Profile status</span>
              <h2>What is available, and what is still being researched</h2>
            </div>
            <p>Every section has its own source trail and may have a different level of coverage.</p>
          </div>
          <div className="research-status-grid">
            <div><strong>✓ Source-linked office record</strong><span>Identity, current office, and primary sources are present.</span></div>
            <div><strong>✓ Public contact research</strong><span>Only official channels are displayed.</span></div>
            <div><strong>○ Actions and public records</strong><span>Collection is being connected office by office.</span></div>
            <div><strong>○ Scores and promise review</strong><span>Not published without a documented methodology and evidence.</span></div>
          </div>
        </section>

        <section className="card profile-card">
          <h2 className="card-title">Contact information</h2>
          <p className="card-subtitle">Official public contact channels only. Last checks stay visible.</p>
          {official.contactPoints?.length || official.officeLocations?.length || officialWebsite ? (
            <div className="detail-grid">
              {official.contactPoints?.map((contact, index) => {
                const href = contactLink(contact.value);
                return (
                  <div key={contact.type + '-' + index}>
                    <strong>{contact.label ?? humanize(contact.type)}</strong>
                    {href ? <a href={href} rel="noreferrer" target="_blank">Open official channel ↗</a> : <span>{contact.value}</span>}
                    {contact.verifiedAt ? <small>Checked {formatDate(contact.verifiedAt)}</small> : null}
                  </div>
                );
              })}
              {official.officeLocations?.map((location, index) => (
                <div key={location.type + '-' + index}>
                  <strong>{location.label ?? humanize(location.type)}</strong>
                  <span>{location.address}</span>
                </div>
              ))}
              {officialWebsite ? (
                <div>
                  <strong>Official website</strong>
                  <a href={officialWebsite.url} rel="noreferrer" target="_blank">Visit official source ↗</a>
                  {officialWebsite.verifiedAt ? <small>Checked {formatDate(officialWebsite.verifiedAt)}</small> : null}
                </div>
              ) : null}
            </div>
          ) : (
            <div className="empty-state">Official contact research is in progress.</div>
          )}
        </section>

        <section className="card profile-card">
          <h2 className="card-title">Public social accounts</h2>
          <p className="card-subtitle">Accounts appear only when an official or campaign source supports their association.</p>
          {accounts.length ? (
            <div className="social-account-grid">
              {accounts.map((account, index) => (
                <article className="social-account" key={account.platform + '-' + account.url + '-' + index}>
                  <div>
                    <span className="social-platform">{account.platform}</span>
                    <strong>{account.handle ? '@' + account.handle.replace(/^@/, '') : account.platform + ' channel'}</strong>
                    <small>{accountTypeLabel(account.accountType)}</small>
                  </div>
                  <a href={account.url} rel="noreferrer" target="_blank">Open ↗</a>
                  <div className="social-account-proof">
                    {account.sourceUrl ? <a href={account.sourceUrl} rel="noreferrer" target="_blank">Supporting source ↗</a> : <span>Source review required</span>}
                    {account.lastCheckedAt ? <span>Checked {formatDate(account.lastCheckedAt)}</span> : null}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">Public-account research is in progress. CivicLenZ does not guess handles from a name.</div>
          )}
        </section>

        <section className="card profile-card">
          <h2 className="card-title">Biography and public service</h2>
          <p>{official.biography?.short ?? 'Biographical research is in progress.'}</p>
          {official.biography?.long ? <p>{official.biography.long}</p> : null}
          <div className="detail-grid">
            <div><strong>Birthdate</strong><span>{official.biography?.birthDate ?? 'Not yet verified'}</span></div>
            <div><strong>Birthplace</strong><span>{official.biography?.birthplace ?? 'Not yet verified'}</span></div>
            <div><strong>Record status</strong><span>{humanize(official.recordStatus)}</span></div>
          </div>
        </section>

        <section className="card profile-card">
          <h2 className="card-title">Sources on this profile</h2>
          <p className="card-subtitle">Open the original source before relying on a CivicLenZ summary.</p>
          {sources.length ? (
            <ul className="profile-source-list">
              {sources.map((source, index) => (
                <li key={source.url + '-' + index}>
                  <a href={source.url} rel="noreferrer" target="_blank">{source.label} ↗</a>
                  <span>{source.publisher ?? 'Primary public source'}</span>
                  {source.fields?.length ? <small>{source.fields.join(' · ')}</small> : null}
                  {source.checkedAt ? <small>Checked {formatDate(source.checkedAt)}</small> : null}
                </li>
              ))}
            </ul>
          ) : (
            <div className="empty-state">Source references are being attached to this profile.</div>
          )}
        </section>

        <section className="card profile-card">
          <h2 className="card-title">Civic scores</h2>
          <p className="card-subtitle">Scores require a published methodology, evidence links, completeness, and review.</p>
          {scores.length ? (
            <div className="score-grid">
              {scores.map((score, index) => (
                <div className={'score ' + ['score-blue', 'score-green', 'score-purple', 'score-yellow'][index % 4]} key={score.scoreType}>
                  <strong>{score.value}%</strong>
                  <span>{humanize(score.scoreType)}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">Insufficient reviewed evidence to publish civic scores.</div>
          )}
          {metrics.map((metric) => (
            <div className="progress-row" key={metric.metricType}>
              <div className="progress-label"><span>{humanize(metric.metricType)}</span><strong>{metric.value}%</strong></div>
              <div className="progress"><span style={{ width: Math.max(0, Math.min(100, metric.value)) + '%' }} /></div>
            </div>
          ))}
        </section>

        {trackers.length ? trackers.map((tracker) => (
          <section className="card policy-card" key={tracker.title}>
            <div className="section-heading">
              <div><h3>{tracker.title}</h3><p>{tracker.description}</p></div>
              <span className="badge badge-yellow">{tracker.status}</span>
            </div>
            {typeof tracker.score === 'number' ? (
              <div className="progress-row">
                <div className="progress-label"><span>Evidence coverage score</span><strong>{tracker.score}/100</strong></div>
                <div className="progress"><span style={{ width: tracker.score + '%' }} /></div>
              </div>
            ) : null}
            {tracker.analysis ? <div className="analysis-box"><strong>Reviewed summary</strong><br />{tracker.analysis}</div> : <div className="empty-state">No summary is published until its evidence is reviewed.</div>}
          </section>
        )) : (
          <section className="card profile-card">
            <h2 className="card-title">Issue, promise, and action research</h2>
            <div className="empty-state">Not yet researched. CivicLenZ will publish source-backed actions, statements, and promise evidence—not automated judgments without records.</div>
          </section>
        )}

        <section className="card profile-card">
          <h2 className="card-title">Campaign finance and public records</h2>
          <div className="empty-state">Finance, filing, and public-record collection is scheduled after office and identity coverage is complete.</div>
        </section>
      </div>
    </>
  );
}

export default async function OfficialProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const canonical = getOfficialBySlug(slug);
  if (canonical) return <CanonicalProfile official={canonical} />;

  const sourceListed = getSourceListedOfficialBySlug(slug);
  if (sourceListed) return <SourceListedProfile official={sourceListed} />;

  notFound();
}

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAllOfficials, getOfficialBySlug, humanize, initials } from '@/lib/officials';

const standardTrackers = [
  {
    title: 'MAHA Position Tracker',
    description: 'Pharmaceutical policy, food quality, agriculture, chronic disease, and child-health positions.',
  },
  {
    title: 'DOGE / Government Efficiency',
    description: 'Spending, staffing, procurement, program duplication, bureaucracy, and efficiency actions.',
  },
  {
    title: 'Border & Immigration',
    description: 'Border security, immigration enforcement, lawful pathways, sanctuary policy, and related actions.',
  },
  {
    title: 'Energy Independence',
    description: 'Energy production, utilities, permitting, renewables, climate policy, and consumer costs.',
  },
  {
    title: 'Trade & Tariffs',
    description: 'Tariffs, trade agreements, manufacturing, supply chains, exports, and economic development.',
  },
  {
    title: 'Education & School Choice',
    description: 'Public education, school choice, curriculum, student services, funding, and workforce preparation.',
  },
  {
    title: 'Fraud & Integrity Monitor',
    description: 'Ethics, disclosures, conflicts, public-record compliance, investigations, findings, and corrective action.',
  },
];

function formatMoney(value?: number | null) {
  if (typeof value !== 'number') return 'Not yet collected';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
}

function Placeholder({ children }: { children: React.ReactNode }) {
  return <div className="empty-state">{children}</div>;
}

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
  const seatName = official.seat?.seatName || official.office.seatName || official.office.title;
  const occupancyStatus = official.seat?.occupancyStatus ?? (official.term?.currentStatus === 'vacant' ? 'vacant' : 'occupied');
  const portrait = official.person.portraitUrl;
  const promiseCounts = (official.promises ?? []).reduce<Record<string, number>>((acc, promise) => {
    acc[promise.status] = (acc[promise.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <>
      <section className="profile-hero">
        <div className="shell">
          <Link href="/officials/">← Back to officials</Link>
          <div className="profile-hero-grid">
            {portrait ? (
              <img
                className="profile-avatar"
                src={portrait}
                alt={`${official.person.displayName} official portrait`}
                style={{ objectFit: 'cover' }}
              />
            ) : (
              <div className="profile-avatar" aria-label="Official portrait collection queued">
                {initials(official.person.displayName)}
              </div>
            )}
            <div>
              <span className="eyebrow">Seat record · last collected {official.lastTrackedAt ? new Date(official.lastTrackedAt).toLocaleDateString() : 'pending'}</span>
              <h1>{official.person.displayName}</h1>
              <p className="profile-title">Current occupant of {seatName}</p>
              <div className="badges" style={{ justifyContent: 'flex-start' }}>
                {official.party?.name ? <span className="badge badge-blue">{official.party.name}</span> : null}
                <span className="badge badge-green">{humanize(official.office.governmentLevel)}</span>
                <span className="badge">{official.jurisdiction.name}</span>
                <span className={occupancyStatus === 'occupied' ? 'badge badge-green' : 'badge badge-yellow'}>{humanize(occupancyStatus)}</span>
              </div>
              <p className="profile-meta">
                {official.term?.startDate ? `Term began ${official.term.startDate}` : 'Term start awaiting source verification'}
                {official.term?.endDate ? ` · Scheduled end ${official.term.endDate}` : ''}
              </p>
              {!portrait ? <p className="profile-meta">Official portrait discovery and licensing review are queued.</p> : null}
            </div>
            <aside className="meter-card">
              <div className="meter-value" style={{ fontSize: '1.35rem' }}>{researchLabel}</div>
              <div>{isBaseline ? 'Seat and current officeholder identified from an official source' : 'Structured seat record under continuing research'}</div>
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
            <div>Contact the office, follow this seat, or submit evidence for review.</div>
          </div>
          <div className="action-buttons">
            <button className="button button-danger" type="button">Start Petition</button>
            <button className="button button-success" type="button">Send AI-Powered Message</button>
          </div>
        </div>
      </section>

      <div className="shell profile-stack">
        <section className="card profile-card">
          <h2 className="card-title">Seat & Current Occupancy</h2>
          <p className="card-subtitle">CivicLenZ monitors the elected seat continuously and attaches each officeholder to a distinct term.</p>
          <div className="detail-grid">
            <div><strong>Seat</strong><span>{seatName}</span></div>
            <div><strong>Current officeholder</strong><span>{official.person.displayName}</span></div>
            <div><strong>Occupancy</strong><span>{humanize(occupancyStatus)}</span></div>
            <div><strong>Branch</strong><span>{official.office.branch ? humanize(official.office.branch) : 'Not yet verified'}</span></div>
            <div><strong>District</strong><span>{official.office.districtName ?? official.jurisdiction.name}</span></div>
            <div><strong>Seat identifier</strong><span>{official.seat?.seatId ?? official.office.officeId ?? 'Being assigned'}</span></div>
            <div><strong>How filled</strong><span>{official.term?.electedOrAppointed ? humanize(official.term.electedOrAppointed) : 'Election or succession review queued'}</span></div>
            <div><strong>Next election</strong><span>{official.seat?.nextElectionDate ?? 'Election calendar research queued'}</span></div>
            <div><strong>Previous occupants</strong><span>{official.seat?.previousOccupants?.length ?? 0} indexed</span></div>
          </div>
          <div className="analysis-box" style={{ marginTop: '1rem' }}>
            <strong>Seat-first recordkeeping</strong><br />
            When the person changes, the seat remains. CivicLenZ closes the previous term, preserves its evidence and scores, then opens a new term for the incoming officeholder.
          </div>
        </section>

        <section className="card profile-card">
          <h2 className="card-title">Research Status & Evidence</h2>
          <p className="card-subtitle">Every claim, quotation, score, promise status, and action must point back to preserved evidence.</p>
          <div className="detail-grid">
            <div><strong>Publication stage</strong><span>{researchLabel}</span></div>
            <div><strong>Data state</strong><span>{humanize(official.dataState ?? 'partially_verified')}</span></div>
            <div><strong>Source system</strong><span>{official.sourceKey ? humanize(official.sourceKey) : 'Canonical CivicLenZ record'}</span></div>
            <div><strong>Source snapshot</strong><span>{official.sourceSnapshotSha256 ? `${official.sourceSnapshotSha256.slice(0, 16)}…` : 'Snapshot queued'}</span></div>
            {sourceUrl ? (
              <div>
                <strong>Primary official source</strong>
                <a href={sourceUrl} target="_blank" rel="noreferrer">Review source ↗</a>
              </div>
            ) : null}
            <div><strong>Corrections</strong><span>Evidence-backed correction workflow enabled</span></div>
          </div>
        </section>

        <section className="card profile-card">
          <h2 className="card-title">Active Petitions</h2>
          <p className="card-subtitle">Moderated civic petitions associated with this seat.</p>
          {official.petitions?.length ? (
            <div className="detail-grid">
              {official.petitions.map((petition, index) => (
                <div key={`${petition.title}-${index}`}><strong>{petition.title}</strong><span>{petition.signatureCount ?? 0} signatures · {humanize(petition.status ?? 'active')}</span></div>
              ))}
            </div>
          ) : <Placeholder>No reviewed active petitions are attached to this seat.</Placeholder>}
        </section>

        <section className="card profile-card">
          <h2 className="card-title">Contact Information & Public Channels</h2>
          <p className="card-subtitle">Official phones, email, offices, websites, newsletters, contact forms, and social accounts.</p>
          {official.contactPoints?.length || official.officeLocations?.length || official.socialAccounts?.length || website ? (
            <div className="detail-grid">
              {official.contactPoints?.map((contact, index) => (
                <div key={`${contact.type}-${index}`}><strong>{contact.label ?? humanize(contact.type)}</strong><span>{contact.value}</span></div>
              ))}
              {official.officeLocations?.map((location, index) => (
                <div key={`${location.address}-${index}`}><strong>{location.label ?? humanize(location.type)}</strong><span>{location.address}</span></div>
              ))}
              {official.socialAccounts?.map((social, index) => (
                <div key={`${social.platform}-${index}`}><strong>{social.platform}</strong><a href={social.url} target="_blank" rel="noreferrer">{social.handle ?? 'Open account'} ↗</a></div>
              ))}
              {website ? <div><strong>Official website</strong><a href={website.url} target="_blank" rel="noreferrer">Visit source ↗</a></div> : null}
            </div>
          ) : <Placeholder>Official contact, district-office, newsletter, and social-account research is in progress.</Placeholder>}
        </section>

        <section className="card profile-card">
          <h2 className="card-title">Biography, Education, Military & Career</h2>
          <p>{official.biography?.long ?? official.biography?.short ?? 'Biographical research is in progress.'}</p>
          <div className="detail-grid">
            <div><strong>Birthdate</strong><span>{official.biography?.birthDate ?? 'Not yet verified'}</span></div>
            <div><strong>Birthplace</strong><span>{official.biography?.birthplace ?? 'Not yet verified'}</span></div>
            <div><strong>Hometown</strong><span>{official.biography?.hometown ?? 'Not yet verified'}</span></div>
            <div><strong>Education records</strong><span>{official.education?.length ?? 0} collected</span></div>
            <div><strong>Military records</strong><span>{official.militaryService?.length ?? 0} collected</span></div>
            <div><strong>Career records</strong><span>{official.careerHistory?.length ?? 0} collected</span></div>
            <div><strong>Prior political roles</strong><span>{official.politicalHistory?.length ?? 0} collected</span></div>
            <div><strong>Family summary</strong><span>{official.biography?.publicFamilySummary ?? 'Public-source review queued'}</span></div>
            <div><strong>Portrait provenance</strong><span>{portrait ? official.person.portraitCredit ?? 'Official source recorded' : 'Official/licensed portrait queued'}</span></div>
          </div>
        </section>

        <section className="card profile-card">
          <h2 className="card-title">Election & Term History</h2>
          <p className="card-subtitle">Campaigns, opponents, results, margins, appointments, vacancies, succession, and prior terms.</p>
          {official.elections?.length ? (
            <div className="detail-grid">
              {official.elections.map((election, index) => (
                <div key={`${election.date}-${index}`}><strong>{election.date} · {election.officeTitle}</strong><span>{election.result ?? 'Result pending'}{typeof election.votePercentage === 'number' ? ` · ${election.votePercentage}%` : ''}</span></div>
              ))}
            </div>
          ) : <Placeholder>Election results, opponents, vote totals, margins, and prior terms have not yet been attached.</Placeholder>}
        </section>

        <section className="card profile-card">
          <h2 className="card-title">Committees, Leadership & Appointments</h2>
          <p className="card-subtitle">Current and former committees, caucuses, boards, commissions, leadership posts, and appointments.</p>
          {official.committeesAndAppointments?.length ? (
            <div className="detail-grid">
              {official.committeesAndAppointments.map((role, index) => (
                <div key={`${role.name}-${index}`}><strong>{role.name}</strong><span>{role.title ?? humanize(role.roleType)}{role.current === false ? ' · Former' : ''}</span></div>
              ))}
            </div>
          ) : <Placeholder>Committee, leadership, caucus, board, and appointment research is queued.</Placeholder>}
        </section>

        <section className="card profile-card">
          <h2 className="card-title">Campaign Promise Tracker</h2>
          <p className="card-subtitle">Every attributable commitment is stored with the exact words, date, context, archived evidence, measurable target, and status history.</p>
          <div className="score-grid">
            <div className="score score-green"><strong>{promiseCounts.kept ?? 0}</strong><span>Kept</span></div>
            <div className="score score-blue"><strong>{promiseCounts.in_progress ?? 0}</strong><span>In progress</span></div>
            <div className="score score-yellow"><strong>{promiseCounts.partially_kept ?? 0}</strong><span>Partially kept</span></div>
            <div className="score score-purple"><strong>{promiseCounts.broken ?? 0}</strong><span>Broken</span></div>
          </div>
          {official.promises?.length ? (
            <div style={{ display: 'grid', gap: '12px', marginTop: '1rem' }}>
              {official.promises.map((promise, index) => (
                <article className="analysis-box" key={`${promise.title}-${index}`}>
                  <strong>{promise.title}</strong><br />
                  “{promise.exactText}”<br />
                  <span>{humanize(promise.status)}{typeof promise.progressPercentage === 'number' ? ` · ${promise.progressPercentage}%` : ''}{promise.date ? ` · ${promise.date}` : ''}</span>
                </article>
              ))}
            </div>
          ) : <Placeholder>No promises have been extracted yet. Campaign sites, debates, speeches, advertisements, interviews, newsletters, press releases, and attributable social posts are queued for evidence capture.</Placeholder>}
        </section>

        <section className="card profile-card">
          <h2 className="card-title">Quotes & Public Statements</h2>
          <p className="card-subtitle">Exact quotations with date, venue, transcript timestamp, topic tags, context, and preserved source.</p>
          {official.statements?.length ? (
            <div style={{ display: 'grid', gap: '12px' }}>
              {official.statements.map((statement, index) => (
                <article className="analysis-box" key={`${statement.statementDate}-${index}`}>
                  “{statement.exactQuote}”<br /><span>{statement.statementDate}{statement.venue ? ` · ${statement.venue}` : ''}</span>
                </article>
              ))}
            </div>
          ) : <Placeholder>Speech, debate, interview, hearing, press-conference, newsletter, and social-statement extraction is queued.</Placeholder>}
        </section>

        <section className="card profile-card">
          <h2 className="card-title">Actions, Decisions, Bills & Votes</h2>
          <p className="card-subtitle">Sponsored legislation, votes, executive orders, vetoes, budgets, appointments, contracts, rulemaking, and other official decisions.</p>
          {official.governmentActions?.length ? (
            <div className="detail-grid">
              {official.governmentActions.map((action, index) => (
                <div key={`${action.title}-${index}`}><strong>{action.title}</strong><span>{humanize(action.actionType)}{action.date ? ` · ${action.date}` : ''}{action.status ? ` · ${humanize(action.status)}` : ''}</span></div>
              ))}
            </div>
          ) : <Placeholder>Legislative, executive, budget, appointment, procurement, regulatory, and voting records are queued.</Placeholder>}
        </section>

        <section className="card profile-card">
          <h2 className="card-title">Campaign & Political Finance</h2>
          <p className="card-subtitle">Receipts, expenditures, cash, debt, committees, donors, industries, outside support, and outside opposition.</p>
          <div className="score-grid">
            <div className="score score-green"><strong>{formatMoney(official.campaignFinanceSummary?.totalRaised)}</strong><span>Total raised</span></div>
            <div className="score score-purple"><strong>{formatMoney(official.campaignFinanceSummary?.totalSpent)}</strong><span>Total spent</span></div>
            <div className="score score-blue"><strong>{formatMoney(official.campaignFinanceSummary?.cashOnHand)}</strong><span>Cash on hand</span></div>
            <div className="score score-yellow"><strong>{formatMoney(official.campaignFinanceSummary?.debt)}</strong><span>Debt</span></div>
          </div>
          {!official.campaignFinanceSummary ? <Placeholder>State and federal campaign-finance ingestion is queued for this officeholder and election cycle.</Placeholder> : null}
        </section>

        <section className="card profile-card">
          <h2 className="card-title">Civic Scores & Performance Metrics</h2>
          <p className="card-subtitle">Scores are published only after the methodology, denominator, time period, completeness, and evidence are available.</p>
          {scores.length ? (
            <div className="score-grid">
              {scores.map((score, index) => (
                <div className={`score ${['score-blue','score-green','score-purple','score-yellow'][index % 4]}`} key={score.scoreType}>
                  <strong>{score.value}%</strong><span>{humanize(score.scoreType)}</span>
                </div>
              ))}
            </div>
          ) : <Placeholder>Insufficient reviewed evidence to publish transparency, responsiveness, promise-keeping, civic, attendance, or effectiveness scores. No placeholder percentage is shown.</Placeholder>}
          {metrics.map((metric) => (
            <div className="progress-row" key={metric.metricType}>
              <div className="progress-label"><span>{humanize(metric.metricType)}</span><strong>{metric.value}%</strong></div>
              <div className="progress"><span style={{ width: `${Math.max(0, Math.min(100, metric.value))}%` }} /></div>
            </div>
          ))}
        </section>

        <section className="card profile-card">
          <h2 className="card-title">Issue Position Trackers</h2>
          <p className="card-subtitle">The same tracker framework appears for every seat. A tracker can be marked not applicable, unknown, mixed, supportive, or opposed only after evidence review.</p>
        </section>

        {standardTrackers.map((standard) => {
          const tracker = trackers.find((item) => item.title.toLowerCase().includes(standard.title.split(' ')[0].toLowerCase()));
          return (
            <section className="card policy-card" key={standard.title}>
              <div className="section-heading">
                <div><h3>{tracker?.title ?? standard.title}</h3><p>{tracker?.description ?? standard.description}</p></div>
                <span className="badge badge-yellow">{tracker?.status ?? 'Not yet evaluated'}</span>
              </div>
              {typeof tracker?.score === 'number' ? (
                <div className="progress-row">
                  <div className="progress-label"><span>Alignment score</span><strong>{tracker.score}/100</strong></div>
                  <div className="progress"><span style={{ width: `${tracker.score}%` }} /></div>
                </div>
              ) : null}
              <div className="analysis-box"><strong>Evidence analysis</strong><br />{tracker?.analysis ?? 'Quotes, votes, bills, actions, decisions, and official responses have not yet been fully collected and reviewed for this tracker.'}</div>
              {tracker?.pillars?.length ? (
                <div className="detail-grid">
                  {tracker.pillars.map((pillar) => <div key={pillar.name}><strong>{pillar.name}</strong><span>{pillar.status}{typeof pillar.score === 'number' ? ` · ${pillar.score}/100` : ''}</span></div>)}
                </div>
              ) : null}
            </section>
          );
        })}

        <section className="card profile-card">
          <h2 className="card-title">Financial Disclosures & Business Interests</h2>
          <p className="card-subtitle">Required filings, assets, liabilities, income sources, real property, gifts, travel, businesses, and amendments.</p>
          {official.financialDisclosures?.length ? (
            <div className="detail-grid">
              {official.financialDisclosures.map((disclosure, index) => (
                <div key={`${disclosure.period}-${index}`}><strong>{disclosure.period}</strong><span>Filed {disclosure.filingDate ?? 'date pending'} · assets and interests indexed</span></div>
              ))}
            </div>
          ) : <Placeholder>Disclosure-calendar matching, document download, OCR, extraction, and human review are queued.</Placeholder>}
        </section>

        <section className="card profile-card">
          <h2 className="card-title">Ethics, Integrity & Legal Record</h2>
          <p className="card-subtitle">Complaints, investigations, charges, findings, settlements, dismissals, acquittals, appeals, and official responses are labeled by procedural status.</p>
          {official.integrityMatters?.length ? (
            <div className="detail-grid">
              {official.integrityMatters.map((matter, index) => (
                <div key={`${matter.title}-${index}`}><strong>{matter.title}</strong><span>{humanize(matter.proceduralStatus)}{matter.authority ? ` · ${matter.authority}` : ''}</span></div>
              ))}
            </div>
          ) : <Placeholder>No reviewed integrity matter is attached. This does not mean none exists; official ethics, court, audit, inspector-general, and enforcement sources are queued.</Placeholder>}
        </section>

        <section className="card profile-card">
          <h2 className="card-title">Relationships, Endorsements & Potential Conflicts</h2>
          <p className="card-subtitle">Public organizational roles, donors, endorsements, family business interests, employers, lobby relationships, and other relevant connections.</p>
          {official.relationships?.length ? (
            <div className="detail-grid">
              {official.relationships.map((relationship, index) => (
                <div key={`${relationship.relatedName}-${index}`}><strong>{relationship.relatedName}</strong><span>{humanize(relationship.relationshipType)}{relationship.conflictFlag ? ' · Review flag' : ''}</span></div>
              ))}
            </div>
          ) : <Placeholder>Relationship mapping and conflict-of-interest comparison are queued and will require source-backed relevance.</Placeholder>}
        </section>

        <section className="card profile-card">
          <h2 className="card-title">News & Real-Time Activity</h2>
          <p className="card-subtitle">Official announcements, votes, filings, statements, meetings, news coverage, corrections, and significant seat changes.</p>
          {official.newsAndMedia?.length || official.recentActivity?.length ? (
            <div className="detail-grid">
              {official.recentActivity?.map((activity, index) => <div key={`${activity.title}-${index}`}><strong>{activity.title}</strong><span>{humanize(activity.eventType)}{activity.occurredAt ? ` · ${activity.occurredAt}` : ''}</span></div>)}
              {official.newsAndMedia?.map((item, index) => <div key={`${item.title}-${index}`}><strong>{item.title}</strong><span>{item.sourceName ?? 'Media source'}{item.publishedAt ? ` · ${item.publishedAt}` : ''}</span></div>)}
            </div>
          ) : <Placeholder>Real-time monitoring is not yet active for this seat. The fixed card remains visible so the collection status is transparent.</Placeholder>}
        </section>

        <section className="card profile-card">
          <h2 className="card-title">Sources, Archives & Methodology</h2>
          <p className="card-subtitle">CivicLenZ preserves the source URL, retrieval time, content hash, archived copy where permitted, exact excerpt, extraction method, and review state.</p>
          <div className="detail-grid">
            <div><strong>Official source</strong><span>{sourceUrl ?? 'Not yet attached'}</span></div>
            <div><strong>Last collection</strong><span>{official.lastTrackedAt ?? 'Pending'}</span></div>
            <div><strong>Record updated</strong><span>{official.lastUpdatedAt}</span></div>
            <div><strong>Portrait rule</strong><span>Official source first; otherwise public-domain or licensed source with credit</span></div>
            <div><strong>Promise rule</strong><span>Exact attributable commitment plus archived evidence</span></div>
            <div><strong>Score rule</strong><span>No score without evidence, methodology, completeness, and review</span></div>
          </div>
        </section>
      </div>
    </>
  );
}

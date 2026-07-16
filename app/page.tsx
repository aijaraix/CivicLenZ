import Link from 'next/link';

const pathways = [
  {
    number: '01',
    title: 'Find your place in the picture',
    copy: 'Start with your community. See the offices, officials, and public decisions closest to daily life.',
  },
  {
    number: '02',
    title: 'Read the record, not the spin',
    copy: 'Votes, public statements, campaign promises, finances, and meetings are organized around their original sources.',
  },
  {
    number: '03',
    title: 'Know what is known',
    copy: 'Every profile makes room for missing information, conflicting evidence, updates, and corrections.',
  },
];

const recordSignals = [
  ['Actions', 'Bills, votes, public statements, and meeting records in context.'],
  ['Promises', 'Campaign commitments connected to measurable evidence and status history.'],
  ['Money', 'Campaign finance, public disclosures, and ethics information with source trails.'],
];

const audiences = [
  ['For residents', 'Find your officials, understand the public record, and choose what you want to follow.'],
  ['For researchers', 'Organize source-led records, track changes, and understand the gaps behind a public claim.'],
  ['For civic teams', 'Bring trustworthy context, corrections, and community priorities into the same conversation.'],
];

export default function HomePage() {
  return (
    <>
      <section className="human-hero" aria-labelledby="home-title">
        <div className="shell hero-content-shell">
          <div className="hero-content">
            <span className="eyebrow">Clearer civic insight</span>
            <h1 id="home-title">A clearer view of the people making public decisions.</h1>
            <p className="hero-copy">
              CivicLenZ brings together the public record so you can understand who represents you,
              what they have said and done, and where the evidence comes from—without having to dig
              through dozens of websites.
            </p>
            <div className="hero-actions">
              <Link className="button button-primary button-large" href="/officials/">
                Explore Florida officials <span aria-hidden="true">→</span>
              </Link>
              <Link className="button button-glass button-large" href="/how-it-works/">
                See how CivicLenZ works
              </Link>
            </div>
            <div className="hero-proof" aria-label="CivicLenZ principles">
              <span><b>✓</b> Sources stay attached</span>
              <span><b>✓</b> Context stays visible</span>
              <span><b>✓</b> You decide what it means</span>
            </div>
          </div>
          <aside className="hero-signal" aria-label="CivicLenZ approach">
            <span className="signal-kicker">Built for your real life</span>
            <p>Schools. Streets. Safety. Jobs. Housing. Public money.</p>
            <span>CivicLenZ makes the record easier to find, understand, and follow.</span>
          </aside>
        </div>
      </section>

      <section className="section section-intro" id="what-you-can-do">
        <div className="shell">
          <div className="section-heading section-heading-centered">
            <div>
              <span className="eyebrow eyebrow-dark">Made for people, not political insiders</span>
              <h2>Public information should feel useful the first time you see it.</h2>
            </div>
            <p>
              No jargon wall. No forced point of view. Just a thoughtful path from a public record to a
              clearer understanding of how it affects you and your community.
            </p>
          </div>
          <div className="pathway-grid">
            {pathways.map((pathway) => (
              <article className="pathway-card" key={pathway.number}>
                <span className="pathway-number">{pathway.number}</span>
                <h3>{pathway.title}</h3>
                <p>{pathway.copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section section-record">
        <div className="shell record-layout">
          <div className="record-copy">
            <span className="eyebrow eyebrow-dark">One public profile, built around evidence</span>
            <h2>See the whole picture—not a headline clipped out of context.</h2>
            <p>
              CivicLenZ turns scattered source material into a structured, readable profile. The goal is
              not to tell you what to think. It is to make it easier to see the facts, the gaps, and the
              questions worth asking.
            </p>
            <Link className="text-link" href="/officials/">
              Browse the first profiles <span aria-hidden="true">→</span>
            </Link>
          </div>
          <div className="record-panel" aria-label="Official profile information preview">
            <div className="record-panel-top">
              <div className="record-avatar" aria-hidden="true">◎</div>
              <div>
                <span>Public record overview</span>
                <strong>What a CivicLenZ profile makes easier to see</strong>
              </div>
              <i>Evidence-led</i>
            </div>
            <div className="signal-list">
              {recordSignals.map(([title, copy]) => (
                <div className="signal-row" key={title}>
                  <span className="signal-dot" aria-hidden="true" />
                  <div><strong>{title}</strong><p>{copy}</p></div>
                  <span aria-hidden="true">→</span>
                </div>
              ))}
            </div>
            <div className="record-note"><span aria-hidden="true">✓</span> Sources, dates, confidence, and corrections stay close to each claim.</div>
          </div>
        </div>
      </section>

      <section className="section human-story-section">
        <div className="shell human-story-layout">
          <figure className="human-story-image">
            <img src="/images/launch/community-research.svg" alt="Illustrative community members reviewing civic information together." />
            <figcaption>Illustrative civic-use imagery.</figcaption>
          </figure>
          <div>
            <span className="eyebrow eyebrow-dark">Designed for civic life, not just a news cycle</span>
            <h2>Better information makes a community better prepared to ask the next question.</h2>
            <p>
              CivicLenZ is being built for the conversation around a kitchen table, at a neighborhood meeting,
              in a newsroom, or before a call to a public office. The point is not to create more noise—it is
              to make the public record easier to use.
            </p>
            <Link className="text-link" href="/how-it-works/">See the process <span aria-hidden="true">→</span></Link>
          </div>
        </div>
      </section>

      <section className="section member-section">
        <div className="shell member-layout">
          <div className="member-visual-stack">
            <figure className="app-moment-image">
              <img src="/images/launch/app-moment.svg" alt="Illustrative person checking a phone beside a civic-style information dashboard." />
              <figcaption>App interface shown is an illustrative concept.</figcaption>
            </figure>
            <div className="member-preview" aria-label="Upcoming CivicLenZ member dashboard preview">
              <div className="member-preview-top">
                <span>MY CIVICLENZ</span>
                <i>Preview</i>
              </div>
              <strong>Your civic picture</strong>
              <p>Set your location. Follow the people and issues that matter. Keep the public record close.</p>
              <div className="member-preview-row"><b>My representatives</b><span>Starting in Florida</span></div>
              <div className="member-preview-row"><b>Following</b><span>Choose your alerts</span></div>
              <div className="member-preview-row"><b>Civic activity</b><span>Sources stay visible</span></div>
            </div>
          </div>
          <div>
            <span className="eyebrow eyebrow-dark">Member dashboard and mobile app — in development</span>
            <h2 className="member-title">Your elected officials, your follows, and your civic activity in one private place.</h2>
            <p className="member-copy">
              The next stage of CivicLenZ adds Google sign-in or secure email codes, address-based setup,
              private follows, alerts, message drafts, and a clear view of the civic actions you choose to take.
            </p>
            <div className="member-links">
              <Link className="button button-primary" href="/app/">Preview the app</Link>
              <Link className="text-link" href="/sign-in/">See member access plans <span aria-hidden="true">→</span></Link>
            </div>
          </div>
        </div>
      </section>

      <section className="section section-trust" id="trust">
        <div className="shell trust-layout">
          <div>
            <span className="eyebrow">Trust is a feature, not fine print</span>
            <h2>We show the source, explain the uncertainty, and preserve the history.</h2>
          </div>
          <div className="trust-grid">
            <article><strong>Source-led</strong><span>Claims point back to records people can inspect.</span></article>
            <article><strong>Nonpartisan by design</strong><span>The same structure applies to every official and office.</span></article>
            <article><strong>Open to correction</strong><span>Updates and credible contradictions belong in the record.</span></article>
          </div>
        </div>
      </section>

      <section className="section audience-section">
        <div className="shell">
          <div className="section-heading section-heading-centered">
            <div>
              <span className="eyebrow eyebrow-dark">Built around the civic work people already do</span>
              <h2>One clearer starting point for every kind of civic participant.</h2>
            </div>
            <Link className="text-link" href="/about/">About CivicLenZ <span aria-hidden="true">→</span></Link>
          </div>
          <div className="audience-grid">
            {audiences.map(([title, copy], index) => (
              <article key={title}>
                <span>0{index + 1}</span>
                <h3>{title}</h3>
                <p>{copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section section-launch" id="florida">
        <div className="shell launch-card">
          <div>
            <span className="eyebrow eyebrow-dark">Florida first. Built for every community.</span>
            <h2>The first public profiles are beginning in Florida.</h2>
            <p>
              We are building the foundation carefully: a consistent profile framework, source policy,
              evidence trail, and review process that can scale city by city and state by state.
            </p>
          </div>
          <div className="launch-actions">
            <Link className="button button-primary button-large" href="/officials/">Meet the first officials</Link>
            <Link className="text-link" href="/contact/">Get launch and app updates <span aria-hidden="true">→</span></Link>
          </div>
        </div>
      </section>
    </>
  );
}

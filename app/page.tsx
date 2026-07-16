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

export default function HomePage() {
  return (
    <>
      <section className="human-hero" aria-labelledby="home-title">
        <div className="shell hero-content-shell">
          <div className="hero-content">
            <span className="eyebrow">Civic intelligence for everyday people</span>
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
              <a className="button button-glass button-large" href="#what-you-can-do">
                See what CivicLenZ does
              </a>
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

      <section className="section section-launch" id="florida">
        <div className="shell launch-card">
          <div>
            <span className="eyebrow eyebrow-dark">Florida first. Built to grow.</span>
            <h2>The first public profiles are beginning in Florida.</h2>
            <p>
              We are building the foundation carefully: a consistent profile framework, source policy,
              evidence trail, and review process that can scale city by city and state by state.
            </p>
          </div>
          <div className="launch-actions">
            <Link className="button button-primary button-large" href="/officials/">Meet the first officials</Link>
            <span>Address-based representative lookup is next.</span>
          </div>
        </div>
      </section>
    </>
  );
}

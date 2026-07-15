import Link from 'next/link';
import { getAllOfficials } from '@/lib/officials';

const features = [
  ['01', 'Find your representatives', 'Start with an address or browse verified officials by jurisdiction and office.'],
  ['02', 'Follow the public record', 'Review sourced votes, bills, actions, statements, finances, and public meetings.'],
  ['03', 'Track promises', 'See campaign commitments, measurable criteria, progress, evidence, and status history.'],
  ['04', 'Take informed action', 'Contact offices, follow petitions, subscribe to alerts, and prepare for public meetings.'],
];

export default function HomePage() {
  const officials = getAllOfficials();

  return (
    <>
      <section className="hero-home">
        <div className="shell hero-grid">
          <div>
            <span className="eyebrow">Evidence-first civic intelligence</span>
            <h1>Know who represents you—and what they actually do.</h1>
            <p className="hero-copy">
              CivicLenZ brings official records, promises, votes, campaign finance, policy positions,
              public statements, and transparent AI analysis into one sourced profile.
            </p>
            <div className="hero-actions">
              <Link className="button button-primary" href="/officials/">
                Browse Officials
              </Link>
              <a className="button button-secondary" href="#how-it-works">
                See How It Works
              </a>
            </div>
            <div className="trust-row">
              <span>✓ Sources attached</span>
              <span>✓ Uncertainty disclosed</span>
              <span>✓ Corrections preserved</span>
            </div>
          </div>
          <aside className="lookup-card" aria-label="Representative lookup preview">
            <h2>Who represents you?</h2>
            <p>Address matching is the next live data service. Browse the verified seed profiles now.</p>
            <form className="lookup-form">
              <label htmlFor="address">Home address</label>
              <input className="input" id="address" placeholder="Street, city, state, ZIP" disabled />
              <button className="button button-primary" type="button" disabled>
                Representative lookup coming next
              </button>
            </form>
          </aside>
        </div>
      </section>

      <section className="section" id="how-it-works">
        <div className="shell">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Built for accountability</span>
              <h2>From source document to useful civic profile</h2>
            </div>
            <p>
              Automated collection speeds up research, but evidence, conflicts, confidence, and human review remain visible.
            </p>
          </div>
          <div className="feature-grid">
            {features.map(([number, title, description]) => (
              <article className="card feature-card" key={number}>
                <div className="feature-icon">{number}</div>
                <h3>{title}</h3>
                <p>{description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="shell">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Data foundation live</span>
              <h2>{officials.length} verified seed profile{officials.length === 1 ? '' : 's'}</h2>
            </div>
            <p>
              Florida state officials are the first collection target. New scraper results enter a review branch before publication.
            </p>
          </div>
          <Link className="button button-primary" href="/officials/">
            Open official directory
          </Link>
        </div>
      </section>
    </>
  );
}

import Link from 'next/link';
import { AddressFinder } from '@/components/address-finder';
import { Icon } from '@/components/icons';
import { dataSources } from '@/lib/demo-data';

const steps = [
  ['1', 'Enter Your Address', 'We find all the elected officials who represent you by level.'],
  ['2', 'We Monitor for You', 'Our AI tracks what they say, what they vote on, and what they do.'],
  ['3', 'Get Notified', 'We alert you when they deviate from promises or take important action.'],
  ['4', 'Take Action', 'Contact officials, start petitions, and make your voice heard.'],
] as const;

const pillars = [
  ['file', 'Comprehensive Data', 'Profiles, votes, finances, committees & more.'],
  ['search', 'Track & Compare', 'Follow officials and compare their record.'],
  ['bell', 'Real-Time Updates', 'Stay informed with the latest activity.'],
  ['shield', 'Accountability', 'Transparency today for a stronger tomorrow.'],
] as const;

export default function HomePage() {
  return (
    <>
      <section className="landing-hero">
        <div className="landing-hero-image" />
        <div className="landing-hero-shade" />
        <div className="site-width landing-hero-content">
          <div className="landing-copy">
            <span className="landing-kicker">Civic intelligence for everyday people</span>
            <h1>See Clearly.<br /><em>Hold Accountable.</em></h1>
            <p>CivicLenZ gives you real-time insights into every elected official who represents you.</p>
            <AddressFinder dark />
            <div className="hero-address-note"><Icon name="shield" size={15} /> Powered by your location. We never publish your private address.</div>
          </div>
        </div>
        <div className="site-width hero-trust-row">
          <span><Icon name="shield" size={17} /> Real-time AI Monitoring</span>
          <span><Icon name="check" size={17} /> 100% Non-Partisan</span>
          <span><Icon name="sparkles" size={17} /> Your Voice. Your Power.</span>
        </div>
      </section>

      <section className="how-section">
        <div className="site-width">
          <div className="section-title-center"><span>HOW CIVICLENZ WORKS</span><h2>Powerful tools to keep our democracy transparent and accountable.</h2></div>
          <div className="how-steps">
            {steps.map(([number, title, copy]) => <article key={number}><b>{number}</b><h3>{title}</h3><p>{copy}</p></article>)}
          </div>
        </div>
      </section>

      <section className="why-section">
        <div className="site-width why-grid">
          <div><span className="eyebrow-red">WHY IT MATTERS</span><h2>Your representatives should be easy to understand—not hard to find.</h2><p>Democracy works best when citizens are informed and engaged. CivicLenZ makes it easy to see the record, spot changes, and decide how you want to participate.</p><Link className="btn btn-primary" href="/sign-up/">Get Started for Free <Icon name="arrow-right" size={17} /></Link></div>
          <div className="why-visual"><div className="why-capitol" /><div className="why-card one"><Icon name="users" size={19} /><span>Find who represents you</span></div><div className="why-card two"><Icon name="bell" size={19} /><span>Follow meaningful updates</span></div></div>
        </div>
      </section>

      <section className="dark-pillars">
        <div className="site-width pillar-grid">
          {pillars.map(([icon, title, copy]) => <article key={title}><span className="pillar-icon"><Icon name={icon} size={24} /></span><div><h2>{title}</h2><p>{copy}</p></div></article>)}
        </div>
      </section>

      <section className="sources-section">
        <div className="site-width"><div className="section-title-center"><span>DATA YOU CAN TRUST</span><h2>Built on public records, made understandable.</h2><p>Sourced from official government records, public data, and transparent documentation.</p></div><div className="source-row">{dataSources.map((source) => <span key={source}>{source}</span>)}</div></div>
      </section>

      <section className="mobile-promo"><div className="site-width mobile-promo-grid"><div><span className="eyebrow-red">ALSO AVAILABLE ON MOBILE</span><h2>Take CivicLenZ with you everywhere.</h2><p>Monitor your officials, review alerts, and take action when it matters.</p><div className="store-buttons"><span>Download on the<br /><b>App Store</b></span><span>GET IT ON<br /><b>Google Play</b></span></div></div><div className="phone-mockup"><div className="phone-notch" /><LogoMini /><h3>See Clearly.<br /><em>Hold Accountable.</em></h3><div className="phone-address">1600 Pennsylvania Avenue NW<br />Washington, DC 20500</div><Link href="/search/" className="phone-button">Find My Officials</Link></div></div></section>

      <section className="closing-cta"><div className="site-width closing-cta-inner"><div><h2>Your Voice.<br />Your Power.<br />Our Democracy.</h2><p>CivicLenZ puts the power back in the hands of the people.</p><div><Link className="btn btn-primary" href="/sign-up/">Sign Up Free</Link><Link className="btn btn-ghost" href="/how-it-works/">Learn More</Link></div></div></div></section>
    </>
  );
}

function LogoMini() { return <div className="phone-logo"><img src="/brand/civicslenz-mark.svg" alt="" /><span>Civics<b>LenZ</b></span></div>; }

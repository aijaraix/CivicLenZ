import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://civicslenz.com'),
  title: {
    default: 'CivicLenZ — Clearer civic insight',
    template: '%s | CivicLenZ',
  },
  description:
    'A clearer, source-led way to understand the people and public decisions shaping your community.',
  openGraph: {
    title: 'CivicLenZ — Clearer civic insight',
    description:
      'Understand elected officials, public decisions, promises, and evidence without the noise.',
    type: 'website',
    url: '/',
  },
};

const primaryLinks = [
  ['Find Officials', '/officials/'],
  ['How It Works', '/how-it-works/'],
  ['Research & Standards', '/research/'],
  ['The App', '/app/'],
  ['About', '/about/'],
] as const;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <div className="shell nav-shell">
            <Link className="brand" href="/" aria-label="CivicLenZ home">
              <img className="brand-mark" src="/brand/civicslenz-mark.svg" alt="" />
              <span className="brand-word"><span>Civics</span><b>LenZ</b></span>
            </Link>
            <nav className="desktop-nav" aria-label="Main navigation">
              {primaryLinks.map(([label, href]) => <Link href={href} key={href}>{label}</Link>)}
            </nav>
            <div className="nav-actions">
              <Link className="nav-signin" href="/sign-in/">Member access</Link>
              <Link className="button button-primary nav-cta" href="/contact/">
                Get launch updates
              </Link>
              <details className="mobile-menu">
                <summary aria-label="Open navigation menu">Menu <span aria-hidden="true">☰</span></summary>
                <nav aria-label="Mobile navigation">
                  {primaryLinks.map(([label, href]) => <Link href={href} key={href}>{label}</Link>)}
                  <Link href="/pricing/">Pricing</Link>
                  <Link href="/contact/">Contact & early access</Link>
                  <Link href="/sign-in/">Member access</Link>
                </nav>
              </details>
            </div>
          </div>
        </header>
        <main id="main-content">{children}</main>
        <footer className="site-footer">
          <div className="shell footer-grid footer-grid-rich">
            <section>
              <Link className="footer-brand-lockup" href="/" aria-label="CivicLenZ home">
                <img src="/brand/civicslenz-mark.svg" alt="" />
                <strong>Civics<span>LenZ</span></strong>
              </Link>
              <p>Clearer civic insight for the places people call home.</p>
              <span className="footer-location">Miami, Florida · Florida first, built to grow.</span>
            </section>
            <section>
              <strong>Explore</strong>
              <Link href="/officials/">Find officials</Link>
              <Link href="/how-it-works/">How it works</Link>
              <Link href="/app/">Upcoming app</Link>
              <Link href="/pricing/">Plans & early access</Link>
            </section>
            <section>
              <strong>Trust</strong>
              <Link href="/research/">Research & standards</Link>
              <Link href="/corrections/">Corrections</Link>
              <span>Sources stay attached</span>
              <span>Uncertainty stays visible</span>
            </section>
            <section>
              <strong>Company</strong>
              <Link href="/about/">About CivicLenZ</Link>
              <Link href="/contact/">Contact & early access</Link>
              <a href="mailto:Ori@AICreates.ai">Ori@AICreates.ai</a>
              <span>8310 Byron Avenue<br />Miami, FL 33141</span>
            </section>
          </div>
          <div className="shell footer-bottom">
            <span>© 2026 CivicLenZ. All rights reserved.</span>
            <span>Public records deserve context.</span>
          </div>
        </footer>
      </body>
    </html>
  );
}


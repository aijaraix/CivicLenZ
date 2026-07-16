import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://civicslenz.com'),
  title: {
    default: 'CivicLenZ — Know Your Representatives',
    template: '%s | CivicLenZ',
  },
  description:
    'A clearer, source-led way to understand the people and public decisions shaping your community.',
  openGraph: {
    title: 'CivicLenZ — See the public record clearly',
    description:
      'Understand elected officials, public decisions, promises, and evidence without the noise.',
    type: 'website',
    url: '/',
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <div className="shell nav-shell">
            <Link className="brand" href="/" aria-label="CivicLenZ home">
              <span className="brand-mark" aria-hidden="true">C</span>
              <span>CivicLenZ</span>
            </Link>
            <nav className="desktop-nav" aria-label="Main navigation">
              <Link href="/">Home</Link>
              <Link href="/officials/">Find Officials</Link>
              <a href="/#what-you-can-do">How it works</a>
              <a href="/#trust">Our standards</a>
              <a href="/#florida">Florida first</a>
            </nav>
            <div className="nav-actions">
              <Link className="button button-primary nav-cta" href="/officials/">
                Explore Florida
              </Link>
              <details className="mobile-menu">
                <summary aria-label="Open navigation menu">Menu <span aria-hidden="true">☰</span></summary>
                <nav aria-label="Mobile navigation">
                  <Link href="/">Home</Link>
                  <Link href="/officials/">Find Officials</Link>
                  <a href="/#what-you-can-do">How it works</a>
                  <a href="/#trust">Our standards</a>
                  <a href="/#florida">Florida first</a>
                </nav>
              </details>
            </div>
          </div>
        </header>
        <main>{children}</main>
        <footer className="site-footer" id="about">
          <div className="shell footer-grid">
            <section>
              <strong className="footer-brand">CivicLenZ</strong>
              <p>A clearer, source-led way to stay close to public life.</p>
            </section>
            <section>
              <strong>Explore</strong>
              <Link href="/officials/">Florida officials</Link>
              <span>Address lookup — coming next</span>
              <span>Promise tracking — in development</span>
            </section>
            <section>
              <strong>Our standards</strong>
              <span>Sources stay attached</span>
              <span>Uncertainty stays visible</span>
              <span>Corrections stay public</span>
            </section>
          </div>
        </footer>
      </body>
    </html>
  );
}

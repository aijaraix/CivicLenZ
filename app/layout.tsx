import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'CivicLenZ — Know Your Representatives',
  description:
    'Evidence-first profiles, records, promises, finances, and civic activity for elected officials.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <div className="shell nav-shell">
            <Link className="brand" href="/" aria-label="CivicLenZ home">
              CivicLenZ
            </Link>
            <nav className="desktop-nav" aria-label="Main navigation">
              <Link href="/">Home</Link>
              <Link href="/officials/">Find Officials</Link>
              <a href="#coming-soon">Petitions</a>
              <a href="#coming-soon">Map</a>
              <a href="#coming-soon">Blog</a>
              <a href="#coming-soon">Take Action</a>
              <a href="#about">About</a>
            </nav>
            <div className="nav-actions">
              <button className="button button-primary" type="button">
                Login
              </button>
              <button className="menu-button" type="button" aria-label="Open navigation menu">
                ☰
              </button>
            </div>
          </div>
        </header>
        <main>{children}</main>
        <footer className="site-footer" id="about">
          <div className="shell footer-grid">
            <section>
              <strong className="footer-brand">CivicLenZ</strong>
              <p>Transparent, sourced civic information built for citizens.</p>
            </section>
            <section>
              <strong>Product</strong>
              <Link href="/officials/">Find Officials</Link>
              <span>Representative Lookup</span>
              <span>Promise Tracker</span>
            </section>
            <section>
              <strong>Trust</strong>
              <span>Source Policy</span>
              <span>Scoring Methodology</span>
              <span>Corrections</span>
            </section>
          </div>
        </footer>
      </body>
    </html>
  );
}

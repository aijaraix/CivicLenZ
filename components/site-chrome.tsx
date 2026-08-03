import Link from 'next/link';
import { Icon } from '@/components/icons';

const mainLinks = [
  { label: 'How It Works', href: '/how-it-works/' },
  { label: 'Features', href: '/features/' },
  { label: 'About', href: '/about/' },
  { label: 'Petitions', href: '/petitions/' },
];

export function Logo({ inverse = false, compact = false }: { inverse?: boolean; compact?: boolean }) {
  return (
    <span className={`logo-lockup ${inverse ? 'logo-lockup-inverse' : ''} ${compact ? 'logo-lockup-compact' : ''}`}>
      <img src="/brand/civicslenz-mark.svg" alt="" />
      {!compact ? <span className="logo-name"><span>Civics</span><b>LenZ</b></span> : null}
    </span>
  );
}

export function SiteHeader() {
  return (
    <header className="public-header">
      <div className="site-width public-header-inner">
        <Link href="/" className="header-logo" aria-label="CivicLenZ home"><Logo /></Link>
        <nav className="public-nav" aria-label="Primary navigation">
          {mainLinks.map((link) => <Link href={link.href} key={link.href}>{link.label}</Link>)}
        </nav>
        <div className="header-actions">
          <Link className="header-login" href="/sign-in/">Log In</Link>
          <Link className="btn btn-primary btn-small" href="/sign-up/">Sign Up</Link>
          <details className="public-menu">
            <summary aria-label="Open menu"><Icon name="menu" size={23} /></summary>
            <div className="public-menu-panel">
              {mainLinks.map((link) => <Link href={link.href} key={link.href}>{link.label}</Link>)}
              <Link href="/search/">Find my officials</Link>
              <Link href="/sign-in/">Log In</Link>
              <Link href="/sign-up/">Sign Up</Link>
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}

const footerGroups = [
  { title: 'Platform', links: [['Features', '/features/'], ['How It Works', '/how-it-works/'], ['Pricing', '/pricing/'], ['About', '/about/']] },
  { title: 'Resources', links: [['Blog', '/about/'], ['Help Center', '/contact/'], ['Guides', '/how-it-works/'], ['API', '/contact/']] },
  { title: 'Get Involved', links: [['Petitions', '/petitions/'], ['Community', '/contact/'], ['Events', '/contact/'], ['Contact', '/contact/']] },
] as const;

export function SiteFooter() {
  return (
    <footer className="public-footer">
      <div className="site-width footer-grid-new">
        <section className="footer-intro">
          <Logo inverse />
          <p>CivicLenZ gives you the data, context, and insights you need to track your elected officials and their actions.</p>
          <span>© 2026 CivicLenZ. All rights reserved.</span>
        </section>
        {footerGroups.map((group) => (
          <section className="footer-group" key={group.title}>
            <h2>{group.title}</h2>
            {group.links.map(([label, href]) => <Link href={href} key={label}>{label}</Link>)}
          </section>
        ))}
        <section className="footer-group footer-connect">
          <h2>Connect</h2>
          <div className="social-row" aria-label="Social links"><span>𝕏</span><span>f</span><span>◎</span><span>▶</span></div>
          <Link href="/research/">Privacy Policy</Link>
          <Link href="/corrections/">Terms of Service</Link>
        </section>
      </div>
    </footer>
  );
}

export function MobileTabs() {
  const tabs = [
    ['Home', '/', 'home'], ['Officials', '/search/', 'users'], ['Monitor', '/monitor/', 'watch'], ['Action', '/petitions/', 'edit'],
  ] as const;
  return <nav className="mobile-tabs" aria-label="Mobile application navigation">{tabs.map(([label, href, icon]) => <Link key={label} href={href}><Icon name={icon} size={19} /><span>{label}</span></Link>)}</nav>;
}

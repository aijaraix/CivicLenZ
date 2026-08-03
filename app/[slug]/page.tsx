import Link from 'next/link';
import { notFound } from 'next/navigation';
import { marketingPages } from '@/lib/marketing-pages';

export function generateStaticParams() {
  return Object.keys(marketingPages).map((slug) => ({ slug }));
}

export default async function MarketingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = marketingPages[slug];

  if (!page) notFound();

  return (
    <article className="marketing-page">
      <section className="info-hero">
        <div className="shell info-hero-grid">
          <div>
            <span className="eyebrow eyebrow-dark">{page.label}</span>
            <h1>{page.title}</h1>
            <p className="info-intro">{page.intro}</p>
            <div className="hero-actions info-actions">
              <Link className="button button-primary button-large" href={page.primary.href}>
                {page.primary.label} <span aria-hidden="true">→</span>
              </Link>
              {page.secondary ? (
                <Link className="button button-secondary button-large" href={page.secondary.href}>
                  {page.secondary.label}
                </Link>
              ) : null}
            </div>
          </div>
          <aside className="info-visual" aria-label={`${page.label} preview`}>
            {page.visual === 'app-preview' ? <AppPreview /> : null}
            {page.visual === 'record-preview' ? <RecordPreview /> : null}
            {page.visual === 'contact-preview' ? <ContactPreview /> : null}
          </aside>
        </div>
      </section>

      <section className="section info-sections">
        <div className="shell info-block-grid">
          {page.blocks.map((block) => (
            <section className="info-block" key={block.title}>
              {block.eyebrow ? <span className="eyebrow eyebrow-dark">{block.eyebrow}</span> : null}
              <h2>{block.title}</h2>
              <p>{block.copy}</p>
              {block.points?.length ? (
                <ul>
                  {block.points.map((point) => <li key={point}>{point}</li>)}
                </ul>
              ) : null}
            </section>
          ))}
        </div>
      </section>

      <section className="section info-closing">
        <div className="shell launch-card">
          <div>
            <span className="eyebrow eyebrow-dark">CivicLenZ, Florida first</span>
            <h2>Useful public information starts with a clear next step.</h2>
            <p>We are building the public experience and the secure member tools in stages, with source standards and privacy safeguards kept visible from the beginning.</p>
          </div>
          <div className="launch-actions">
            <Link className="button button-primary button-large" href="/contact/">
              Get launch updates
            </Link>
            <span>Built for every community, starting carefully in Florida.</span>
          </div>
        </div>
      </section>
    </article>
  );
}

function AppPreview() {
  return (
    <div className="app-preview">
      <div className="app-preview-top">
        <span className="preview-pill">COMING SOON</span>
        <span>My civic picture</span>
      </div>
      <strong>Good evening, Jordan</strong>
      <p>Three officials. Two updates. One clearer place to start.</p>
      <div className="app-preview-list">
        <span><b>01</b> My representatives</span>
        <span><b>02</b> Followed officials</span>
        <span><b>03</b> Source-backed updates</span>
      </div>
      <div className="app-preview-nav"><i>⌂</i><i>⌕</i><i>◌</i><i>☰</i></div>
    </div>
  );
}

function RecordPreview() {
  return (
    <div className="record-preview">
      <div className="record-preview-head">
        <span className="mini-mark" aria-hidden="true">CL</span>
        <span>Public record overview</span>
        <b>Reviewed</b>
      </div>
      <div className="record-preview-line"><span /> Evidence linked to source records</div>
      <div className="record-preview-line"><span /> Dates and context kept together</div>
      <div className="record-preview-line"><span /> Gaps and corrections visible</div>
      <div className="record-preview-foot">A clearer civic picture is built one inspectable record at a time.</div>
    </div>
  );
}

function ContactPreview() {
  return (
    <div className="contact-preview">
      <span className="preview-pill">CIVICLENZ</span>
      <strong>Miami, Florida</strong>
      <p>Florida first. Built to grow carefully, community by community.</p>
      <div>
        <span>Source-led research</span>
        <span>Member tools in development</span>
        <span>Open to correction</span>
      </div>
    </div>
  );
}


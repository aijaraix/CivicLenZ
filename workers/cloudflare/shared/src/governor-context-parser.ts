/** Narrow official leadership-card parser. Structure matching is not certification.
 * Fixtures never certify a production source or a Person identity.
 */
export const GOVERNOR_CONTEXT_VERSION = 'hermes-governor-context-v1';
export const GOVERNOR_CONTEXT_URL = 'https://www.flgov.com/eog/leadership';
const plain = (s: string) => s.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

type CandidateCard = { html: string; index: number; drupal: boolean };

function anchorCandidate(card: CandidateCard) {
  if (!card.drupal) {
    const links = [...card.html.matchAll(/<a\b[^>]*href=["'](\/eog\/leadership\/people\/[a-z0-9-]+)["'][^>]*>([\s\S]*?)<\/a>/gi)]
      .map(match => ({ url: new URL(match[1], GOVERNOR_CONTEXT_URL).href, title: 'Governor', name: plain(match[2]) }))
      .filter(link => link.name && link.name !== 'Read more' && !/[<>&]|\b(?:Lieutenant|Former)\b/i.test(link.name));
    const distinct = [...new Map(links.map(link => [link.url + '|' + link.name, link])).values()];
    return distinct.length === 1 ? distinct[0] : undefined;
  }
  const links = [...card.html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)]
    .map(match => {
      const href = match[1].match(/\bhref=["'](\/eog\/leadership\/people\/[a-z0-9-]+)["']/i);
      const classes = match[1].match(/\bclass=["']([^"']*)["']/i);
      if (!href || !classes?.[1].split(/\s+/).includes('eog-title-name')) return undefined;
      const title = match[2].match(/<span\b[^>]*class=["'][^"']*\beog-title\b[^"']*["'][^>]*>([\s\S]*?)<\/span>/i);
      const name = match[2].match(/<span\b[^>]*class=["'][^"']*\beog-name\b[^"']*["'][^>]*>([\s\S]*?)<\/span>/i);
      return { url: new URL(href[1], GOVERNOR_CONTEXT_URL).href, title: title && plain(title[1]), name: name && plain(name[1]) };
    })
    .filter((link): link is { url: string; title: string | undefined; name: string | undefined } => Boolean(link))
    .filter(link => link.title === 'Governor' && link.name && !/[<>&]|\b(?:Lieutenant|Former)\b/i.test(link.name));
  const distinct = [...new Map(links.map(link => [link.url + '|' + link.name, link])).values()];
  return distinct.length === 1 ? distinct[0] : undefined;
}

function articleCards(html: string): CandidateCard[] {
  return [...html.matchAll(/<article\b[^>]*>[\s\S]*?<\/article>/gi)]
    .filter(match => /<h[1-6]\b[^>]*>\s*Governor\s*<\/h[1-6]>/i.test(match[0]))
    .map(match => ({ html: match[0], index: match.index!, drupal: false }));
}

function drupalViewCards(html: string): CandidateCard[] {
  // The bounded card is a Drupal view row, not an article. Split only on the
  // repeated row wrapper, then require both the explicit office field and the
  // dedicated title/name link within that same row.
  const starts = [...html.matchAll(/<div\b[^>]*class=["'][^"']*\bloop-profile\b[^"']*["'][^>]*>/gi)];
  return starts.map((match, i) => ({ html: html.slice(match.index!, starts[i + 1]?.index), index: match.index!, drupal: true }))
    .filter(card => /views-field-field-title[\s\S]*?field-content[^>]*\btitle\b[^>]*>\s*Governor\s*<\/div>/i.test(card.html));
}

export function parseGovernorContext(html: string, sourceUrl: string, seatKey: string) {
  if (sourceUrl !== GOVERNOR_CONTEXT_URL || seatKey !== 'us-fl-governor') throw Error('governor_context_mismatch');
  if (/wsidchk|captcha|verify you are human|access denied|webdriverCheck|One moment, please/i.test(html)) throw Error('authoritative_source_access_restricted');
  // Require one explicit office-labelled card, never title/metadata/name guesses.
  // These are source-layout alternatives; both remain structural observations,
  // not identity verification or current-occupancy certification.
  const candidates = [...articleCards(html), ...drupalViewCards(html)];
  if (candidates.length !== 1) throw Error('governor_card_structure_unproven');
  const card = candidates[0], identity = anchorCandidate(card);
  if (!identity) throw Error('governor_identity_ambiguous');
  return {displayName: identity.name, officialProfileUrl: identity.url,
    seatKey, jurisdictionKey:'us-fl', officeKind:'governor', vacant:false,
    excerpt:card.html, charOffset:card.index, parserVersion:GOVERNOR_CONTEXT_VERSION,
    certification:'STRUCTURE_MATCHED_NOT_PRODUCTION_CERTIFIED',
    temporalSemantics:'office_context_observed_at_retrieval',
    start_date:null, assumed_office_date:null, sworn_in_date:null, term_end:null};
}

/** Narrow official leadership-card parser. Structure matching is not certification.
 * Fixtures never certify a production source or a Person identity.
 */
export const GOVERNOR_CONTEXT_VERSION = 'hermes-governor-context-v1';
export const GOVERNOR_CONTEXT_URL = 'https://www.flgov.com/eog/leadership';
const plain = (s: string) => s.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
export function parseGovernorContext(html: string, sourceUrl: string, seatKey: string) {
  if (sourceUrl !== GOVERNOR_CONTEXT_URL || seatKey !== 'us-fl-governor') throw Error('governor_context_mismatch');
  if (/wsidchk|captcha|verify you are human|access denied|webdriverCheck|One moment, please/i.test(html)) throw Error('authoritative_source_access_restricted');
  // Require one explicit office-labelled article, not title/metadata/name guesses.
  const articles = [...html.matchAll(/<article\b[^>]*>[\s\S]*?<\/article>/gi)]
    .filter(m => /<h[1-6]\b[^>]*>\s*Governor\s*<\/h[1-6]>/i.test(m[0]));
  if (articles.length !== 1) throw Error('governor_card_structure_unproven');
  const card = articles[0];
  const links = [...card[0].matchAll(/<a\b[^>]*href=["'](\/eog\/leadership\/people\/[a-z0-9-]+)["'][^>]*>([\s\S]*?)<\/a>/gi)]
    .map(m => ({url: new URL(m[1], sourceUrl).href, name: plain(m[2])}));
  const distinct = [...new Map(links.filter(l=>l.name && l.name !== 'Read more').map(l=>[l.url+'|'+l.name,l])).values()];
  if (distinct.length !== 1 || /[<>&]|\b(?:Lieutenant|Former)\b/i.test(distinct[0].name)) throw Error('governor_identity_ambiguous');
  return {displayName: distinct[0].name, officialProfileUrl: distinct[0].url,
    seatKey, jurisdictionKey:'us-fl', officeKind:'governor', vacant:false,
    excerpt:card[0], charOffset:card.index!, parserVersion:GOVERNOR_CONTEXT_VERSION,
    certification:'STRUCTURE_MATCHED_NOT_PRODUCTION_CERTIFIED',
    temporalSemantics:'office_context_observed_at_retrieval',
    start_date:null, assumed_office_date:null, sworn_in_date:null, term_end:null};
}

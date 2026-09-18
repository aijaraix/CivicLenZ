/** Structural regressions derived from preserved raw retrieval
 * b1b73693-0f25-5e4c-bdfe-3213492698fb (SHA-256 9bd2b3a3...).
 * Synthetic names prevent this fixture from becoming a golden civic answer.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { GOVERNOR_CONTEXT_URL, parseGovernorContext } from '../shared/src/governor-context-parser.ts';

const seat = 'us-fl-governor';
const article = (name = 'Example Holder') => `<article><h2>Governor</h2><a class="profile-link" href="/eog/leadership/people/example-holder">${name}</a></article>`;
const drupal = (name = 'Example Holder', slug = 'example-holder') => `<div class="loop-profile"><div class="views-field views-field-field-title"><div class="field-content title">Governor</div></div><div class="views-field views-field-nothing"><a href="/eog/leadership/people/${slug}" class="eog-title-name"><span class="eog-title">Governor</span><span class="eog-name">${name}</span></a></div></div>`;

test('supports legacy explicit article structure without certifying identity', () => {
  const result = parseGovernorContext(article(), GOVERNOR_CONTEXT_URL, seat);
  assert.equal(result.displayName, 'Example Holder');
  assert.equal(result.certification, 'STRUCTURE_MATCHED_NOT_PRODUCTION_CERTIFIED');
  assert.equal(result.start_date, null);
});

test('supports the preserved Drupal view-field structure without a golden answer', () => {
  const result = parseGovernorContext(`<main>${drupal('Structural Candidate')}</main>`, GOVERNOR_CONTEXT_URL, seat);
  assert.equal(result.displayName, 'Structural Candidate');
  assert.equal(result.officialProfileUrl, 'https://www.flgov.com/eog/leadership/people/example-holder');
  assert.equal(result.certification, 'STRUCTURE_MATCHED_NOT_PRODUCTION_CERTIFIED');
});

test('fails closed for ambiguous, nameless, or non-card text', () => {
  for (const html of [
    drupal('One', 'one') + drupal('Two', 'two'),
    `<div class="loop-profile"><div class="views-field views-field-field-title"><div class="field-content title">Governor</div></div></div>`,
    `<main>Governor Example Holder <a href="/eog/leadership/people/example-holder">Example Holder</a></main>`,
  ]) assert.throws(() => parseGovernorContext(html, GOVERNOR_CONTEXT_URL, seat));
});

test('fails closed for mismatched source or seat context', () => {
  assert.throws(() => parseGovernorContext(drupal(), 'https://example.org', seat));
  assert.throws(() => parseGovernorContext(drupal(), GOVERNOR_CONTEXT_URL, 'us-fl-lieutenant-governor'));
});

import { describe, expect, it } from 'vitest';
import {
  legacyVisualFields,
  parseFields,
} from '../../scripts/content/packages.mjs';
import { normalizedFields, sha } from '../../scripts/content/shared.mjs';

/**
 * MSE writes its spell-check annotation back into card files on save. It
 * carries two colons, which is exactly what used to be mistaken for a new
 * field key.
 */
const OPEN = '<error-spelling:en_US:/magic.mse-game/dictionary/magic-words>';
const CLOSE = '</error-spelling:en_US:/magic.mse-game/dictionary/magic-words>';

/** The real shape of `card nekroz - brionac`, trimmed to the relevant fields. */
const brionac = [
  'mse_version: 2.1.2',
  'card:',
  '\tname: Nekroz - Brionac',
  '\trule_text:',
  `\t\t<i-auto>(1 - Activated Sorcery Hard)</i-auto> <b>Discard</b> ${OPEN}Brionac${CLOSE}; <b>Search</b> 1 Creature.`,
  '\t\t<i-auto>(2 - Activated Sorcery Hard)</i-auto> <b>Target</b> 1 Creature that was put onto Field from Sideboard; <b>Shuffle</b> it.',
  '\tpower: 5',
].join('\n');

describe('parseFields', () => {
  it('keeps a continuation line that contains a colon', () => {
    expect(parseFields(brionac).get('rule_text')).toContain('error-spelling');
  });

  it('joins every continuation line of a field', () => {
    const text = ['\trule_text: one', '\t\ttwo', '\t\tthree'].join('\n');
    expect(parseFields(text).get('rule_text')).toBe('one\ntwo\nthree');
  });

  it('ends a field at the next single-tab key', () => {
    const fields = parseFields(brionac);
    expect(fields.get('rule_text')).not.toContain('power');
    expect(fields.get('power')).toBe('5');
  });

  it('parses a single-line field', () => {
    expect(parseFields(brionac).get('name')).toBe('Nekroz - Brionac');
  });

  it('fails on a duplicate field', () => {
    expect(() =>
      parseFields(['\tname: One', '\tname: Two'].join('\n')),
    ).toThrowError('content: duplicate field name');
  });
});

describe('legacyVisualFields', () => {
  // Frozen on purpose — every render-provenance.json attestation was written
  // against this parse. See docs/ADR/proposed/0021-frozen-visual-source-hash.md.
  it('still truncates at an inner colon', () => {
    expect(legacyVisualFields(brionac).get('rule_text')).toBe('');
  });

  it('fails on a duplicate field', () => {
    expect(() =>
      legacyVisualFields(['\tname: One', '\tname: Two'].join('\n')),
    ).toThrowError('content: duplicate field name');
  });

  /**
   * Golden vector for the frozen hash input. The two assertions above still pass
   * for a "tidied" legacy parser that, say, drops the manufactured keys instead
   * of storing them — and that would change normalizedFields() and silently
   * invalidate every render-provenance.json attestation. This pins the exact
   * bytes visualSourceHash is built from, at unit speed.
   */
  it('pins the normalized shape that visualSourceHash is built from', () => {
    expect(
      sha(Buffer.from(normalizedFields(legacyVisualFields(brionac)))),
    ).toBe('18ca11e6125da887f06192fa43172f2d7dba1fa80138d21051677ce1f5c83144');
  });
});

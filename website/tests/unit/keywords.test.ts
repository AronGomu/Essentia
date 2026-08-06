import { describe, expect, it } from 'vitest';
import {
  extractKeywords,
  normalizeKeyword,
  splitComposite,
} from '../../scripts/content/keywords.mjs';
import { catalog } from '../../src/lib/catalog';

const registry = new Map(
  [
    'Detach N',
    'Mill N',
    'Ward N',
    'Negate',
    'Destroy',
    'Target',
    'Discard',
  ].map((term) => [term, { id: term.toLowerCase(), term, category: 'action' }]),
);

describe('keyword normalization', () => {
  it('folds integer and X parameters to N so one entry covers them', () => {
    expect(normalizeKeyword('Detach 1')).toBe('Detach N');
    expect(normalizeKeyword('Detach 2')).toBe('Detach N');
    expect(normalizeKeyword('Detach X')).toBe('Detach N');
    expect(normalizeKeyword('Ward 3')).toBe('Ward N');
  });

  it('leaves a digit glued to a word alone', () => {
    expect(normalizeKeyword('MV2+ Opponent')).toBe('MV2+ Opponent');
  });

  it('folds curly quotes so card text matches the registry', () => {
    expect(normalizeKeyword('On Cast “Spellbook”')).toBe('On Cast "Spellbook"');
  });
});

describe('composite invocations', () => {
  it('splits on and / ampersand', () => {
    expect(splitComposite('Detach 1 and Mill 3')).toEqual([
      'Detach 1',
      'Mill 3',
    ]);
    expect(splitComposite('Negate & Destroy')).toEqual(['Negate', 'Destroy']);
  });

  it('leaves a single invocation intact', () => {
    expect(splitComposite('Protection from everything')).toEqual([
      'Protection from everything',
    ]);
  });
});

describe('keyword extraction', () => {
  it('resolves bold invocations against the registry, deduped and sorted', () => {
    expect(
      extractKeywords(
        '<b>Target</b> then <b>Discard</b> and <b>Target</b>',
        registry,
        'card',
      ),
    ).toEqual(['Discard', 'Target']);
  });

  it('splits a composite into its constituent keywords', () => {
    expect(
      extractKeywords('<b>Detach 1 and Mill 3</b>', registry, 'card'),
    ).toEqual(['Detach N', 'Mill N']);
  });

  it('ignores nested markup inside the bold run', () => {
    expect(
      extractKeywords('<b><kw-a>Target</kw-a></b>', registry, 'card'),
    ).toEqual(['Target']);
  });

  it('fails the build on an undocumented bold phrase', () => {
    expect(() =>
      extractKeywords('<b>Wibble</b>', registry, 'bad-card'),
    ).toThrow(/unknown keyword/);
  });
});

describe('published keyword closure', () => {
  it('resolves every keyword used by a published card to the registry', () => {
    const known = new Set(catalog.keywords.map((keyword) => keyword.term));
    for (const version of catalog.cardVersions)
      for (const term of version.keywords) expect(known).toContain(term);
  });

  it('stores every registry term in normalized form', () => {
    for (const keyword of catalog.keywords)
      expect(normalizeKeyword(keyword.term)).toBe(keyword.term);
  });
});

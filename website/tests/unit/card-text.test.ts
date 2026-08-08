import { describe, expect, it } from 'vitest';
import { catalog } from '../../src/lib/catalog';

describe('published card text', () => {
  it('gives every catalog card rule text', () => {
    expect(
      catalog.cards.filter((card) => !card.ruleText).map((c) => c.id),
    ).toEqual([]);
  });

  it('gives every catalog card plain rule text', () => {
    expect(
      catalog.cards
        .filter((card) => !card.ruleTextPlain.trim())
        .map((c) => c.id),
    ).toEqual([]);
  });

  it('exposes the keywords of Nekroz - Brionac', () => {
    expect(
      catalog.cards.find((card) => card.id === 'nekroz-brionac')?.keywords,
    ).toEqual(['Discard', 'Search', 'Shuffle', 'Target']);
  });
});

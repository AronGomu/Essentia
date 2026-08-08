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

  it('exposes the keywords of Ash Blossom', () => {
    expect(
      catalog.cards.find((card) => card.id === 'ash-blossom-and-joyous-spring')
        ?.keywords,
    ).toEqual(['Counter', 'Discard', 'Draw', 'Mill N', 'Search', 'Target']);
  });

  it('prints the capitalised deck-interaction examples', () => {
    const ruleTextPlain = catalog.cards.find(
      (card) => card.id === 'ash-blossom-and-joyous-spring',
    )?.ruleTextPlain;
    expect(ruleTextPlain).toContain('(Draw, Mill X, Search, etc.)');
    expect(ruleTextPlain).not.toContain('(draw,');
  });
});

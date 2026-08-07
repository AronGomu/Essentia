import { describe, expect, it } from 'vitest';
import {
  catalog,
  cardsById,
  relatedCards,
  type RelatedInput,
} from '../../src/lib/catalog';

describe('relatedCards', () => {
  it('includes same-archetype members', () => {
    const card = cardsById.get('nekroz-trishula')!;
    const result = relatedCards(card, catalog.cards, catalog.keywords);
    expect(result.length).toBeGreaterThan(0);
    for (const item of result) {
      if (item.archetype !== null) {
        expect(item.archetype).toBe('nekroz');
      }
    }
  });

  it('includes a support card that left the section', () => {
    const card =
      cardsById.get('burning-abyss-dante') ??
      catalog.cards.find((c) => c.archetype === 'burning-abyss')!;
    const result = relatedCards(card, catalog.cards, catalog.keywords);
    expect(
      result.some((item) => item.id === 'tour-guide-from-the-underworld'),
    ).toBe(true);
  });

  it('includes a card printing an archetype keyword', () => {
    const a: RelatedInput = {
      id: 'a',
      name: 'A',
      archetype: 'shaddoll',
      keywords: [],
    };
    const b: RelatedInput = {
      id: 'b',
      name: 'B',
      archetype: null,
      keywords: ['Shaddoll Recovery'],
    };
    const keywords = [{ term: 'Shaddoll Recovery', archetype: 'shaddoll' }];
    const result = relatedCards(a, [a, b], keywords);
    expect(result.some((item) => item.id === 'b')).toBe(true);
  });

  it('excludes the card itself', () => {
    const card = cardsById.get('nekroz-trishula')!;
    const result = relatedCards(card, catalog.cards, catalog.keywords);
    expect(result.some((item) => item.id === card.id)).toBe(false);
  });

  it('falls back to shared archetype keywords for a staple', () => {
    const a: RelatedInput = {
      id: 'a',
      name: 'A',
      archetype: null,
      keywords: ['Descent'],
    };
    const b: RelatedInput = {
      id: 'b',
      name: 'B',
      archetype: 'burning-abyss',
      keywords: ['Descent'],
    };
    const keywords = [{ term: 'Descent', archetype: 'burning-abyss' }];
    const result = relatedCards(a, [a, b], keywords);
    expect(result.some((item) => item.id === 'b')).toBe(true);
  });

  it('returns nothing for an unrelated staple', () => {
    const a: RelatedInput = {
      id: 'a',
      name: 'A',
      archetype: null,
      keywords: ['Draw'],
    };
    const b: RelatedInput = {
      id: 'b',
      name: 'B',
      archetype: null,
      keywords: ['Draw'],
    };
    const keywords = [{ term: 'Draw', archetype: null }];
    const result = relatedCards(a, [a, b], keywords);
    expect(result).toEqual([]);
  });

  it('sorts by name', () => {
    const a: RelatedInput = {
      id: 'a',
      name: 'A',
      archetype: 'shaddoll',
      keywords: [],
    };
    const z: RelatedInput = {
      id: 'z',
      name: 'Z',
      archetype: 'shaddoll',
      keywords: [],
    };
    const seed: RelatedInput = {
      id: 'seed',
      name: 'Seed',
      archetype: 'shaddoll',
      keywords: [],
    };
    const result = relatedCards(seed, [z, a, seed], []);
    expect(result.map((item) => item.name)).toEqual(['A', 'Z']);
  });

  it('caps at 24', () => {
    const seed: RelatedInput = {
      id: 'seed',
      name: 'Seed',
      archetype: 'nekroz',
      keywords: [],
    };
    const many: RelatedInput[] = Array.from({ length: 40 }, (_, i) => ({
      id: `card-${i}`,
      name: `Card ${String(i).padStart(2, '0')}`,
      archetype: 'nekroz',
      keywords: [],
    }));
    const result = relatedCards(seed, [seed, ...many], []);
    expect(result.length).toBe(24);
  });
});

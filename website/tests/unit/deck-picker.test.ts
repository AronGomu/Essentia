import { describe, expect, it } from 'vitest';
import {
  cardHref,
  pickCards,
  type PickerCard,
} from '../../src/lib/deck-picker';

function card(
  id: string,
  name: string,
  manifestIndex: number,
  overrides: Partial<PickerCard> = {},
): PickerCard {
  return {
    id,
    name,
    matchNames: [name],
    route: `/cards/${id}/`,
    zone: 'main',
    sectionLabel: 'Nekroz',
    manifestIndex,
    ...overrides,
  };
}

// Array order deliberately differs from manifest order, so an empty-query
// result that is merely `slice(0, limit)` cannot pass.
const fixture: PickerCard[] = [
  card('nekroz-ritual-tome', 'Nekroz Ritual Tome', 3),
  card('nekroz-trishula', 'Nekroz Trishula', 1, {
    matchNames: ['Nekroz Trishula', 'Trishula'],
    zone: 'extra',
  }),
  card('nekroz-mirror', 'Nekroz Mirror', 0),
  card('glacial-dragon', 'Glacial Dragon', 2, {
    matchNames: ['Glacial Dragon', 'Nekroz of Trishula'],
    zone: 'extra',
  }),
];

const ids = (cards: PickerCard[]) => cards.map((entry) => entry.id);

describe('pickCards', () => {
  it('returns manifest order for an empty query', () => {
    expect(ids(pickCards(fixture, '', 3))).toEqual([
      'nekroz-mirror',
      'nekroz-trishula',
      'glacial-dragon',
    ]);
  });

  it('ranks a prefix match first', () => {
    const results = pickCards(fixture, 'nekroz t');
    expect(results.length).toBeGreaterThan(1);
    expect(results[0]?.id).toBe('nekroz-trishula');
  });

  it('matches an alternate printed name', () => {
    // `glacial-dragon` is only reachable through its second match name.
    expect(ids(pickCards(fixture, 'trishula'))).toContain('glacial-dragon');
  });

  it('drops non-matches', () => {
    expect(pickCards(fixture, 'zzz')).toEqual([]);
  });

  it('respects the limit', () => {
    const many = Array.from({ length: 20 }, (_, index) =>
      card(`card-${index}`, `Nekroz Beast ${index}`, index),
    );
    expect(pickCards(many, 'nekroz', 5)).toHaveLength(5);
  });
});

describe('cardHref', () => {
  it('joins base and route with exactly one slash', () => {
    expect(cardHref('/', '/cards/nekroz-mirror/')).toBe(
      '/cards/nekroz-mirror/',
    );
    expect(cardHref('/essentia/', '/cards/nekroz-mirror/')).toBe(
      '/essentia/cards/nekroz-mirror/',
    );
  });
});

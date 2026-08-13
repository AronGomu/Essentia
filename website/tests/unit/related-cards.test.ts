import { describe, expect, it } from 'vitest';
import { catalog } from '../../src/lib/catalog';

describe('related cards data (catalog field)', () => {
  it('every related id resolves to a card in the catalog', () => {
    const knownIds = new Set(catalog.cards.map((card) => card.id));

    for (const card of catalog.cards) {
      for (const id of card.related.archetype)
        expect(knownIds.has(id)).toBe(true);
      for (const id of card.related.referencedBy)
        expect(knownIds.has(id)).toBe(true);
    }
  });

  it('no card references itself', () => {
    for (const card of catalog.cards) {
      const referencedCardIds = card.related.references
        .filter((reference) => reference.kind === 'card')
        .map((reference) => reference.id);
      expect(referencedCardIds).not.toContain(card.id);
    }
  });
});

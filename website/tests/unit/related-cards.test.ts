import { describe, expect, it } from 'vitest';
import { catalog } from '../../src/lib/catalog';

const SELECTED_GENERIC_STAPLE_IDS = [
  'tour-guide-from-the-underworld',
  'preparation-of-rites',
  'manju-of-the-ten-thousand-hands',
  'senju-of-the-thousand-hands',
];

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

  it('selected generic staples have no Same archetype relation', () => {
    for (const id of SELECTED_GENERIC_STAPLE_IDS) {
      const card = catalog.cards.find((candidate) => candidate.id === id);
      expect(card).toBeDefined();
      expect(card).toMatchObject({
        archetype: null,
        archetypeRole: 'staple',
        support: false,
        sectionSlug: 'non-archetype',
        route: `/cards/${id}/`,
      });
      expect(card?.related).toEqual({
        archetype: [],
        references: [],
        referencedBy: [],
      });

      const versions = catalog.cardVersions.filter(
        (version) => version.id === id,
      );
      expect(versions.length).toBeGreaterThan(0);
      for (const version of versions)
        expect(version).toMatchObject({
          archetype: null,
          archetypeRole: 'staple',
          support: false,
          sectionSlug: 'non-archetype',
        });
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

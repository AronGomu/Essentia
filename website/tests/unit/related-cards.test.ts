import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { catalog, cardsById } from '../../src/lib/catalog';

describe('related cards data (catalog field)', () => {
  it('every card carries both lists', () => {
    const knownIds = new Set(catalog.cards.map((card) => card.id));
    for (const card of catalog.cards) {
      expect(Array.isArray(card.related.archetype)).toBe(true);
      expect(Array.isArray(card.related.interaction)).toBe(true);
      for (const id of card.related.archetype)
        expect(knownIds.has(id)).toBe(true);
      for (const id of card.related.interaction)
        expect(knownIds.has(id)).toBe(true);
    }
  });

  it('archetype list holds only printed-name matches', () => {
    const card = cardsById.get('burning-abyss-graff')!;
    expect(card.related.archetype.length).toBeGreaterThan(0);
    for (const id of card.related.archetype) {
      const candidate = cardsById.get(id)!;
      expect(candidate.name).toContain('Burning Abyss');
    }
  });

  it("Tour Guide's fetch targets live in the archetype list only", () => {
    const card = cardsById.get('tour-guide-from-the-underworld')!;
    expect(card.related.archetype).toContain('burning-abyss-graff');
    expect(card.related.interaction).not.toContain('burning-abyss-graff');
  });

  it('the old helper is gone', () => {
    const source = readFileSync(
      fileURLToPath(new URL('../../src/lib/catalog.ts', import.meta.url)),
      'utf8',
    );
    expect(source).not.toContain('export function relatedCards');
    expect(source).not.toContain('export interface RelatedInput');
  });
});

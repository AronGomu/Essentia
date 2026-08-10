import { describe, expect, it } from 'vitest';
import { catalog, cardsById } from '../../src/lib/catalog';

const { extractClauses, parseConstraints, buildRelatedGraph } =
  await import('../../scripts/content/related.mjs');

describe('extractClauses', () => {
  it('splits on sentence punctuation', () => {
    expect(extractClauses('A — b. c; d')).toEqual(['A', 'b', 'c', 'd']);
  });
});

describe('parseConstraints', () => {
  const vocab = new Set(['Fiend']);

  it('reads a subtype and an MV', () => {
    expect(
      parseConstraints('Summon 1 Fiend MV 1 Creature from Deck', vocab),
    ).toEqual({
      subtypes: ['Fiend'],
      names: [],
      colors: [],
      supertypes: [],
      mv: { op: '=', value: 1 },
    });
  });

  it('accepts "MV 2 or less"', () => {
    const result = parseConstraints(
      'Search 1 Ritual Creature MV 2 or less',
      new Set(),
    );
    expect(result.mv).toEqual({ op: '<=', value: 2 });
    expect(result.supertypes).toEqual(['Ritual']);
  });

  it('leaves "MV meets" alone', () => {
    const result = parseConstraints(
      'sacrifice a creature whose MV meets its Ritual cost',
      new Set(),
    );
    expect(result.mv).toBeNull();
  });

  it('throws on malformed MV', () => {
    expect(() =>
      parseConstraints('Summon 1 Creature MV soon', new Set()),
    ).toThrow(/MV/);
  });
});

describe('buildRelatedGraph — fixtures', () => {
  it('fails the build on an unknown quoted reference', () => {
    const cards = [
      {
        id: 'a',
        name: 'A',
        archetype: null,
        subType: 'Fiend',
        colors: [],
        supertypes: [],
        manaValue: 1,
        keywords: ['Summon'],
        ruleTextPlain: 'Summon 1 “Zorblax” Creature from Deck.',
      },
      {
        id: 'b',
        name: 'B',
        archetype: null,
        subType: 'Fiend',
        colors: [],
        supertypes: [],
        manaValue: 1,
        keywords: [],
        ruleTextPlain: '',
      },
    ];
    expect(() => buildRelatedGraph(cards, [])).toThrow(/Zorblax/);
  });
});

describe('buildRelatedGraph — real catalog', () => {
  const related = buildRelatedGraph(catalog.cards, catalog.sections);

  it('relates archetype members by printed name', () => {
    const graff = related.get('burning-abyss-graff')!;
    expect(graff.archetype.length).toBeGreaterThan(0);
    for (const id of graff.archetype) {
      const other = cardsById.get(id)!;
      expect(other.name).toContain('Burning Abyss');
    }
    expect(graff.archetype).not.toContain('burning-abyss-graff');
  });

  it('relates Tour Guide to every Fiend it can summon', () => {
    const tourGuide = related.get('tour-guide-from-the-underworld')!;
    expect(tourGuide.interaction).toContain('burning-abyss-graff');
    expect(tourGuide.interaction).toContain('burning-abyss-cir');
  });

  it('does not relate a material line to every MV-1 creature', () => {
    const downerd = related.get('downerd-magician')!;
    const vanillaMv1NonXyz = catalog.cards.find(
      (card) =>
        card.manaValue === 1 &&
        !card.supertypes.includes('Xyz') &&
        card.id !== 'downerd-magician',
    );
    expect(vanillaMv1NonXyz).toBeDefined();
    expect(downerd.interaction).not.toContain(vanillaMv1NonXyz!.id);
  });

  it('never relates a card to itself', () => {
    for (const card of catalog.cards) {
      const entry = related.get(card.id)!;
      expect(entry.archetype).not.toContain(card.id);
      expect(entry.interaction).not.toContain(card.id);
    }
  });

  it('schema version is 11', () => {
    expect(catalog.schemaVersion).toBe(11);
  });
});

import { describe, expect, it } from 'vitest';
import { catalog, cardsById } from '../../src/lib/catalog';

const { extractClauses, parseConstraints, buildRelatedGraph } =
  await import('../../scripts/content/related.mjs');

const keywordRegistry = new Map(
  catalog.keywords.map((entry) => [entry.term, entry]),
);

describe('extractClauses', () => {
  it('splits on sentence punctuation and ability newlines', () => {
    expect(extractClauses('A — b. c; d\ne')).toEqual(['A', 'b', 'c', 'd', 'e']);
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
    expect(() => buildRelatedGraph(cards, [], keywordRegistry)).toThrow(
      /Zorblax/,
    );
  });

  it('automatically uses a new action from the supplied registry', () => {
    const cards = [
      {
        id: 'source',
        name: 'Source',
        archetype: null,
        subType: 'Wizard',
        colors: [],
        supertypes: [],
        manaValue: 2,
        keywords: ['Befriend'],
        ruleTextPlain: 'Befriend 1 Fiend MV 1 Creature.',
      },
      {
        id: 'target',
        name: 'Target',
        archetype: null,
        subType: 'Fiend',
        colors: [],
        supertypes: [],
        manaValue: 1,
        keywords: [],
        ruleTextPlain: '',
      },
    ];
    const registry = new Map([
      ['Befriend', { term: 'Befriend', category: 'action' }],
    ]);

    expect(
      buildRelatedGraph(cards, [], registry).get('source')!.interaction,
    ).toEqual(['target']);
  });

  it('interaction never repeats an archetype relation', () => {
    const cards = [
      {
        id: 'a',
        name: 'Burning Abyss - A',
        archetype: 'burning-abyss',
        subType: 'Fiend',
        colors: [],
        supertypes: [],
        manaValue: 1,
        keywords: ['Search'],
        ruleTextPlain: 'Search 1 "Burning Abyss" Creature from Deck.',
      },
      {
        id: 'b',
        name: 'Burning Abyss - B',
        archetype: 'burning-abyss',
        subType: 'Fiend',
        colors: [],
        supertypes: [],
        manaValue: 1,
        keywords: [],
        ruleTextPlain: '',
      },
      {
        id: 'c',
        name: 'Burning Abyss - C',
        archetype: 'burning-abyss',
        subType: 'Fiend',
        colors: [],
        supertypes: [],
        manaValue: 1,
        keywords: [],
        ruleTextPlain: '',
      },
    ];
    const sections = [{ slug: 'burning-abyss', namePattern: 'Burning Abyss' }];
    const registry = new Map([
      ['Search', { term: 'Search', category: 'action' }],
    ]);

    const graph = buildRelatedGraph(cards, sections, registry);
    expect(graph.get('a')!.archetype).toEqual(
      expect.arrayContaining(['b', 'c']),
    );
    expect(graph.get('a')!.interaction).not.toContain('b');
    expect(graph.get('a')!.interaction).not.toContain('c');
  });
});

describe('buildRelatedGraph — real catalog', () => {
  const related = buildRelatedGraph(
    catalog.cards,
    catalog.sections,
    keywordRegistry,
  );

  it('relates archetype members by printed name', () => {
    const graff = related.get('burning-abyss-graff')!;
    expect(graff.archetype.length).toBeGreaterThan(0);
    for (const id of graff.archetype) {
      const other = cardsById.get(id)!;
      expect(other.name).toContain('Burning Abyss');
    }
    expect(graff.archetype).not.toContain('burning-abyss-graff');
  });

  it('relates Tour Guide to the eligible Fiend MV-1 targets outside its archetype', () => {
    const entry = related.get('tour-guide-from-the-underworld')!;
    const archetypeIds = new Set(entry.archetype);
    const eligible = catalog.cards
      .filter(
        (card) =>
          card.id !== 'tour-guide-from-the-underworld' &&
          card.manaValue === 1 &&
          card.subType.split(/\s+/).includes('Fiend'),
      )
      .map((card) => card.id);
    expect(eligible.length).toBeGreaterThan(2);
    const expected = eligible
      .filter((id) => !archetypeIds.has(id))
      .sort((a, b) =>
        cardsById.get(a)!.name.localeCompare(cardsById.get(b)!.name),
      );
    expect(entry.interaction).toEqual(expected);
  });

  it('does not attach Gagaga Cowboy material constraints to Detach', () => {
    expect(related.get('gagaga-cowboy')!.interaction).toEqual([]);
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

  it('interaction never repeats an archetype relation (real catalog)', () => {
    for (const card of catalog.cards) {
      const entry = related.get(card.id)!;
      const archetypeSet = new Set(entry.archetype);
      const overlap = entry.interaction.filter((id: string) =>
        archetypeSet.has(id),
      );
      expect(overlap).toEqual([]);
    }
  });

  it("Tour Guide's Burning Abyss targets live in the archetype list only", () => {
    const entry = related.get('tour-guide-from-the-underworld')!;
    expect(entry.archetype).toContain('burning-abyss-graff');
    expect(entry.interaction).not.toContain('burning-abyss-graff');
  });

  it('schema version is 11', () => {
    expect(catalog.schemaVersion).toBe(11);
  });
});

import { describe, expect, it } from 'vitest';

const { quotedNames, buildRelatedGraph } =
  await import('../../scripts/content/related.mjs');

type FixtureCard = {
  id: string;
  name: string;
  archetype: string | null;
  ruleText: string;
  ruleTextPlain: string;
};

type FixtureSection = {
  slug: string;
  label: string;
  namePattern: string;
  route: string;
  cardIds: string[];
};

function card(
  id: string,
  name: string,
  ruleText = '',
  archetype: string | null = null,
): FixtureCard {
  return { id, name, archetype, ruleText, ruleTextPlain: ruleText };
}

function section(
  slug: string,
  label: string,
  namePattern: string,
  cardIds: string[],
): FixtureSection {
  return {
    slug,
    label,
    namePattern,
    route: `/archetypes/${slug}/`,
    cardIds,
  };
}

describe('quotedNames', () => {
  it('extracts curly and straight quoted tokens once', () => {
    expect(
      quotedNames('Search 1 “Nekroz” Creature; Discard “Nekroz”.'),
    ).toEqual(['Nekroz']);
  });
});

describe('buildRelatedGraph', () => {
  const nekrozCards = [
    card('unicore', 'Nekroz of Unicore'),
    card('brionac', 'Nekroz of Brionac'),
    card('clausolas', 'Nekroz of Clausolas'),
  ];
  const nekroz = section(
    'nekroz',
    'Nekroz',
    'Nekroz',
    nekrozCards.map(({ id }) => id),
  );

  it('a foreign archetype name produces one archetype reference', () => {
    const cards = [
      card('staple', 'Staple', 'Search 1 “Nekroz” Creature'),
      ...nekrozCards,
    ];

    expect(
      buildRelatedGraph(cards, [nekroz]).get('staple')!.references,
    ).toEqual([
      {
        kind: 'archetype',
        slug: 'nekroz',
        label: 'Nekroz',
        route: '/archetypes/nekroz/',
        count: 3,
      },
    ]);
  });

  it('every member of the referenced archetype is referenced back', () => {
    const cards = [
      card('staple', 'Staple', 'Search 1 “Nekroz” Creature'),
      ...nekrozCards,
    ];
    const graph = buildRelatedGraph(cards, [nekroz]);

    for (const member of nekrozCards)
      expect(graph.get(member.id)!.referencedBy).toEqual(['staple']);
  });

  it('a card naming its own archetype produces no reference', () => {
    const cards = [
      card('unicore', 'Nekroz Unicore', 'Search 1 “Nekroz” Creature', 'nekroz'),
    ];
    const ownSection = section('nekroz', 'Nekroz', 'Nekroz', ['unicore']);

    expect(
      buildRelatedGraph(cards, [ownSection]).get('unicore')!.references,
    ).toEqual([]);
  });

  it('a self-name reference produces no edge', () => {
    const cards = [
      card('maxx-c', 'Maxx "C"', 'Discard “C”.'),
      card('catastor', 'Catastor'),
    ];
    const graph = buildRelatedGraph(cards, []);

    expect(graph.get('maxx-c')!.references).toEqual([]);
    expect(graph.get('catastor')!.referencedBy).toEqual([]);
  });

  it('a foreign card name produces a card reference both ways', () => {
    const cards = [card('a', 'Tutor', 'Search “Dante”.'), card('b', 'Dante')];
    const graph = buildRelatedGraph(cards, []);

    expect(graph.get('a')!.references).toEqual([{ kind: 'card', id: 'b' }]);
    expect(graph.get('b')!.referencedBy).toEqual(['a']);
  });

  it('an unknown quoted name fails the build', () => {
    const cards = [card('a', 'Tutor', 'Search “Nonesuch”.')];

    expect(() => buildRelatedGraph(cards, [])).toThrow(/Nonesuch/);
  });

  it('references are sorted archetype-first then by label', () => {
    const cards = [
      card('source', 'Source', 'Use “Zulu”. “Nekroz”. “Alpha”.'),
      card('zulu', 'Zulu'),
      card('alpha', 'Alpha'),
      ...nekrozCards,
    ];
    const graph = buildRelatedGraph(cards, [nekroz]);

    expect(graph.get('source')!.references).toEqual([
      expect.objectContaining({ kind: 'archetype', label: 'Nekroz' }),
      { kind: 'card', id: 'alpha' },
      { kind: 'card', id: 'zulu' },
    ]);
  });
});

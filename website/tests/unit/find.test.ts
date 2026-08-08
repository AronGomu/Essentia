import { describe, expect, it } from 'vitest';
import {
  FIND_KINDS,
  buildFindEntries,
  findGroups,
  localDeckEntries,
  type FindCatalogInput,
  type FindEntry,
} from '../../src/lib/find';

/**
 * Inline fixtures on purpose: the index has to be provable without the
 * generated catalog, so a card-data change can never turn these rows red.
 */
const fixture: FindCatalogInput = {
  cards: [
    {
      id: 'nekroz-brionac',
      name: 'Nekroz of Brionac',
      matchNames: ['Nekroz of Brionac'],
      route: '/cards/nekroz-brionac/',
      sectionLabel: 'Nekroz',
      manifestIndex: 0,
    },
    {
      id: 'nekroz-clausolas',
      name: 'Nekroz of Clausolas',
      matchNames: ['Nekroz of Clausolas'],
      route: '/cards/nekroz-clausolas/',
      sectionLabel: 'Nekroz',
      manifestIndex: 1,
    },
  ],
  docs: [
    {
      id: 'rules-zones',
      title: 'Zones',
      route: '/docs/rules/zones/',
      groupLabel: 'Rules',
    },
    {
      id: 'rules-ritual',
      title: 'Nekroz ritual summoning',
      route: '/docs/rules/ritual/',
      groupLabel: 'Rules',
    },
  ],
  posts: [
    {
      slug: 'nekroz-preview',
      title: 'Nekroz preview',
      route: '/blog/nekroz-preview/',
      date: '2026-08-05',
    },
  ],
  releases: [
    {
      id: 'LOTA-0001',
      setName: 'Legend of the Alpha',
      version: '0.1',
      route: '/releases/alpha/lota-0001/',
      decks: [
        { id: 'burning-abyss', cards: [] },
        { id: 'nekroz', cards: [] },
      ],
    },
  ],
};

const manyCards = (count: number): FindCatalogInput => ({
  ...fixture,
  cards: Array.from({ length: count }, (_, index) => ({
    id: `card-${index}`,
    name: `Nekroz number ${index}`,
    matchNames: [`Nekroz number ${index}`],
    route: `/cards/card-${index}/`,
    sectionLabel: 'Nekroz',
    manifestIndex: index,
  })),
});

const kindsOf = (groups: ReturnType<typeof findGroups>) =>
  groups.map((group) => group.kind);

describe('buildFindEntries', () => {
  it('indexes every kind', () => {
    const entries = buildFindEntries(fixture);
    expect(entries).toHaveLength(7);
    expect(entries.map((entry) => entry.kind)).toEqual([
      'card',
      'card',
      'doc',
      'doc',
      'post',
      'deck',
      'deck',
    ]);
  });

  it('builds a deck route with its anchor', () => {
    const entries = buildFindEntries(fixture);
    const deck = entries.find((entry) => entry.key.endsWith('burning-abyss'));
    expect(deck?.route).toBe('/releases/alpha/lota-0001/#deck-burning-abyss');
    expect(deck?.detail).toBe('Legend of the Alpha 0.1');
  });

  it('titles a deck from its slug', () => {
    const entries = buildFindEntries(fixture);
    const deck = entries.find((entry) => entry.key.endsWith('burning-abyss'));
    expect(deck?.title).toBe('Burning Abyss');
  });

  it('keys are unique across kinds', () => {
    const shared: FindCatalogInput = {
      ...fixture,
      cards: [
        {
          id: 'zones',
          name: 'Zones',
          matchNames: ['Zones'],
          route: '/cards/zones/',
          sectionLabel: 'Non-archetype',
          manifestIndex: 0,
        },
      ],
      docs: [
        {
          id: 'zones',
          title: 'Zones',
          route: '/docs/rules/zones/',
          groupLabel: 'Rules',
        },
      ],
    };
    const entries = buildFindEntries(shared);
    expect(new Set(entries.map((entry) => entry.key)).size).toBe(
      entries.length,
    );
  });

  it('never indexes a local deck at build time', () => {
    const entries = buildFindEntries(fixture);
    expect(entries.every((entry) => entry.source === 'catalog')).toBe(true);
    expect(JSON.stringify(entries)).not.toContain('deck:local:');
  });
});

describe('localDeckEntries', () => {
  it('indexes a local deck by name', () => {
    expect(
      localDeckEntries([
        { id: 'u1', name: 'My Nekroz', updated: '2026-08-05' },
      ])[0],
    ).toMatchObject({
      key: 'deck:local:u1',
      kind: 'deck',
      source: 'local',
      title: 'My Nekroz',
      detail: 'Saved in this browser',
      route: '/decks/#deck-u1',
    });
  });

  it('sorts local decks by most recently updated', () => {
    const entries = localDeckEntries([
      { id: 'older', name: 'Older', updated: '2026-08-01' },
      { id: 'newer', name: 'Newer', updated: '2026-08-06' },
    ]);
    const newer = entries.find((entry) => entry.key === 'deck:local:newer');
    const older = entries.find((entry) => entry.key === 'deck:local:older');
    expect(newer?.order).toBeLessThan(older?.order ?? Infinity);
  });

  it('returns nothing for an empty deck store', () => {
    expect(localDeckEntries([])).toEqual([]);
  });
});

describe('findGroups', () => {
  const entries = buildFindEntries(fixture);

  it('groups a query across kinds', () => {
    expect(kindsOf(findGroups(entries, 'nek', null, 6))).toEqual([
      'card',
      'doc',
      'post',
      'deck',
    ]);
  });

  it('caps entries per kind when unfiltered', () => {
    const groups = findGroups(buildFindEntries(manyCards(20)), '', null, 6);
    expect(groups.find((group) => group.kind === 'card')?.entries).toHaveLength(
      6,
    );
  });

  it('swaps the per-kind cap for the selected-kind bound', () => {
    // More entries than SELECTED_KIND_LIMIT (24), so the bound is actually
    // exercised: with 20 the list fell short of it and raising the limit to
    // Infinity changed nothing.
    const groups = findGroups(buildFindEntries(manyCards(30)), '', 'card', 6);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.entries).toHaveLength(24);
  });

  it('returns a browsable index for an empty query', () => {
    const groups = findGroups(entries, '', null, 6);
    expect(kindsOf(groups)).toEqual([...FIND_KINDS]);
    for (const group of groups) {
      const orders = group.entries.map((entry) => entry.order);
      expect(orders).toEqual([...orders].sort((a, b) => a - b));
    }
  });

  it('drops kinds with no match', () => {
    const groups = findGroups(entries, 'brionac', null, 6);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.kind).toBe('card');
  });

  it('puts local decks above published ones', () => {
    const local: FindEntry[] = localDeckEntries([
      { id: 'u1', name: 'My Nekroz', updated: '2026-08-05' },
      { id: 'u2', name: 'My Abyss', updated: '2026-08-06' },
    ]);
    const groups = findGroups([...entries, ...local], '', null, 6);
    const deckGroup = groups.find((group) => group.kind === 'deck');
    const sources = deckGroup?.entries.map((entry) => entry.source) ?? [];
    expect(sources).toEqual(['local', 'local', 'catalog', 'catalog']);
  });
});

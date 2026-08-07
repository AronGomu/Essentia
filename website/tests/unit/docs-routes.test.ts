import { describe, expect, it } from 'vitest';
import { docsRailGroups } from '../../src/lib/docs';
import { catalog, type CatalogDoc } from '../../src/lib/catalog';

function doc(overrides: Partial<CatalogDoc>): CatalogDoc {
  return {
    id: 'x',
    path: 'docs/X.md',
    route: '/docs/x/',
    title: 'X',
    group: 'overview',
    groupLabel: 'Overview',
    order: 0,
    body: '',
    headings: [],
    ...overrides,
  };
}

describe('docsRailGroups', () => {
  it('groups docs in catalog order', () => {
    const docs = [
      doc({ id: 'a', group: 'overview', groupLabel: 'Overview', order: 0 }),
      doc({ id: 'b', group: 'rules', groupLabel: 'Rules', order: 0 }),
    ];
    const groups = docsRailGroups(docs);
    expect(groups.map((group) => group.key)).toEqual(['overview', 'rules']);
  });

  it('drops empty groups', () => {
    const docs = [
      doc({ id: 'a', group: 'overview', groupLabel: 'Overview', order: 0 }),
      doc({ id: 'b', group: 'rules', groupLabel: 'Rules', order: 0 }),
    ];
    const groups = docsRailGroups(docs);
    expect(groups.some((group) => group.key === 'project')).toBe(false);
  });

  it('keeps per-group document order', () => {
    const docs = [
      doc({
        id: 'rules',
        route: '/docs/rules/',
        title: 'Rules',
        group: 'rules',
        groupLabel: 'Rules',
        order: 0,
      }),
      doc({
        id: 'deck-building',
        route: '/docs/rules/deck-building/',
        title: 'Deck building',
        group: 'rules',
        groupLabel: 'Rules',
        order: 1,
      }),
    ];
    const groups = docsRailGroups(docs);
    expect(groups[0]!.docs.map((entry) => entry.title)).toEqual([
      'Rules',
      'Deck building',
    ]);
  });

  it('covers every doc exactly once', () => {
    const groups = docsRailGroups(catalog.docs);
    const flattened = groups.flatMap((group) => group.docs);
    expect(flattened.length).toBe(catalog.docs.length);
  });
});

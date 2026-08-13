import { describe, expect, it } from 'vitest';
import {
  docRoute,
  groupLabelFor,
  rewriteDocLinks,
} from '../../scripts/content/docs.mjs';
import { docsRailGroups } from '../../src/lib/docs';
import type { CatalogDoc } from '../../src/lib/catalog';

function doc(overrides: Partial<CatalogDoc>): CatalogDoc {
  return {
    id: 'x',
    path: 'docs/X.md',
    route: '/docs/x/',
    title: 'X',
    group: '',
    groupLabel: '',
    order: 0,
    body: '',
    headings: [],
    ...overrides,
  };
}

describe('docRoute', () => {
  it('a nested doc keeps its numeric prefixes in the route', () => {
    expect(docRoute('docs/01_general_rules/01_ZONES.md')).toBe(
      '/docs/01-general-rules/01-zones/',
    );
  });

  it('an unnumbered folder still routes', () => {
    expect(docRoute('docs/rules/ZONES.md')).toBe('/docs/rules/zones/');
  });

  it('a root doc routes under /docs/', () => {
    expect(docRoute('docs/GLOSSARY.md')).toBe('/docs/glossary/');
  });
});

describe('rewriteDocLinks', () => {
  const knownPaths = new Set([
    'docs/00_PRESENTATION.md',
    'docs/CONTEXT.md',
    'docs/RULES.md',
    'docs/rules/ZONES.md',
  ]);

  it('rewrites a link to the first root doc as the landing route', () => {
    expect(
      rewriteDocLinks(
        '[Presentation](00_PRESENTATION.md)',
        'docs/CONTEXT.md',
        knownPaths,
      ),
    ).toBe('[Presentation](/docs/)');
  });

  it('rewrites a sibling link and keeps its anchor', () => {
    expect(
      rewriteDocLinks(
        '[Field](rules/ZONES.md#field)',
        'docs/RULES.md',
        knownPaths,
      ),
    ).toBe('[Field](/docs/rules/zones/#field)');
  });

  it('rewrites repository and ADR links to GitHub', () => {
    expect(
      rewriteDocLinks('[src](../cards_mse/)', 'docs/CONTEXT.md', knownPaths),
    ).toContain('github.com/AronGomu/YGO-x-MTG/blob/main/cards_mse/');
    expect(
      rewriteDocLinks('[adr](ADR/README.md)', 'docs/CONTEXT.md', knownPaths),
    ).toContain(
      'github.com/AronGomu/YGO-x-MTG/blob/main/docs/ADR/README.md',
    );
  });

  it('fails on a missing docs target', () => {
    expect(() =>
      rewriteDocLinks(
        '[missing](rules/NOPE.md)',
        'docs/RULES.md',
        knownPaths,
      ),
    ).toThrow(/unpublished link target/);
  });
});

describe('groupLabelFor', () => {
  it('strips the prefix and title-cases', () => {
    expect(groupLabelFor('02_burning_abyss')).toBe('Burning Abyss');
  });

  it('handles multi-word unnumbered folders', () => {
    expect(groupLabelFor('general_rules')).toBe('General Rules');
  });
});

describe('docsRailGroups', () => {
  it('preserves catalog group and doc order', () => {
    const groups = docsRailGroups([
      doc({ id: 'root-a', title: 'A', order: 0 }),
      doc({ id: 'root-b', title: 'B', order: 1 }),
      doc({
        id: 'rules',
        title: 'Rules',
        group: '01_rules',
        groupLabel: 'Rules',
        order: 0,
      }),
    ]);

    expect(groups.map((group) => group.key)).toEqual(['', '01_rules']);
    expect(groups[0]?.label).toBe('');
    expect(groups[0]?.docs.map((entry) => entry.title)).toEqual(['A', 'B']);
    expect(groups[1]?.label).toBe('Rules');
  });

  it('covers every doc exactly once', () => {
    const docs = [doc({ id: 'a' }), doc({ id: 'b', group: 'rules' })];
    const flattened = docsRailGroups(docs).flatMap((group) => group.docs);

    expect(flattened).toHaveLength(docs.length);
  });
});

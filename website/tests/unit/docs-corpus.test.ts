import { describe, expect, it } from 'vitest';
import {
  docRoute,
  loadDocs,
  rewriteDocLinks,
} from '../../scripts/content/docs.mjs';

const set = new Set([
  'docs/RULES.md',
  'docs/rules/ZONES.md',
  'docs/CONTEXT.md',
]);

describe('docRoute', () => {
  it('maps a nested doc to its route', () => {
    expect(docRoute('docs/rules/ZONES.md')).toBe('/docs/rules/zones/');
  });

  it('maps the presentation doc to the index', () => {
    expect(docRoute('docs/PRESENTATION.md')).toBe('/docs/');
  });

  it('maps an archetype doc', () => {
    expect(docRoute('docs/01_burning_abyss/RULES.md')).toBe(
      '/docs/01-burning-abyss/rules/',
    );
  });
});

describe('rewriteDocLinks', () => {
  it('rewrites a sibling link', () => {
    expect(
      rewriteDocLinks('[Zones](rules/ZONES.md)', 'docs/RULES.md', set),
    ).toBe('[Zones](/docs/rules/zones/)');
  });

  it('keeps the anchor', () => {
    expect(
      rewriteDocLinks('[F](rules/ZONES.md#field)', 'docs/RULES.md', set),
    ).toBe('[F](/docs/rules/zones/#field)');
  });

  it('rewrites an out-of-docs link to GitHub', () => {
    expect(
      rewriteDocLinks('[src](../cards_mse/)', 'docs/CONTEXT.md', set),
    ).toContain('https://github.com/AronGomu/YGO-x-MTG/blob/main/cards_mse/');
  });

  it('rewrites an ADR link to GitHub', () => {
    expect(
      rewriteDocLinks('[a](ADR/README.md)', 'docs/CONTEXT.md', set),
    ).toContain(
      'https://github.com/AronGomu/YGO-x-MTG/blob/main/docs/ADR/README.md',
    );
  });

  it('fails on a missing docs target', () => {
    expect(() =>
      rewriteDocLinks('[x](rules/NOPE.md)', 'docs/RULES.md', set),
    ).toThrow(/unpublished link target/);
  });
});

describe('loadDocs', () => {
  it('loads every published doc', async () => {
    const docs = await loadDocs();
    expect(docs.length).toBe(37);
  });

  it('excludes ADRs', async () => {
    const docs = await loadDocs();
    expect(docs.every((doc) => !doc.path.startsWith('docs/ADR/'))).toBe(true);
  });

  it('extracts titles and outlines', async () => {
    const docs = await loadDocs();
    const entry = docs.find((doc) => doc.path === 'docs/keywords/EVENTS.md');
    expect(entry?.title).toBe('Event keywords');
    expect(entry?.headings).toContainEqual({
      id: 'combat-entry',
      text: 'Combat/entry',
      level: 2,
    });
  });

  it('orders groups', async () => {
    const docs = await loadDocs();
    const groups = docs.map((doc) => doc.group);
    expect(groups[0]).toBe('overview');
    expect(groups.at(-1)).toBe('project');
  });
});

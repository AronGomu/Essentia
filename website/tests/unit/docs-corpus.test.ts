import { rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  docRoute,
  loadDocs,
  rewriteDocLinks,
} from '../../scripts/content/docs.mjs';
import { loadKeywordRegistry } from '../../scripts/content/keywords.mjs';
import { loadReadingOrder } from '../../scripts/content/reading-order.mjs';

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
    const docs = await loadDocs((await loadReadingOrder()).docs);
    expect(docs.length).toBe(38);
  });

  it('excludes ADRs', async () => {
    const docs = await loadDocs((await loadReadingOrder()).docs);
    expect(docs.every((doc) => !doc.path.startsWith('docs/ADR/'))).toBe(true);
  });

  it('extracts titles and outlines', async () => {
    const docs = await loadDocs((await loadReadingOrder()).docs);
    const entry = docs.find((doc) => doc.path === 'docs/keywords/EVENTS.md');
    expect(entry?.title).toBe('Event keywords');
    expect(entry?.headings).toContainEqual({
      id: 'combat-entry',
      text: 'Combat/entry',
      level: 2,
    });
  });

  it('orders groups', async () => {
    const docs = await loadDocs((await loadReadingOrder()).docs);
    const groups = docs.map((doc) => doc.group);
    expect(groups[0]).toBe('overview');
    expect(groups.at(-1)).toBe('project');
  });

  it('skips keyword definition files', async () => {
    const docs = await loadDocs((await loadReadingOrder()).docs);
    expect(
      docs.some((doc) => /^docs\/keywords\/[a-z0-9-]+\.md$/.test(doc.path)),
    ).toBe(false);
  });

  it('groups docs from the config', async () => {
    const docs = await loadDocs((await loadReadingOrder()).docs);
    expect(docs[0]?.path).toBe('docs/PRESENTATION.md');
    expect(docs[0]?.group).toBe('overview');
  });

  it('fails on an ungrouped doc', async () => {
    const { docs: groups } = await loadReadingOrder();
    const withoutRules = groups.filter((group) => group.key !== 'rules');
    await expect(loadDocs(withoutRules)).rejects.toThrow(
      /is not listed in the reading order/,
    );
  });

  it('fails on a configured doc that does not exist', async () => {
    const { docs: groups } = await loadReadingOrder();
    const withGhost = groups.map((group) =>
      group.key === 'overview'
        ? { ...group, files: [...(group.files ?? []), 'docs/GHOST.md'] }
        : group,
    );
    await expect(loadDocs(withGhost)).rejects.toThrow(
      /reading group overview: configured doc docs\/GHOST\.md does not exist/,
    );
  });

  it('does not load a non-kebab-case keyword file, and fails the corpus with it left as an unlisted doc', async () => {
    const target = fileURLToPath(
      new URL('../../../docs/keywords/Bad_Name.md', import.meta.url),
    );
    writeFileSync(
      target,
      '---\nterm: Bad Name\ncategory: action\norigin: essentia\ndoc: docs/KEYWORDS.md\n---\n\nA demonstration ruling written by hand for the smoke test.\n',
      'utf8',
    );
    try {
      // Half one: it is not a keyword — the loader's kebab-case filter drops it.
      const registry = await loadKeywordRegistry();
      expect(
        [...registry.values()].some((entry) => entry.id === 'Bad_Name'),
      ).toBe(false);
      expect(registry.size).toBe(73);
      // Half two: so nothing claims it, and the docs corpus refuses it loudly
      // rather than letting a misnamed ruling vanish from the site.
      await expect(loadDocs((await loadReadingOrder()).docs)).rejects.toThrow(
        /is not listed in the reading order/,
      );
    } finally {
      rmSync(target, { force: true });
    }
  });
});

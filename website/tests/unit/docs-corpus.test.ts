import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
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

const tempRoots: string[] = [];
async function tempRoot(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), 'essentia-docs-corpus-'));
  tempRoots.push(root);
  return root;
}

afterEach(async () => {
  await Promise.all(
    tempRoots
      .splice(0)
      .map((root) => rm(root, { recursive: true, force: true })),
  );
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

  it('keeps the authored order inside a group', async () => {
    // The headline of e3c9c82. Dropping `a.order - b.order` from the sort
    // silently flips the group to alphabetical-by-title, and every other
    // assertion here survives it.
    const { docs: groups } = await loadReadingOrder();
    const docs = await loadDocs(groups);
    const rules = groups.find((group) => group.key === 'rules');
    const loaded = docs
      .filter((doc) => doc.group === 'rules')
      .map((doc) => doc.path);

    expect(rules?.files?.length).toBeGreaterThan(1);
    expect(loaded).toEqual(rules?.files);

    // …and the assertion above is only worth anything while the authored order
    // and the alphabetical one differ.
    const titles = docs
      .filter((doc) => doc.group === 'rules')
      .map((doc) => doc.title);
    expect(titles).not.toEqual([...titles].sort((a, b) => a.localeCompare(b)));
  });

  it('does not load a non-kebab-case keyword file, and fails the corpus with it left as an unlisted doc', async () => {
    // The fixture lives in a temp tree, never in the tracked one: cleanup used
    // to run only in `finally`, so a SIGKILL or a vitest timeout left
    // `docs/keywords/Bad_Name.md` behind and broke `npm run content` — and
    // therefore `build` and `ci` — for everyone until a human deleted it.
    const root = await tempRoot();
    const keywords = path.join(root, 'docs', 'keywords');
    await mkdir(keywords, { recursive: true });
    await writeFile(
      path.join(root, 'docs', 'PRESENTATION.md'),
      '# Presentation\n\nBody.\n',
      'utf8',
    );
    const frontMatter =
      '---\nterm: Bad Name\ncategory: action\norigin: essentia\ndoc: docs/KEYWORDS.md\npreview: false\nreminder: false\n---\n\nA demonstration ruling written by hand for the smoke test.\n';
    await writeFile(path.join(keywords, 'Bad_Name.md'), frontMatter, 'utf8');
    await writeFile(
      path.join(keywords, 'good-name.md'),
      frontMatter.replace('term: Bad Name', 'term: Good Name'),
      'utf8',
    );

    // Half one: it is not a keyword — the loader's kebab-case filter drops it,
    // while its correctly named sibling is loaded, so this is not vacuous.
    const registry = await loadKeywordRegistry(keywords);
    expect([...registry.values()].map((entry) => entry.id)).toEqual([
      'good-name',
    ]);

    // Half two: so nothing claims it, and the docs corpus refuses it loudly
    // rather than letting a misnamed ruling vanish from the site.
    await expect(
      loadDocs(
        [
          {
            key: 'overview',
            label: 'Overview',
            files: ['docs/PRESENTATION.md'],
          },
        ],
        root,
      ),
    ).rejects.toThrow(
      /doc docs\/keywords\/Bad_Name\.md is not listed in the reading order/,
    );
  });

  it('still reads the repository docs when given no root', async () => {
    // The default argument is what the content build relies on.
    const docs = await loadDocs((await loadReadingOrder()).docs);
    expect(docs.some((doc) => doc.path === 'docs/PRESENTATION.md')).toBe(true);
  });
});

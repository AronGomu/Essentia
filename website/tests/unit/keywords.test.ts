import { existsSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  extractKeywords,
  loadKeywordRegistry,
  normalizeKeyword,
  splitComposite,
} from '../../scripts/content/keywords.mjs';
import { catalog } from '../../src/lib/catalog';

const registry = new Map(
  [
    'Detach N',
    'Mill N',
    'Ward N',
    'Negate',
    'Destroy',
    'Target',
    'Discard',
  ].map((term) => [term, { id: term.toLowerCase(), term, category: 'action' }]),
);

describe('keyword normalization', () => {
  it('folds integer and X parameters to N so one entry covers them', () => {
    expect(normalizeKeyword('Detach 1')).toBe('Detach N');
    expect(normalizeKeyword('Detach 2')).toBe('Detach N');
    expect(normalizeKeyword('Detach X')).toBe('Detach N');
    expect(normalizeKeyword('Ward 3')).toBe('Ward N');
  });

  it('leaves a digit glued to a word alone', () => {
    expect(normalizeKeyword('MV2+ Opponent')).toBe('MV2+ Opponent');
  });

  it('folds curly quotes so card text matches the registry', () => {
    expect(normalizeKeyword('On Cast “Spellbook”')).toBe('On Cast "Spellbook"');
  });
});

describe('composite invocations', () => {
  it('splits on and / ampersand', () => {
    expect(splitComposite('Detach 1 and Mill 3')).toEqual([
      'Detach 1',
      'Mill 3',
    ]);
    expect(splitComposite('Negate & Destroy')).toEqual(['Negate', 'Destroy']);
  });

  it('leaves a single invocation intact', () => {
    expect(splitComposite('Protection from everything')).toEqual([
      'Protection from everything',
    ]);
  });
});

describe('keyword extraction', () => {
  it('resolves bold invocations against the registry, deduped and sorted', () => {
    expect(
      extractKeywords(
        '<b>Target</b> then <b>Discard</b> and <b>Target</b>',
        registry,
        'card',
      ),
    ).toEqual(['Discard', 'Target']);
  });

  it('splits a composite into its constituent keywords', () => {
    expect(
      extractKeywords('<b>Detach 1 and Mill 3</b>', registry, 'card'),
    ).toEqual(['Detach N', 'Mill N']);
  });

  it('ignores nested markup inside the bold run', () => {
    expect(
      extractKeywords('<b><kw-a>Target</kw-a></b>', registry, 'card'),
    ).toEqual(['Target']);
  });

  it('fails the build on an undocumented bold phrase', () => {
    expect(() =>
      extractKeywords('<b>Wibble</b>', registry, 'bad-card'),
    ).toThrow(/unknown keyword/);
  });
});

describe('published keyword closure', () => {
  it('resolves every keyword used by a published card to the registry', () => {
    const known = new Set(catalog.keywords.map((keyword) => keyword.term));
    for (const version of catalog.cardVersions)
      for (const term of version.keywords) expect(known).toContain(term);
  });

  it('stores every registry term in normalized form', () => {
    for (const keyword of catalog.keywords)
      expect(normalizeKeyword(keyword.term)).toBe(keyword.term);
  });
});

const VALID_BODY = 'A valid demonstration definition for the registry fixture.';

const VALID_FRONT_MATTER: Record<string, string> = {
  term: 'Demo',
  category: 'action',
  origin: 'essentia',
  doc: 'docs/KEYWORDS.md',
};

/** Write one keyword file into `dir`, front matter first then body. */
function writeKeywordFile(
  dir: string,
  filename: string,
  frontMatter: Record<string, string>,
  body: string = VALID_BODY,
) {
  const lines = Object.entries(frontMatter).map(
    ([key, value]) => `${key}: ${value}`,
  );
  writeFileSync(
    path.join(dir, filename),
    `---\n${lines.join('\n')}\n---\n\n${body}\n`,
    'utf8',
  );
}

/** Write a one-entry keyword directory so the loader can accept or reject it. */
function fixture(
  overrides: Record<string, string | undefined>,
  body: string = VALID_BODY,
): string {
  const dir = mkdtempSync(path.join(tmpdir(), 'essentia-keyword-registry-'));
  const merged: Record<string, string> = { ...VALID_FRONT_MATTER };
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) delete merged[key];
    else merged[key] = value;
  }
  writeKeywordFile(dir, 'demo.md', merged, body);
  return dir;
}

describe('keyword registry rulings', () => {
  it('loads every keyword file', async () => {
    const registry = await loadKeywordRegistry();
    expect(registry.size).toBe(73);
  });

  it('reads the definition from the file body', async () => {
    const registry = await loadKeywordRegistry();
    expect(registry.get('Mill N')?.definition).toBe(
      'Send N cards from the top of your Deck to the Grave. The quantity is always printed.',
    );
  });

  it('keeps the archetype key', async () => {
    const registry = await loadKeywordRegistry();
    const entry = registry.get('Nekroz Recovery');
    expect(entry?.category).toBe('archetype');
    expect(entry?.archetype).toBe('nekroz');
  });

  it('derives the id from the filename', async () => {
    const registry = await loadKeywordRegistry();
    expect(registry.get('Mill N')?.id).toBe('mill-n');
  });

  it('ignores the UPPER_CASE module docs', async () => {
    const registry = await loadKeywordRegistry();
    for (const entry of registry.values())
      expect(entry.id).not.toMatch(/[A-Z_]/);
  });

  it('every registered keyword has a definition', async () => {
    const registry = await loadKeywordRegistry();
    for (const entry of registry.values()) {
      expect(typeof entry.definition).toBe('string');
      expect(entry.definition.trim()).toBe(entry.definition);
      expect(entry.definition.length).toBeGreaterThanOrEqual(20);
      expect(entry.definition.length).toBeLessThanOrEqual(400);
      expect(entry.definition).not.toMatch(/[<>]/);
    }
  });

  it('every registered keyword has an origin', async () => {
    for (const entry of (await loadKeywordRegistry()).values())
      expect(['magic', 'essentia']).toContain(entry.origin);
  });

  it('every doc path exists', async () => {
    for (const entry of (await loadKeywordRegistry()).values())
      expect(
        existsSync(new URL(`../../../${entry.doc}`, import.meta.url)),
      ).toBe(true);
  });

  it('rejects an unknown front-matter key', async () => {
    await expect(
      loadKeywordRegistry(fixture({ colour: 'red' })),
    ).rejects.toThrow(/unknown front-matter key colour/);
  });

  it('rejects a missing term', async () => {
    await expect(
      loadKeywordRegistry(fixture({ term: undefined })),
    ).rejects.toThrow(/missing required key term/);
  });

  it('rejects a short definition', async () => {
    await expect(loadKeywordRegistry(fixture({}, 'too short'))).rejects.toThrow(
      /definition must be 20-400 plain-text characters/,
    );
  });

  it('rejects HTML in a definition', async () => {
    await expect(
      loadKeywordRegistry(fixture({}, 'a <b>bold</b> definition here')),
    ).rejects.toThrow(/definition must be 20-400 plain-text characters/);
  });

  it('rejects a multi-line definition', async () => {
    await expect(
      loadKeywordRegistry(fixture({}, 'line one\n\nline two')),
    ).rejects.toThrow(/definition must be a single paragraph/);
  });

  it('rejects angle brackets in a term', async () => {
    await expect(
      loadKeywordRegistry(fixture({ term: 'Demo <b>' })),
    ).rejects.toThrow(/term must be plain text without < or >/);
  });

  it('R5 rejects a term carrying a script-closing tag', async () => {
    await expect(
      loadKeywordRegistry(
        fixture({ term: '</script><script>alert(1)</script>' }),
      ),
    ).rejects.toThrow(/term must be plain text without < or >/);
  });

  it('rejects an unknown origin', async () => {
    await expect(
      loadKeywordRegistry(fixture({ origin: 'konami' })),
    ).rejects.toThrow(/origin must be magic or essentia/);
  });

  it('rejects a missing doc', async () => {
    await expect(
      loadKeywordRegistry(fixture({ doc: 'docs/NOPE.md' })),
    ).rejects.toThrow(/doc docs\/NOPE\.md does not exist/);
  });

  // `on-cast-spellbook` is live registry data: `category: event` with
  // `archetype: spellbook`. The loader must accept `archetype` on any category.
  it('accepts a non-archetype entry carrying archetype', async () => {
    const registry = await loadKeywordRegistry(
      fixture({
        term: 'On Cast "Spellbook"',
        category: 'event',
        archetype: 'spellbook',
      }),
    );
    expect(registry.get('On Cast "Spellbook"')?.archetype).toBe('spellbook');
  });

  it('rejects an archetype entry without archetype', async () => {
    await expect(
      loadKeywordRegistry(fixture({ category: 'archetype' })),
    ).rejects.toThrow(/missing required key archetype/);
  });

  it('rejects a duplicate term', async () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'essentia-keyword-registry-'));
    writeKeywordFile(dir, 'demo-a.md', { ...VALID_FRONT_MATTER, term: 'Demo' });
    writeKeywordFile(dir, 'demo-b.md', { ...VALID_FRONT_MATTER, term: 'Demo' });
    await expect(loadKeywordRegistry(dir)).rejects.toThrow(
      /duplicate keyword term Demo/,
    );
  });

  it('rejects an unnormalized term', async () => {
    await expect(
      loadKeywordRegistry(fixture({ term: 'Detach 1' })),
    ).rejects.toThrow(/must be stored in normalized form/);
  });
});

describe('catalog keyword rulings', () => {
  it('catalog exposes the new fields', () => {
    const first = catalog.keywords[0]!;
    expect(typeof first.definition).toBe('string');
    expect(typeof first.origin).toBe('string');
    expect(typeof first.doc).toBe('string');
  });

  it('keyword count in the catalog', () => {
    expect(
      catalog.keywords.filter((keyword) => keyword.origin === 'magic'),
    ).toHaveLength(22);
    expect(
      catalog.keywords.filter((keyword) => keyword.origin === 'essentia'),
    ).toHaveLength(51);
    expect(catalog.keywords).toHaveLength(73);
  });
});

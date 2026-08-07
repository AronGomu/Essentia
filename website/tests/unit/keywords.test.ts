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

const FIXTURES = mkdtempSync(path.join(tmpdir(), 'essentia-keyword-registry-'));

const VALID_ENTRY = {
  id: 'demo',
  term: 'Demo',
  category: 'action',
  definition: 'A valid demonstration definition for the registry fixture.',
  origin: 'essentia',
  doc: 'docs/KEYWORDS.md',
};

let fixtureCount = 0;

/** Write a one-entry registry to a temp file so the loader can reject it. */
function fixture(
  overrides: Record<string, unknown>,
  schemaVersion = 2,
): string {
  fixtureCount += 1;
  const file = path.join(FIXTURES, `registry-${fixtureCount}.json`);
  writeFileSync(
    file,
    JSON.stringify({
      schemaVersion,
      source: 'unit-test fixture',
      keywords: [{ ...VALID_ENTRY, ...overrides }],
    }),
  );
  return file;
}

describe('keyword registry rulings', () => {
  it('every registered keyword has a definition', async () => {
    const registry = await loadKeywordRegistry();
    expect(registry.size).toBe(73);
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

  it('rejects schemaVersion 1', async () => {
    await expect(loadKeywordRegistry(fixture({}, 1))).rejects.toThrow(
      'content: keyword registry must use schemaVersion 2',
    );
  });

  it('rejects a short definition', async () => {
    await expect(
      loadKeywordRegistry(fixture({ definition: 'too short' })),
    ).rejects.toThrow(/definition must be 20-400 plain-text characters/);
  });

  it('rejects HTML in a definition', async () => {
    await expect(
      loadKeywordRegistry(
        fixture({ definition: 'a <b>bold</b> definition here' }),
      ),
    ).rejects.toThrow(/definition must be 20-400 plain-text characters/);
  });

  it('R5 rejects a term carrying a script-closing tag', async () => {
    await expect(
      loadKeywordRegistry(
        fixture({ id: 'demo', term: '</script><script>alert(1)</script>' }),
      ),
    ).rejects.toThrow(/<\/script><script>alert\(1\)<\/script>/);
  });

  it('R5 rejects angle brackets in a term', async () => {
    await expect(
      loadKeywordRegistry(fixture({ term: 'Demo <b>' })),
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
});

describe('catalog keyword rulings', () => {
  it('catalog exposes the new fields', () => {
    const first = catalog.keywords[0]!;
    expect(typeof first.definition).toBe('string');
    expect(typeof first.origin).toBe('string');
    expect(typeof first.doc).toBe('string');
  });

  it('counts the keyword origins', () => {
    expect(
      catalog.keywords.filter((keyword) => keyword.origin === 'magic'),
    ).toHaveLength(22);
    expect(
      catalog.keywords.filter((keyword) => keyword.origin === 'essentia'),
    ).toHaveLength(51);
    expect(catalog.keywords).toHaveLength(73);
  });
});

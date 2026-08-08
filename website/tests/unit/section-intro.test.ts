import { mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  loadSectionIntros,
  sectionIntroSummary,
} from '../../scripts/content/section-intros.mjs';

let fixtureRoot: string;

beforeEach(async () => {
  fixtureRoot = await mkdtemp(
    path.join(os.tmpdir(), 'essentia-section-intro-'),
  );
});

afterEach(async () => {
  await rm(fixtureRoot, { recursive: true, force: true });
});

describe('loadSectionIntros', () => {
  it('loads one intro per section', async () => {
    const map = await loadSectionIntros(
      new Set([
        'non-archetype',
        'burning-abyss',
        'shaddoll',
        'nekroz',
        'spellbook',
      ]),
    );
    expect(map).toBeInstanceOf(Map);
    expect(map.size).toBe(5);
  });

  it('keeps the two unrequested sections at their pre-rewrite wording', async () => {
    // The plan asked for three rewrites — non-archetype, nekroz, burning-abyss.
    // Shaddoll and Spellbook were migrated into this directory, not reworded,
    // so their bodies are the strings `introFromDoc()` produced at 09ab091.
    const map = await loadSectionIntros(
      new Set([
        'non-archetype',
        'burning-abyss',
        'shaddoll',
        'nekroz',
        'spellbook',
      ]),
    );
    expect(map.get('shaddoll')).toBe(
      'Shaddoll is black Control / Value / Fusion.',
    );
    expect(map.get('spellbook')).toBe(
      'Spellbook is a Wizard/spell-chain archetype. It accumulates named Spellbook resources, converts casts into incremental advantage, and rewards sequencing multiple spells in one turn.',
    );
    // …and what reaches `<meta name="description">` is that same text.
    expect(sectionIntroSummary(map.get('shaddoll')!)).toBe(
      'Shaddoll is black Control / Value / Fusion.',
    );
    expect(sectionIntroSummary(map.get('spellbook')!)).toBe(
      'Spellbook is a Wizard/spell-chain archetype. It accumulates named Spellbook resources, converts casts into incremental advantage, and rewards sequencing multiple spells in one turn.',
    );
  });

  it('fails on a missing intro', async () => {
    await expect(
      loadSectionIntros(
        new Set([
          'non-archetype',
          'burning-abyss',
          'shaddoll',
          'nekroz',
          'spellbook',
          'ghost',
        ]),
      ),
    ).rejects.toThrow(/section ghost: missing intro file/);
  });

  it('fails on an unknown intro file', async () => {
    await writeFile(path.join(fixtureRoot, 'ghost.md'), 'Ghost body.');
    await expect(
      loadSectionIntros(new Set(['non-archetype']), fixtureRoot),
    ).rejects.toThrow(/unknown section intro ghost/);
  });

  it('rejects raw HTML', async () => {
    await writeFile(
      path.join(fixtureRoot, 'non-archetype.md'),
      'a <b>bold</b> intro',
    );
    await expect(
      loadSectionIntros(new Set(['non-archetype']), fixtureRoot),
    ).rejects.toThrow(/unsafe section intro/);
  });

  it('rejects a link that is not http(s), mailto, an anchor or site-absolute', async () => {
    // The guard that stops `[x](javascript:alert(1))` in an authored intro
    // reaching the rendered hero markdown. Replacing it with a constant-false
    // condition used to leave the whole suite green.
    await writeFile(
      path.join(fixtureRoot, 'non-archetype.md'),
      'An intro with [a trap](javascript:alert(1)) in it.',
    );
    await expect(
      loadSectionIntros(new Set(['non-archetype']), fixtureRoot),
    ).rejects.toThrow(/unsafe section intro URL non-archetype\.md/);
  });

  it('accepts the link schemes the allowlist names', async () => {
    // …and the rejection above is only meaningful while these still pass.
    await writeFile(
      path.join(fixtureRoot, 'non-archetype.md'),
      'See [the docs](/docs/), [the site](https://example.com/), [us](mailto:a@example.com) and [below](#more).',
    );
    const map = await loadSectionIntros(
      new Set(['non-archetype']),
      fixtureRoot,
    );
    expect(map.get('non-archetype')).toContain('[the docs](/docs/)');
  });

  it('rejects a symlinked intro', async () => {
    const real = path.join(fixtureRoot, 'real.txt');
    await writeFile(real, 'A perfectly ordinary intro body.');
    await symlink(real, path.join(fixtureRoot, 'non-archetype.md'));
    await expect(
      loadSectionIntros(new Set(['non-archetype']), fixtureRoot),
    ).rejects.toThrow(/unsafe section intro non-archetype\.md/);
  });

  it('rejects an oversize intro', async () => {
    await writeFile(
      path.join(fixtureRoot, 'non-archetype.md'),
      'x'.repeat(262_145),
    );
    await expect(
      loadSectionIntros(new Set(['non-archetype']), fixtureRoot),
    ).rejects.toThrow(/unsafe section intro non-archetype\.md/);
  });

  it('accepts an intro just under the size ceiling', async () => {
    await writeFile(
      path.join(fixtureRoot, 'non-archetype.md'),
      'x'.repeat(262_144),
    );
    const map = await loadSectionIntros(
      new Set(['non-archetype']),
      fixtureRoot,
    );
    expect(map.get('non-archetype')?.length).toBe(262_144);
  });
});

describe('sectionIntroSummary', () => {
  it('derives the plain intro from the first paragraph', () => {
    expect(sectionIntroSummary('First para.\n\n- bullet\n\nSecond para.')).toBe(
      'First para.',
    );
  });

  it('caps the plain intro at 360 characters', () => {
    const long = `${'word '.repeat(100)}`.trim();
    const result = sectionIntroSummary(long);
    expect(result.length).toBeLessThanOrEqual(360);
    expect(result).not.toMatch(/\s$/);
  });
});

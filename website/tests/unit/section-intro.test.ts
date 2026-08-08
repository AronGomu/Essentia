import { mkdtemp, rm, writeFile } from 'node:fs/promises';
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

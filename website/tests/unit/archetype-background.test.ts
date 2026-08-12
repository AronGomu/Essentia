import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const websiteRoot = new URL('../../', import.meta.url);
const publicBackgrounds = new URL('public/backgrounds/', websiteRoot);
const css = readFileSync(
  new URL('src/styles/global.css', websiteRoot),
  'utf-8',
);
const provenance = JSON.parse(
  readFileSync(new URL('content/art-provenance.json', websiteRoot), 'utf-8'),
);

const BACKGROUND_SLUGS = ['burning-abyss', 'nekroz'];

describe('archetype background assets', () => {
  it('exists and stays under 600 KiB for each slug', () => {
    for (const slug of BACKGROUND_SLUGS) {
      const file = new URL(`${slug}.webp`, publicBackgrounds);
      const { size } = statSync(file);
      expect(size).toBeGreaterThan(0);
      expect(size).toBeLessThan(600 * 1024);
    }
  });

  it('has a provenance entry for every background file', () => {
    const keys = new Set(
      (provenance.art ?? []).map((entry: { key: string }) => entry.key),
    );
    for (const slug of BACKGROUND_SLUGS) {
      expect(keys.has(`/backgrounds/${slug}.webp`)).toBe(true);
    }
  });

  it('admits AI generation in the provenance note', () => {
    expect(provenance.note).toMatch(/AI[- ]generated/i);
    expect(provenance.note).not.toMatch(/No generative service is used/i);
  });
});

describe('body::before photo layer', () => {
  function sliceBlock(source: string, startMarker: string): string {
    const start = source.indexOf(startMarker);
    if (start === -1) throw new Error(`start marker not found: ${startMarker}`);
    const end = source.indexOf('}', start);
    if (end === -1)
      throw new Error(`closing brace not found after ${startMarker}`);
    return source.slice(start, end + 1);
  }

  it('layers atmosphere, dim veil, then the photo, in that order', () => {
    const rule = sliceBlock(css, 'body::before {');
    const backgroundDeclaration = sliceBlock(rule, 'background:');
    const atmosphereIndex = backgroundDeclaration.indexOf('--page-atmosphere');
    const veilIndex = backgroundDeclaration.indexOf(
      'linear-gradient(oklch(0.08 0 0 / 0.72)',
    );
    const photoIndex = backgroundDeclaration.indexOf('--page-photo');
    expect(atmosphereIndex).toBeGreaterThan(-1);
    expect(veilIndex).toBeGreaterThan(atmosphereIndex);
    expect(photoIndex).toBeGreaterThan(veilIndex);
    expect(backgroundDeclaration).toMatch(/var\(--page-photo,\s*none\)/);
  });
});

describe('background prop usage', () => {
  function collectAstroFiles(directory: string): string[] {
    const entries = readdirSync(directory, { withFileTypes: true });
    return entries.flatMap((entry) => {
      const full = path.join(directory, entry.name);
      if (entry.isDirectory()) return collectAstroFiles(full);
      return entry.name.endsWith('.astro') ? [full] : [];
    });
  }

  it('is passed only by the archetype slug page', () => {
    const pagesRoot = path.join(
      path.dirname(new URL(import.meta.url).pathname),
      '../../src/pages',
    );
    const files = collectAstroFiles(pagesRoot);
    const withBackgroundProp = files.filter((file) =>
      /\bbackground=/.test(readFileSync(file, 'utf-8')),
    );
    expect(withBackgroundProp).toHaveLength(1);
    expect(withBackgroundProp.at(0)?.endsWith('archetypes/[slug].astro')).toBe(
      true,
    );
  });
});

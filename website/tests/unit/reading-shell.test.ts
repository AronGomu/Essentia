import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const globalCss = readFileSync(
  new URL('../../src/styles/global.css', import.meta.url),
  'utf-8',
);

const PAGE_SOURCES = [
  '../../src/pages/docs/index.astro',
  '../../src/pages/docs/[...path].astro',
  '../../src/pages/blog/index.astro',
  '../../src/pages/blog/[slug].astro',
];

const pageSources = PAGE_SOURCES.map((relative) =>
  readFileSync(new URL(relative, import.meta.url), 'utf-8'),
);

describe('docs and blog reading shell', () => {
  it('docs and blog use the same shell class', () => {
    for (const source of pageSources) {
      expect(source).toContain('class="reading-shell');
    }
  });

  it('no page keeps the unstyled docs shell', () => {
    for (const source of pageSources) {
      expect(source.match(/docs-shell/g) ?? []).toHaveLength(0);
    }
  });

  it('the shell is inset like every other page', () => {
    const shellMatch = globalCss.match(/\.reading-shell\s*{[^}]*}/);
    expect(shellMatch).not.toBeNull();
    const block = shellMatch![0];
    expect(block).toContain('margin-inline: auto');
    expect(block).toContain('width: min(100% - 2rem, 88rem)');
  });

  it('the rail uses the reading tokens', () => {
    const railMatch = globalCss.match(/\.reading-rail\s*{[^}]*}/);
    expect(railMatch).not.toBeNull();
    const block = railMatch![0];
    expect(block).toContain('var(--reading-surface)');
    expect(block).toContain('var(--reading-rule)');
  });

  it('the prose column caps its measure', () => {
    const measureIndex = globalCss.indexOf('max-width: var(--reading-measure)');
    expect(measureIndex).toBeGreaterThan(-1);
    const preceding = globalCss.slice(
      Math.max(0, measureIndex - 300),
      measureIndex,
    );
    expect(preceding).toContain('.reading-body');
  });
});

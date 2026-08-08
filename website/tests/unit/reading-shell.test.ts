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

  it('the shell has no rail column', () => {
    const shellMatch = globalCss.match(/\.reading-shell\s*{[^}]*}/);
    expect(shellMatch).not.toBeNull();
    expect(shellMatch![0]).toMatch(
      /grid-template-columns:\s*minmax\(0, 1fr\) var\(--reading-toc\)/,
    );
    const noTocMatch = globalCss.match(/\.reading-shell--no-toc\s*{[^}]*}/);
    expect(noTocMatch).not.toBeNull();
    expect(noTocMatch![0]).toMatch(
      /grid-template-columns:\s*minmax\(0, 1fr\);/,
    );
  });

  it('the rail styles are gone', () => {
    expect(globalCss).not.toMatch(/\.reading-rail\b/);
  });

  it('no page imports a rail component', () => {
    for (const source of pageSources) {
      expect(source).not.toContain('DocsRail');
      expect(source).not.toContain('BlogRail');
    }
  });

  it('the prose column caps its measure', () => {
    // Assert on the selectors that *own* the cap, not on whatever text happens
    // to sit above it: `.reading-body { … }` is always a couple of hundred
    // characters up, so a proximity check stays green even when the cap moves
    // to another column and the prose runs the full 88rem shell width.
    const capped = [...globalCss.matchAll(/([^{}]*)\{([^{}]*)\}/g)].filter(
      (rule) => /max-width:\s*var\(--reading-measure\)/.test(rule[2] ?? ''),
    );
    expect(capped.length).toBeGreaterThan(0);
    const selectors = capped
      .flatMap((rule) => (rule[1] ?? '').split(','))
      .map((selector) => selector.trim())
      .filter(Boolean);
    for (const selector of selectors) {
      expect(selector.startsWith('.reading-body')).toBe(true);
    }
    for (const element of ['p', 'li', 'blockquote']) {
      expect(
        selectors.some((selector) =>
          new RegExp(`\\b${element}$`).test(selector),
        ),
      ).toBe(true);
    }
  });
});

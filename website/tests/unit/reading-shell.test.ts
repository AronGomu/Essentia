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
const blogPageSources = pageSources.slice(2);

describe('docs and blog reading shell', () => {
  it('docs and blog use the same shell class', () => {
    for (const source of pageSources.slice(0, 2)) {
      expect(source).toContain('class="reading-shell');
    }
    for (const source of blogPageSources) {
      expect(source).toContain("? 'reading-shell'");
      expect(source).toContain('class={shellClass}');
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

  it('both blog routes render ChapterSummary when chapters exist', () => {
    for (const source of blogPageSources) {
      expect(source).toContain(
        "import ChapterSummary from '../../components/ChapterSummary.astro';",
      );
      expect(source).toMatch(
        /headings\s*\.filter\(\(heading\) => heading\.level === 2\)\s*\.map\(\(heading\) => \(\{\s*href: '#' \+ heading\.id,\s*label: heading\.text,\s*\}\)\)/,
      );
      expect(source).toContain('<ChapterSummary items={chapters} />');
      expect(source).toMatch(/chapters\.length\s*\?\s*'reading-shell'/);
      expect(source).toContain("'reading-shell reading-shell--no-toc'");
      expect(source).toContain('class={shellClass}');
      expect(source).toContain('chapters.length > 0 &&');
    }
  });

  it('shared reading headings clear the sticky header for native fragments', () => {
    expect(globalCss).toMatch(
      /\.reading-body :is\(h2, h3, h4\)\s*\{\s*scroll-margin-top:\s*calc\(var\(--header\) \+ 1rem\);\s*\}/,
    );
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

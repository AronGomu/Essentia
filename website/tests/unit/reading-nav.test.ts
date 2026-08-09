import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { catalog, formatDate } from '../../src/lib/catalog';
import { docsRailGroups } from '../../src/lib/docs';
import {
  readingKindFor,
  readingNavGroups,
  type ReadingNavSource,
} from '../../src/lib/reading-nav';

const navigationSource = readFileSync(
  new URL('../../src/components/Navigation.svelte', import.meta.url),
  'utf-8',
);

const post = (slug: string, date: string, title: string) => ({
  slug,
  route: `/blog/${slug}/`,
  title,
  date,
});

/** Two authored groups, one of them empty, plus a slug nothing resolves. */
const blogSource: ReadingNavSource = {
  docs: [],
  posts: [
    post('second', '2026-02-02', 'Second post'),
    post('first', '2026-01-01', 'First post'),
    post('unlisted', '2026-03-03', 'Unlisted post'),
  ],
  postGroups: [
    { key: 'announcements', label: 'Announcements', slugs: ['second'] },
    { key: 'empty', label: 'Empty', slugs: [] },
    { key: 'notes', label: 'Design notes', slugs: ['first', 'missing'] },
  ],
};

describe('readingNavGroups', () => {
  it('builds docs groups for the nav', () => {
    const railGroups = docsRailGroups(catalog.docs);
    const navGroups = readingNavGroups('docs', catalog);

    expect(navGroups.map((group) => group.key)).toEqual(
      railGroups.map((group) => group.key),
    );
    expect(navGroups.map((group) => group.label)).toEqual(
      railGroups.map((group) => group.label),
    );
    expect(navGroups.map((group) => group.items)).toEqual(
      railGroups.map((group) => group.docs),
    );
    expect(navGroups.length).toBeGreaterThan(1);
  });

  it('builds blog groups from postGroups', () => {
    const groups = readingNavGroups('blog', blogSource);

    // One group per *non-empty* authored entry, in authored order — not the
    // newest-first flat list the old blog rail produced.
    expect(groups.map((group) => group.key)).toEqual([
      'announcements',
      'notes',
    ]);
    expect(groups.map((group) => group.label)).toEqual([
      'Announcements',
      'Design notes',
    ]);
    expect(groups[0]?.items).toEqual([
      {
        route: '/blog/second/',
        title: 'Second post',
        meta: formatDate('2026-02-02'),
      },
    ]);
    // A slug with no post is dropped rather than rendered as a dead link.
    expect(groups[1]?.items).toEqual([
      {
        route: '/blog/first/',
        title: 'First post',
        meta: formatDate('2026-01-01'),
      },
    ]);
    // A post outside every authored group never reaches the nav.
    expect(
      groups.flatMap((group) => group.items).map((item) => item.route),
    ).not.toContain('/blog/unlisted/');
  });

  it('builds the real blog groups from the catalog', () => {
    const groups = readingNavGroups('blog', catalog);
    expect(groups.length).toBeGreaterThan(0);
    for (const group of groups) {
      expect(group.items.length).toBeGreaterThan(0);
      for (const item of group.items) {
        expect(item.route.startsWith('/blog/')).toBe(true);
        expect(item.meta).toBeTruthy();
      }
    }
  });

  it('returns nothing outside reading pages', () => {
    expect(readingNavGroups(null, catalog)).toEqual([]);
  });
});

describe('readingKindFor', () => {
  it('derives the mode from the path', () => {
    expect(readingKindFor('/docs/rules/zones/', '/')).toBe('docs');
    expect(readingKindFor('/docs/', '/')).toBe('docs');
    expect(readingKindFor('/blog/', '/')).toBe('blog');
    expect(readingKindFor('/blog/a-post/', '/')).toBe('blog');
    expect(readingKindFor('/cards/x/', '/')).toBe(null);
    expect(readingKindFor('/decks/', '/')).toBe(null);
  });

  it('honours a deployed base path', () => {
    expect(readingKindFor('/YGO-x-MTG/docs/', '/YGO-x-MTG/')).toBe('docs');
    expect(readingKindFor('/YGO-x-MTG/blog/x/', '/YGO-x-MTG/')).toBe('blog');
    // The same suffix under a different base is not a reading page.
    expect(readingKindFor('/other/docs/', '/YGO-x-MTG/')).toBe(null);
  });
});

/**
 * Class-token matching, the same loosening `check-chrome.mjs` uses. Asserting
 * the exact attribute string broke on precisely the change the gate was
 * widened to permit — a modifier class in either position.
 */
const SWITCH_TOKEN = /class="(?:[^"]*\s)?reading-switch(?:\s[^"]*)?"/g;
const switcherIndices = () =>
  [...navigationSource.matchAll(SWITCH_TOKEN)].map((match) => match.index!);

/** The `<nav id="desktop-catalog">…</nav>` slice of the component source. */
const railSource = /<nav id="desktop-catalog"[\s\S]*?<\/nav>/.exec(
  navigationSource,
)![0];
/** …and the `<dialog class="mobile-drawer">…</dialog>` slice. */
const drawerSource = /<dialog\s+class="mobile-drawer"[\s\S]*?<\/dialog>/.exec(
  navigationSource,
)![0];

describe('the catalog rail in reading mode', () => {
  it('the nav renders a docs/blog switcher', () => {
    const switchStart = switcherIndices()[0] ?? -1;
    expect(switchStart).toBeGreaterThan(-1);
    const switchBlock = navigationSource.slice(switchStart, switchStart + 600);
    expect(switchBlock).toContain('>Docs<');
    expect(switchBlock).toContain('>Blog<');
  });

  it('the reading nav sits before the rail toggle', () => {
    // The collapsed rail hides `.desktop-catalog > :not(.rail-toggle)`, so the
    // reading nav must be a sibling *before* the single bottom-right toggle —
    // never wrapping it, which would make the rail impossible to reopen from a
    // docs page.
    const toggles = [
      ...navigationSource.matchAll(
        /class="(?:[^"]*\s)?rail-toggle(?:\s[^"]*)?"/g,
      ),
    ].map((match) => match.index!);
    expect(toggles).toHaveLength(1);
    const switcher = switcherIndices()[0]!;
    expect(switcher).toBeLessThan(toggles[0]!);
  });

  it('reading mode hides the archetype list', () => {
    const catalogBranch = railSource.indexOf("{#if mode === 'catalog'}");
    const elseBranch = railSource.indexOf('{:else}', catalogBranch);
    const archetypes = railSource.indexOf('{#each archetypes');
    const switcher = railSource.search(
      /class="(?:[^"]*\s)?reading-switch(?:\s[^"]*)?"/,
    );

    expect(catalogBranch).toBeGreaterThan(-1);
    expect(elseBranch).toBeGreaterThan(catalogBranch);
    // The archetype list lives in the catalog branch, the switcher after it.
    expect(archetypes).toBeGreaterThan(catalogBranch);
    expect(archetypes).toBeLessThan(elseBranch);
    expect(switcher).toBeGreaterThan(elseBranch);
  });

  it('the switcher survives a modifier class in either position', () => {
    // The mirror of the `check-chrome.mjs` gate: `class="nav-block
    // reading-switch"` and `class="reading-switch reading-switch--wide"` must
    // both still be found, and `reading-switcheroo` must not.
    const token = /class="(?:[^"]*\s)?reading-switch(?:\s[^"]*)?"/;
    expect(token.test('<div class="nav-block reading-switch">')).toBe(true);
    expect(
      token.test('<div class="reading-switch reading-switch--wide">'),
    ).toBe(true);
    expect(token.test('<div class="reading-switcheroo">')).toBe(false);
  });
});

describe('the mobile drawer in reading mode', () => {
  it('the drawer carries the reading nav, not only the catalog', () => {
    // Below 64rem `.desktop-catalog` is `display: none`, so the drawer is the
    // only navigation a phone has. It shipped catalog-only for a whole pass,
    // which left `/docs/rules/zones/` with no route to any other doc.
    expect(drawerSource).toMatch(
      /class="(?:[^"]*\s)?reading-switch(?:\s[^"]*)?"/,
    );
    expect(drawerSource).toContain('{#each readingGroups as group');
    expect(drawerSource).toContain('{#each group.items as item');
  });

  it('the drawer still carries the catalog in catalog mode', () => {
    expect(drawerSource).toContain("{#if mode === 'catalog'}");
    expect(drawerSource).toContain('{#each archetypes as section');
    expect(drawerSource).toContain('{#each nonArchetype as section');
  });

  it('the drawer names itself after the mode it is in', () => {
    expect(navigationSource).toContain(
      "drawerLabel = mode === 'reading' ? 'Docs & blog' : 'Catalog'",
    );
    expect(drawerSource).toContain('<h2 id="catalog-title">{drawerLabel}</h2>');
  });
});

describe('the reading switcher marks a section, not a page', () => {
  it("uses aria-current='true' so a nested page has one current page", () => {
    // On `/docs/rules/zones/` the group list already marks the current page;
    // a second `aria-current="page"` on the switcher announced two.
    expect(navigationSource).not.toMatch(
      /readingKind === '(?:docs|blog)' \? 'page'/,
    );
    expect(navigationSource).toMatch(/readingKind === 'docs' \? 'true'/);
    expect(navigationSource).toMatch(/readingKind === 'blog' \? 'true'/);
  });

  it('the stylesheet follows the attribute it now emits', () => {
    const css = readFileSync(
      new URL('../../src/styles/global.css', import.meta.url),
      'utf-8',
    );
    expect(css).toContain(".reading-switch a[aria-current='true']");
    expect(css).not.toContain(".reading-switch a[aria-current='page']");
  });
});

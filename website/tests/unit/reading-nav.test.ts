import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { catalog, formatDateNumeric } from '../../src/lib/catalog';
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

const blogSource: ReadingNavSource = {
  docs: [],
  posts: [
    post('latest', '2026-03-03', 'Latest post'),
    post('second', '2026-02-02', 'Second post'),
    post('first', '2026-01-01', 'First post'),
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

  it('builds one newest-first blog group', () => {
    const groups = readingNavGroups('blog', blogSource);

    expect(groups.map((group) => group.key)).toEqual(['posts']);
    expect(groups.map((group) => group.label)).toEqual(['']);
    expect(groups[0]?.items).toEqual([
      {
        route: '/blog/latest/',
        title: 'Latest post',
        meta: formatDateNumeric('2026-03-03'),
      },
      {
        route: '/blog/second/',
        title: 'Second post',
        meta: formatDateNumeric('2026-02-02'),
      },
      {
        route: '/blog/first/',
        title: 'First post',
        meta: formatDateNumeric('2026-01-01'),
      },
    ]);
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

/** The `<nav id="desktop-catalog">…</nav>` slice of the component source. */
const railSource = /<nav id="desktop-catalog"[\s\S]*?<\/nav>/.exec(
  navigationSource,
)![0];
/** …and the `<dialog class="mobile-drawer">…</dialog>` slice. */
const drawerSource = /<dialog\s+class="mobile-drawer"[\s\S]*?<\/dialog>/.exec(
  navigationSource,
)![0];

describe('the catalog rail in reading mode', () => {
  it('the nav removes the redundant docs/blog switcher', () => {
    expect(navigationSource).not.toContain('reading-switch');
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
    const readingGroups = navigationSource.indexOf(
      '{#each readingGroups as group',
    );
    expect(readingGroups).toBeGreaterThan(-1);
    expect(readingGroups).toBeLessThan(toggles[0]!);
  });

  it('reading mode hides the archetype list', () => {
    const catalogBranch = railSource.indexOf("{#if mode === 'catalog'}");
    const elseBranch = railSource.indexOf('{:else}', catalogBranch);
    // T3 flattened the catalog branch to one `{#each sections as section}`
    // list — this is that list's marker, in place of the old `archetypes`
    // filter's.
    const sectionsList = railSource.indexOf('{#each sections as section');
    const readingGroups = railSource.indexOf(
      '{#each readingGroups as group',
      elseBranch,
    );

    expect(catalogBranch).toBeGreaterThan(-1);
    expect(elseBranch).toBeGreaterThan(catalogBranch);
    expect(sectionsList).toBeGreaterThan(catalogBranch);
    expect(sectionsList).toBeLessThan(elseBranch);
    expect(readingGroups).toBeGreaterThan(elseBranch);
  });
});

describe('the mobile drawer in reading mode', () => {
  it('the drawer carries the reading nav, not only the catalog', () => {
    // Below 64rem `.desktop-catalog` is `display: none`, so the drawer is the
    // only navigation a phone has. It shipped catalog-only for a whole pass,
    // which left `/docs/rules/zones/` with no route to any other doc.
    expect(drawerSource).not.toContain('reading-switch');
    expect(drawerSource).toContain('{#each readingGroups as group');
    expect(drawerSource).toContain('{#each group.items as item');
  });

  it('the drawer still carries the catalog in catalog mode', () => {
    expect(drawerSource).toContain("{#if mode === 'catalog'}");
    // T3 flattened the drawer's catalog branch to one
    // `{#each sections as section}` list, in place of the old
    // `archetypes`/`nonArchetype` split.
    expect(drawerSource).toContain('{#each sections as section');
  });

  it('the drawer names itself after the mode it is in', () => {
    expect(navigationSource).toContain(
      "drawerLabel = mode === 'reading' ? 'Docs & blog' : 'Catalog'",
    );
    expect(drawerSource).toContain('<h2 id="catalog-title">{drawerLabel}</h2>');
  });
});

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

describe('the catalog rail in reading mode', () => {
  it('the nav renders a docs/blog switcher', () => {
    expect(navigationSource).toContain('class="reading-switch"');
    const switchStart = navigationSource.indexOf('class="reading-switch"');
    const switchBlock = navigationSource.slice(switchStart, switchStart + 600);
    expect(switchBlock).toContain('>Docs<');
    expect(switchBlock).toContain('>Blog<');
  });

  it('the reading nav sits between the two rail toggles', () => {
    // The collapsed rail hides `.desktop-catalog > :not(.rail-toggle)`, so the
    // reading nav must be a sibling *between* the toggles — never wrapping one,
    // which would make the rail impossible to reopen from a docs page.
    const toggles = [...navigationSource.matchAll(/class="rail-toggle/g)].map(
      (match) => match.index,
    );
    expect(toggles).toHaveLength(2);
    const switcher = navigationSource.indexOf('class="reading-switch"');
    expect(switcher).toBeGreaterThan(toggles[0]!);
    expect(switcher).toBeLessThan(toggles[1]!);
  });

  it('reading mode hides the archetype list', () => {
    const catalogBranch = navigationSource.indexOf("{#if mode === 'catalog'}");
    const elseBranch = navigationSource.indexOf('{:else}', catalogBranch);
    const archetypes = navigationSource.indexOf('{#each archetypes');
    const switcher = navigationSource.indexOf('class="reading-switch"');

    expect(catalogBranch).toBeGreaterThan(-1);
    expect(elseBranch).toBeGreaterThan(catalogBranch);
    // The archetype list lives in the catalog branch, the switcher after it.
    expect(archetypes).toBeGreaterThan(catalogBranch);
    expect(archetypes).toBeLessThan(elseBranch);
    expect(switcher).toBeGreaterThan(elseBranch);
  });
});

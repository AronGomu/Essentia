# T10: Reading nav in the rail

**Plan:** `./ai-artifacts/PLAN_2026_08_08_website-feedback-pass-2.md`
**Depends:** T8, T9
**Commit outcome:** On `/docs/…` and `/blog/…` the left catalog rail shows a Docs / Blog switcher plus that section's article list; the in-page `reading-rail` is deleted and the article body takes the freed width.

## Context (self-contained)

- Goal: website feedback pass 2. This ticket delivers feedback item
  **"Docs & Blog 1"**: "On entering Docs & Blog pages, migrate the
  `reading-rail docs-rail` content to the nav. Remove the archetype redirections and
  put a menu to select docs / blog instead. Delete the current
  `reading-rail docs-rail` section. Keep the current nav style for the migration.
  Extend `reading-body docs-body` to take the new free space."
- This slice: the left rail becomes context-sensitive — catalog on every other page,
  reading navigation on docs/blog pages.
- Out of scope here: the toggle buttons (done in T8), the brand (done in T7),
  keyword rulings, MSE card data, hero art, section intros, back-to-top (T11).
- Assumptions in force: `graphify` is not installed — do not run it. The switcher is
  two links, `Docs` → `{base}docs/` and `Blog` → `{base}blog/`, rendered with the
  existing `.nav-group` / `.nav-label` look so no new visual language appears.

## Requirements

- `website/src/components/Navigation.svelte` gains three props:
  `mode: 'catalog' | 'reading'` (default `'catalog'`),
  `readingKind: 'docs' | 'blog' | null` (default `null`), and
  `readingGroups: Array<{ key: string; label: string; items: Array<{ route: string; title: string; meta?: string }> }>`
  (default `[]`).
- In `mode === 'catalog'` the nav renders exactly what it renders today
  (Non-Archetype group + Archetypes list) between the two rail toggles.
- In `mode === 'reading'` the nav renders, between the two rail toggles:
  1. `<div class="reading-switch">` holding two links, `Docs` and `Blog`, the active
     one carrying `aria-current="page"`;
  2. one `<p class="nav-label">{group.label}</p>` + `<ul>` per entry of
     `readingGroups`, each `<li><a href aria-current={…}>{title}<small>{meta}</small></a></li>`.
  The catalog sections (Non-Archetype, Archetypes) are **not** rendered.
- `website/src/layouts/BaseLayout.astro` computes mode and groups and passes them to
  `<Navigation … />`.
- `website/src/components/DocsRail.astro` and `website/src/components/BlogRail.astro`
  are **deleted**, along with every import and usage in the four reading pages.
- `.reading-shell` becomes a two-column grid `minmax(0, 1fr) var(--reading-toc)` and
  `.reading-shell--no-toc` becomes a single column; every `.reading-rail` rule and
  the `--reading-rail` token are deleted.
- `website/scripts/check-chrome.mjs` stops requiring `class="reading-rail` on reading
  pages and instead requires `class="reading-switch"`.
- The mobile drawer (`.mobile-drawer`) keeps showing the catalog on every page — it
  is the small-screen catalog and is out of scope.

## Inputs

- `website/src/components/Navigation.svelte` (after T7 and T8): exports
  `sections: NavSection[]`, `currentPath: string`, `base: string`; holds
  `nonArchetypeOpen`, `railState`, `toggleRail()`, `href(route)`,
  `current(route)` (returns `'page' | 'location' | undefined`), the two
  `.rail-toggle` buttons as first and last children of
  `<nav id="desktop-catalog" class="desktop-catalog" aria-label="Catalog">`, and the
  `<dialog class="mobile-drawer">`.
- `website/src/layouts/BaseLayout.astro`:
  - line 28 `const base = import.meta.env.BASE_URL;`
  - lines 29–37 build `navSections`
  - lines 38–40:
    ```ts
    const section = ['docs/', 'blog/', 'decks/'].find((path) =>
      Astro.url.pathname.startsWith(`${base}${path}`),
    );
    ```
    — reuse this to derive the mode.
  - lines 132–137 render `<Navigation client:load sections={navSections} currentPath={Astro.url.pathname} {base} />`.
- `website/src/lib/docs.ts` — `docsRailGroups(docs): DocsRailGroup[]`, shape
  `{ key, label, docs: Array<{ route, title }> }`, preserves catalog order and drops
  empty groups. Keep this function; map its output into the new `readingGroups` shape.
- `website/src/lib/blog-rail.ts` — `blogRailItems(posts, currentRoute)` returns every
  post newest-first with a `current` flag. After T9, `catalog.postGroups` gives the
  authored grouping; build the blog `readingGroups` from `postGroups` + `catalog.posts`,
  and keep `blogRailItems` only if `website/tests/unit/blog-rail.test.ts` still covers
  it — otherwise delete both the module and its test.
- `website/src/components/DocsRail.astro` — renders
  `<nav class="reading-rail docs-rail" aria-label="Documentation">` with
  `<p class="nav-label">` + `<ul>` per group. This markup is the template for the
  reading branch of `Navigation.svelte`.
- `website/src/components/BlogRail.astro` — renders
  `<nav class="reading-rail blog-rail" aria-label="Blog">` with an `All posts` link
  and one `<li>` per post carrying `<small>{formatDate(item.date)}</small>`.
- Reading pages, all four:
  `website/src/pages/docs/index.astro` (`<DocsRail groups={groups} currentRoute={doc.route} {base} />` inside `<div class="reading-shell">`),
  `website/src/pages/docs/[...path].astro` (same),
  `website/src/pages/blog/index.astro` (`<BlogRail posts={posts} currentRoute={null} {base} />` inside `<div class="reading-shell reading-shell--no-toc">`),
  `website/src/pages/blog/[slug].astro` (`<BlogRail posts={catalog.posts} currentRoute={post.route} {base} />`, same shell).
- `website/src/styles/global.css`:
  - `--reading-rail: 17rem;` at line 45
  - `.reading-shell` line 1460: `grid-template-columns: var(--reading-rail) minmax(0, 1fr) var(--reading-toc);`
  - `.reading-shell--no-toc` line 1469: `grid-template-columns: var(--reading-rail) minmax(0, 1fr);`
  - `.reading-rail` rules lines 1472–1510
  - `@media (max-width: 64rem)` lines 1591–1599 collapsing the shell and ordering
    `.reading-rail` first
- `website/scripts/check-chrome.mjs` lines ~90–99:
  ```js
  if (/^(docs|blog)\//.test(file) || file === 'docs/index.html' || file === 'blog/index.html') {
    if (!html.includes('class="reading-rail')) problems.push(`${file}: reading page is missing its rail`);
    if (!html.includes('class="reading-shell')) problems.push(`${file}: reading page is missing the reading shell`);
  }
  ```
- `website/tests/unit/reading-shell.test.ts` — asserts every reading page contains
  `class="reading-shell`, that `.reading-shell` is inset (`margin-inline: auto`,
  `width: min(100% - 2rem, 88rem)`), that `.reading-rail` uses the reading tokens
  (**this row must be deleted**), and that only `.reading-body*` selectors carry
  `max-width: var(--reading-measure)`.
- `website/tests/unit/reading-tokens.test.ts` — `TOKENS` array contains
  `'--reading-rail'`; remove that entry.
- `website/tests/unit/chrome.test.ts` — line ~724 fixture
  `<nav class="reading-rail blog-rail"></nav>`; update to the new marker.
- **From Depends (T8):** the nav is a flex column whose first and last children are
  `.rail-toggle--top` / `.rail-toggle--bottom`; collapsed `--sidebar` is `3.25rem`
  and `html[data-catalog='collapsed'] .desktop-catalog > :not(.rail-toggle)` is
  `display: none` — which automatically hides the reading nav too.
- **From Depends (T9):** `catalog.postGroups` exists —
  `Array<{ key: string; label: string; slugs: readonly string[] }>` — and
  `loadDocs(groups)` takes the reading-order groups.

## TDD

1. **Red** — add `website/tests/unit/reading-nav.test.ts` and the e2e test below,
   and update `reading-shell.test.ts` / `reading-tokens.test.ts` / `chrome.test.ts`;
   they fail.
2. **Green** — add the reading branch to `Navigation.svelte`, wire `BaseLayout`,
   strip the four pages, rewrite the CSS and the chrome gate.
3. **Refactor** — delete `DocsRail.astro`, `BlogRail.astro`, the `.reading-rail`
   rules and the `--reading-rail` token; keep green.

## Test plan

Unit: `cd website && npm run test`. E2E: `cd website && npm run test:e2e`.

| Test | Input | Expect |
| ---- | ----- | ------ |
| `reading-nav.test.ts` › `builds docs groups for the nav` | `readingNavGroups('docs', catalog)` (new export in `src/lib/reading-nav.ts`) | same keys and order as `docsRailGroups(catalog.docs)` |
| `reading-nav.test.ts` › `builds blog groups from postGroups` | `readingNavGroups('blog', catalog)` | one group per non-empty `catalog.postGroups` entry, each item carrying the post title and a formatted date `meta` |
| `reading-nav.test.ts` › `returns nothing outside reading pages` | `readingNavGroups(null, catalog)` | `[]` |
| `reading-nav.test.ts` › `derives the mode from the path` | `readingKindFor('/docs/rules/zones/', '/')` / `('/blog/', '/')` / `('/cards/x/', '/')` | `'docs'` / `'blog'` / `null` |
| `reading-nav.test.ts` › `the nav renders a docs/blog switcher` | source of `src/components/Navigation.svelte` | contains `class="reading-switch"` and both `Docs` and `Blog` labels |
| `reading-nav.test.ts` › `reading mode hides the archetype list` | source of `src/components/Navigation.svelte` | the archetypes `{#each archetypes …}` block sits inside a `{#if mode === 'catalog'}` branch |
| `reading-shell.test.ts` › `the shell has no rail column` | `.reading-shell {` block | matches `/grid-template-columns:\s*minmax\(0, 1fr\) var\(--reading-toc\)/` |
| `reading-shell.test.ts` › `the rail styles are gone` | `global.css` | does not match `/\.reading-rail\b/` |
| `reading-shell.test.ts` › `no page imports a rail component` | the four reading page sources | none contains `DocsRail` or `BlogRail` |
| `reading-tokens.test.ts` | `TOKENS` without `--reading-rail` | still green; `global.css` contains no `--reading-rail` |
| `chrome.test.ts` › `flags a reading page without the switcher` | docs page HTML with no `class="reading-switch"` | problem `docs/index.html: reading page is missing the docs/blog switcher` |
| `showcase.spec.ts` › new `docs pages navigate from the catalog rail` | `/docs/` | the left nav exposes links named `Docs` and `Blog`; clicking a doc title in the nav lands on that doc; no element matches `.reading-rail`; axe violations `[]` |

## Impl steps

- [x] 1. Create `website/src/lib/reading-nav.ts` exporting:
      ```ts
      export type ReadingKind = 'docs' | 'blog';
      export interface ReadingNavItem { route: string; title: string; meta?: string }
      export interface ReadingNavGroup { key: string; label: string; items: ReadingNavItem[] }
      export function readingKindFor(pathname: string, base: string): ReadingKind | null
      export function readingNavGroups(kind: ReadingKind | null, catalog: Catalog): ReadingNavGroup[]
      ```
      `readingKindFor` returns `'docs'` when `pathname.startsWith(`${base}docs/`)`,
      `'blog'` for `${base}blog/`, else `null`.
      `readingNavGroups('docs', …)` maps `docsRailGroups(catalog.docs)` into the new
      shape (`items = group.docs`). `readingNavGroups('blog', …)` maps
      `catalog.postGroups` through a `Map<slug, post>` built from `catalog.posts`,
      setting `meta: formatDate(post.date)`.
- [x] 2. In `Navigation.svelte`, add the three props with their defaults and wrap the
      existing catalog markup (the `nav-group` button, the non-archetype `<ul>`, the
      `Archetypes` `<p class="nav-label">` and its `<ul>`) in `{#if mode === 'catalog'}`.
- [x] 3. Add the `{:else}` branch:
      ```svelte
      <div class="reading-switch">
        <a href={href('/docs/')} aria-current={readingKind === 'docs' ? 'page' : undefined}>Docs</a>
        <a href={href('/blog/')} aria-current={readingKind === 'blog' ? 'page' : undefined}>Blog</a>
      </div>
      {#each readingGroups as group (group.key)}
        <p class="nav-label">{group.label}</p>
        <ul>
          {#each group.items as item (item.route)}
            <li>
              <a href={href(item.route)} aria-current={current(item.route)}>
                {item.title}{#if item.meta}<small>{item.meta}</small>{/if}
              </a>
            </li>
          {/each}
        </ul>
      {/each}
      ```
- [x] 4. Change `<nav id="desktop-catalog" … aria-label="Catalog">` to
      `aria-label={mode === 'reading' ? 'Documentation and blog' : 'Catalog'}`.
- [x] 5. In `BaseLayout.astro`, import `readingKindFor` and `readingNavGroups`, then:
      ```ts
      const readingKind = readingKindFor(Astro.url.pathname, base);
      const readingGroups = readingNavGroups(readingKind, catalog);
      ```
      and pass `mode={readingKind ? 'reading' : 'catalog'}` plus `{readingKind}` and
      `{readingGroups}` to `<Navigation … />`.
- [x] 6. Delete `website/src/components/DocsRail.astro` and
      `website/src/components/BlogRail.astro`.
- [x] 7. In each of the four reading pages, remove the rail import, the rail element,
      and any now-unused local (`const groups = docsRailGroups(catalog.docs);` in the
      two docs pages; `const posts = catalog.posts;` in `blog/index.astro` is still
      used by the list — keep that one).
- [x] 8. `website/src/pages/docs/index.astro` and `docs/[...path].astro` keep
      `<div class="reading-shell">` with `<article class="reading-body docs-body">`
      and `<ChapterSummary …>`. `blog/index.astro` and `blog/[slug].astro` keep
      `<div class="reading-shell reading-shell--no-toc">`.
- [x] 9. In `global.css`: delete the `--reading-rail: 17rem;` token; set
      `.reading-shell { grid-template-columns: minmax(0, 1fr) var(--reading-toc); }`
      and `.reading-shell--no-toc { grid-template-columns: minmax(0, 1fr); }`; delete
      every `.reading-rail…` rule (lines ~1472–1510) and the `.reading-rail` rule
      inside the `@media (max-width: 64rem)` block.
- [x] 10. Add the switcher styles next to `.nav-label`:
      ```css
      .reading-switch {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 0.25rem;
        margin-bottom: 1rem;
      }
      .reading-switch a {
        border: 1px solid var(--ruleline);
        border-radius: var(--radius-sm);
        color: var(--silver-ink);
        font-weight: 700;
        padding: 0.5rem 0.6rem;
        text-align: center;
        text-decoration: none;
      }
      .reading-switch a:hover,
      .reading-switch a[aria-current='page'] {
        border-color: var(--accent);
        background: var(--sleeve);
        color: var(--cardstock);
      }
      ```
- [x] 11. In `website/scripts/check-chrome.mjs`, replace the
      `class="reading-rail` check with:
      ```js
      if (!html.includes('class="reading-switch"'))
        problems.push(`${file}: reading page is missing the docs/blog switcher`);
      ```
      keeping the `class="reading-shell` check as is.
- [x] 12. Update `website/tests/unit/reading-shell.test.ts` (drop the rail-token row,
      add the two new rows), `website/tests/unit/reading-tokens.test.ts` (drop
      `--reading-rail`), `website/tests/unit/chrome.test.ts` (swap the fixture marker
      and the expected message).
- [x] 13. If `blogRailItems` is now unused, delete `website/src/lib/blog-rail.ts` and
      `website/tests/unit/blog-rail.test.ts`; otherwise leave both untouched.
- [x] 14. Add `website/tests/unit/reading-nav.test.ts` with the rows from the test plan.
- [x] 15. Add the new e2e test to `website/tests/e2e/showcase.spec.ts`.
- [x] 16. `cd website && npm run format && npm run test` → exit 0.
- [x] 17. `cd website && npm run build` → exit 0.
- [ ] 18. `cd website && npm run test:e2e` → exit 0.
      _Unearned: Playwright is unrunnable on this host — every browser aborts at
      launch with `libglib-2.0.so.0` missing. The two new specs are
      unverified-by-execution._
- [x] 19. `grep -rn 'reading-rail' website/src website/scripts website/dist | wc -l` → `0`.

## Outputs

- Files touched: new `website/src/lib/reading-nav.ts`,
  new `website/tests/unit/reading-nav.test.ts`;
  edited `website/src/components/Navigation.svelte`,
  `website/src/layouts/BaseLayout.astro`, the four reading pages,
  `website/src/styles/global.css`, `website/scripts/check-chrome.mjs`,
  `website/tests/unit/{reading-shell,reading-tokens,chrome}.test.ts`,
  `website/tests/e2e/showcase.spec.ts`;
  deleted `website/src/components/DocsRail.astro`,
  `website/src/components/BlogRail.astro`, and possibly
  `website/src/lib/blog-rail.ts` + its test.
- Public API / behaviour change: `Navigation` takes `mode`, `readingKind`,
  `readingGroups`; docs/blog navigation lives in the left rail.
- Migrate / config: none beyond `reading-order.json` from T9.

## Validation

- [ ] tests pass: `cd website && npm run ci`; `cd website && npm run test:e2e`
      _Half-earned, so unchecked: `npm run ci` exits 0 in a clean worktree at
      HEAD (`Test Files 51 passed`, `Tests 514 passed`, `151 page(s) built`,
      `dist scan: clean`). `npm run test:e2e` cannot run on this host (see 18)._

No browser is available here, so the four manual checks below were verified
mechanically against the built `dist/` HTML and the compiled `dist/_astro/*.css`
rather than by eye. Each line records the proof used.

- [x] manual check: `/docs/` — the left rail shows `Docs | Blog` and the six doc
      groups; no in-page rail; the article body is wider than before
      — `dist/docs/rules/zones/index.html`: `<nav id="desktop-catalog" …
      aria-label="Documentation and blog">` holds `<div class="reading-switch">`
      with `Docs` (`aria-current="page"`) and `Blog`, then six `<p
      class="nav-label">` groups; `class="reading-shell"><article
      class="reading-body docs-body">` is the shell's first child; compiled CSS
      has `.reading-shell{…grid-template-columns:minmax(0, 1fr)
      var(--reading-toc)…}` — one column fewer, so the body takes the width.
- [x] manual check: `/blog/` and a post page — the left rail shows the blog list with
      dates and the current post marked
      — `dist/blog/index.html` rail: `Blog` carries `aria-current="page"`, group
      `All posts`, item `<small>August 1, 2026</small>`;
      `dist/blog/legend-of-alpha-project-introduction/index.html` marks that
      post's own link `aria-current="page"`.
- [x] manual check: `/cards/ash-blossom-and-joyous-spring/` — the left rail still
      shows the catalog (Non-Archetype + Archetypes)
      — that page's nav is `aria-label="Catalog"` and still opens with
      `<button class="nav-group" …>Non-Archetype`. Across all 151 built pages,
      the 40 `docs/`+`blog/` pages carry `class="reading-switch"` and the other
      111 carry none.
- [x] manual check: collapsing the rail on `/docs/` hides the reading nav and leaves
      the two toggles
      — compiled CSS carries `html[data-catalog=collapsed]{--sidebar:3.25rem}`
      and `html[data-catalog=collapsed] .desktop-catalog>:not(.rail-toggle)
      {display:none}`; in the built docs page the nav's first child is
      `class="rail-toggle rail-toggle--top"`, its last is
      `rail-toggle--bottom`, and `.reading-switch` is a direct child between
      them — so collapse hides the reading nav and nothing else, and
      `display: none` takes the hidden links out of the tab order rather than
      trapping focus. `reading-nav.test.ts › the reading nav sits between the
      two rail toggles` pins that ordering.
- [x] app functional — `cd website && npm run build` exits 0
      — via `npm run ci` in the worktree: `151 page(s) built`, `dist scan:
      clean`, `chrome: 151 pages carry the site header`.
- [x] commit msg draft: `feat(website): move docs and blog navigation into the catalog rail`

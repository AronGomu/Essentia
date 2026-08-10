# T9: Docs + Blog reading surface

**Plan:** `./ai-artifacts/PLAN_2026_08_07_website-feedback-pass-2.md`
**Depends:** T1, T8
**Commit outcome:** Docs and blog share one inset, styled reading layout — left rail, measured prose panel, right chapter summary — and the blog finally has a side panel.

## Context (self-contained)

- Goal: ship feedback batch 2 on the Astro site under `website/`.
- This slice: the feedback lines *"Blog Section side panel is lacking. Missing margin left.
  Missing style. Revamp it."* and *"Define style for docs section. This is too much dark
  black."* — the build-out of the design frozen in T1.
- Out of scope here: the catalog rail (T5), the search palette (T10), doc content, blog
  content, the docs corpus loader, keyword rulings.
- Assumptions in force: A7 (T1 froze the tokens; this ticket only consumes them).

## What the dependencies produced

**From T1** — 8 CSS custom properties are declared in `:root` inside `@layer tokens` of
`website/src/styles/global.css`, documented in `website/DESIGN.md § Reading Surfaces
(Docs & Blog)`, and guarded by `website/tests/unit/reading-tokens.test.ts` — which
currently asserts `var(--reading-` occurs **0 times**. That assertion must be removed in
this ticket (step 2), because this is the ticket that consumes them:

```
--reading-surface  --reading-surface-raised  --reading-ink  --reading-ink-muted
--reading-rule     --reading-measure         --reading-rail --reading-toc
```

**From T8** — blog articles live at `blog/YYYY-MM-DD-slug.md`; `catalog.posts` entries are
`{ slug, route: '/blog/<slug>/', title, date, author, summary, tags: string[], body }`,
sorted newest first; `npm run content` regenerates them.

## Current implementation

- `website/src/pages/docs/index.astro` and `website/src/pages/docs/[...path].astro` render
  `<div class="docs-shell"><DocsRail …/><article class="docs-body">…</article><ChapterSummary …/></div>`
  as a **direct child of `<main>`** — there is no `.page-shell` wrapper, which is exactly the
  "missing margin left" in the feedback. Every other page wraps its content in
  `.page-shell` (`width: min(100% - 2rem, 88rem); margin-inline: auto; padding-block: var(--space-6);`,
  line 264).
- `.docs-shell` (line 1378) is only `display: grid; grid-template-columns: 16rem minmax(0,1fr) 14rem; gap: var(--space-5);`.
- `.docs-rail ul` (line 1383) only resets list styling — the rail has no panel, no
  hover/current styling, no sticky behaviour.
- `website/src/components/DocsRail.astro` emits `<nav class="docs-rail">` with one
  `<div><p class="nav-label">…</p><ul><li><a aria-current="page|undefined">…</a></li></ul></div>` per group.
- `website/src/components/ChapterSummary.astro` emits `.chapter-summary` + `.page-toc`
  (styled, sticky, line 1405-1437).
- `website/src/pages/blog/index.astro` renders `<div class="page-shell"><h1>Blog</h1><ul class="post-list">…</ul></div>` — **no rail at all**.
- `website/src/pages/blog/[slug].astro` renders `<article class="page-shell post-body">` — no rail.
- `.post-list` / `.post-meta` / `.post-body` styles live unlayered at lines 1554-1568.

## Requirements

- One shared layout class `reading-shell` replaces `docs-shell`, used by all four pages
  (docs index, docs detail, blog index, blog post). It is inset like every other page:
  `width: min(100% - 2rem, 88rem); margin-inline: auto; padding-block: var(--space-6);`.
- Columns: `var(--reading-rail) minmax(0, 1fr) var(--reading-toc)`. When a page has no
  chapter summary (blog index), the third column collapses via a `reading-shell--no-toc`
  modifier (`grid-template-columns: var(--reading-rail) minmax(0, 1fr)`).
- Both rails (`DocsRail`, new `BlogRail`) share a `.reading-rail` panel style: sticky under
  the header, `background: var(--reading-surface)`, `1px solid var(--reading-rule)` border,
  `var(--radius)` corners, scrollable, `--reading-ink-muted` links, `--reading-ink` +
  accent marker on `aria-current="page"`.
- The prose column gets `.reading-body`: `background: var(--reading-surface)`,
  `border: 1px solid var(--reading-rule)`, `border-radius: var(--radius)`,
  `padding: clamp(1.25rem, 3vw, 2.5rem)`, `color: var(--reading-ink)`,
  `max-width: var(--reading-measure)` on its `p`/`li` descendants,
  `code`/`pre` on `var(--reading-surface-raised)`.
- Blog gains `website/src/components/BlogRail.astro` listing every post newest-first, each
  with its formatted date, plus an "All posts" link to `/blog/`, marking the current route
  with `aria-current="page"`.
- Below `64rem` the shell becomes a single column and both rails become static (not sticky),
  ordered above the prose — matching the existing `@media (max-width: 64rem)` behaviour of
  `.chapter-summary` (`position: static; order: -1;`).
- `.docs-shell`, `.docs-rail` and `.docs-body` class names disappear from source.

## Inputs

- `website/src/pages/docs/index.astro`, `website/src/pages/docs/[...path].astro`,
  `website/src/pages/blog/index.astro`, `website/src/pages/blog/[slug].astro`.
- `website/src/components/DocsRail.astro`, `website/src/components/ChapterSummary.astro`.
- `website/src/lib/docs.ts` — `docsRailGroups(docs)` → `DocsRailGroup[]`; keep as is.
- `website/src/lib/catalog.ts` — `catalog.posts`, `formatDate(value)`, `withBase(base, route)`.
- `website/src/styles/global.css` lines 1378-1451 (docs block) and 1554-1568 (post block).
- `website/scripts/check-chrome.mjs`, `website/scripts/check-budgets.mjs`.
- **From Depends:** listed above.

## New component contract

`website/src/components/BlogRail.astro`:

```astro
---
interface Props {
  posts: Array<{ slug: string; route: string; title: string; date: string }>;
  currentRoute: string | null;
  base: string;
}
---
<nav class="reading-rail blog-rail" aria-label="Blog">
  <p class="nav-label">Blog</p>
  <ul>
    <li><a href={withBase(base, '/blog/')} aria-current={currentRoute === null ? 'page' : undefined}>All posts</a></li>
    {posts.map((post) => (
      <li>
        <a href={withBase(base, post.route)} aria-current={post.route === currentRoute ? 'page' : undefined}>
          {post.title}<small>{formatDate(post.date)}</small>
        </a>
      </li>
    ))}
  </ul>
</nav>
```

`DocsRail.astro` keeps its props but its root becomes `<nav class="reading-rail docs-rail" aria-label="Documentation">`.

## Check plan

| Test                                                | Input                                                                 | Expect                                            |
| ---------------------------------------------------- | --------------------------------------------------------------------- | -------------------------------------------------- |
| `builds the rail with every post newest first`      | `blogRailItems(catalog.posts)`                                        | array ordered by `date` desc, each `{slug,route,title,date}` |
| `marks the current post`                            | `blogRailItems(posts)` + `'/blog/b/'`                                 | only that entry gets `current: true`               |
| `marks the index when the route is null`            | `blogRailItems(posts)` + `null`                                       | no entry current                                    |
| `docs and blog use the same shell class`            | `src/pages/docs/index.astro`, `docs/[...path].astro`, `blog/index.astro`, `blog/[slug].astro` | each source contains `class="reading-shell` |
| `no page keeps the unstyled docs shell`             | all four sources                                                       | `docs-shell` occurs 0 times                        |
| `the shell is inset like every other page`          | `src/styles/global.css`                                                | `.reading-shell` declares `margin-inline: auto` and `width: min(100% - 2rem, 88rem)` |
| `the rail uses the reading tokens`                  | `src/styles/global.css`                                                | `.reading-rail` block references `var(--reading-surface)` and `var(--reading-rule)` |
| `the prose column caps its measure`                 | `src/styles/global.css`                                                | `.reading-body` block references `var(--reading-measure)` |
| `every blog page ships a rail`                      | `chromeIssues('blog/index.html', html, '/')`                          | flags html without `class="reading-rail`           |

Rows 1-3 are pure-function tests over a new helper; rows 4-8 are source assertions;
row 9 extends the build gate.

## TDD

1. **Red** — add `website/tests/unit/blog-rail.test.ts` (rows 1-3, against a new
   `src/lib/blog-rail.ts`), `website/tests/unit/reading-shell.test.ts` (rows 4-8, reading
   the four page sources and `global.css`), and row 9 in `website/tests/unit/chrome.test.ts`.
   Run `cd website && npx vitest run tests/unit/blog-rail.test.ts tests/unit/reading-shell.test.ts tests/unit/chrome.test.ts` — red.
2. **Green** — implement the helper, the component, the pages, the CSS, the gate.
3. **Refactor** — delete the dead `.docs-shell` / `.docs-rail` / `.docs-body` rules.

## Impl steps

- [x] 1. Create `website/src/lib/blog-rail.ts`:
      ```ts
      export interface BlogRailItem { slug: string; route: string; title: string; date: string; current: boolean }
      export function blogRailItems(
        posts: ReadonlyArray<{ slug: string; route: string; title: string; date: string }>,
        currentRoute: string | null,
      ): BlogRailItem[];
      ```
      Sort by `date` desc then `slug` asc; `current` is `post.route === currentRoute`.
- [x] 2. In `website/tests/unit/reading-tokens.test.ts` (from T1), delete the
      `does not consume the tokens yet` case and replace it with
      `consumes every reading token` — assert each of the 8 names appears at least once as
      `var(--name)` in `src/styles/global.css`.
- [x] 3. Write `website/tests/unit/blog-rail.test.ts`, `website/tests/unit/reading-shell.test.ts`,
      and the `chrome.test.ts` row; run all three — red.
- [x] 4. Create `website/src/components/BlogRail.astro` per the contract above, importing
      `{ formatDate, withBase }` from `'../lib/catalog'` and `{ blogRailItems }` from `'../lib/blog-rail'`.
- [x] 5. In `website/src/components/DocsRail.astro`, change the root element to
      `<nav class="reading-rail docs-rail" aria-label="Documentation">`.
- [x] 6. In `website/src/pages/docs/index.astro` and `website/src/pages/docs/[...path].astro`,
      change `<div class="docs-shell">` → `<div class="reading-shell">` and
      `<article class="docs-body">` → `<article class="reading-body docs-body">`.
- [x] 7. Rewrite `website/src/pages/blog/index.astro`'s body as:
      ```astro
      <div class="reading-shell reading-shell--no-toc">
        <BlogRail posts={catalog.posts} currentRoute={null} {base} />
        <article class="reading-body">
          <h1>Blog</h1>
          …existing empty-state / post-list markup unchanged…
        </article>
      </div>
      ```
- [x] 8. Rewrite `website/src/pages/blog/[slug].astro`'s body as:
      ```astro
      <div class="reading-shell reading-shell--no-toc">
        <BlogRail posts={catalog.posts} currentRoute={post.route} {base} />
        <article class="reading-body post-body">
          <h1>{post.title}</h1>
          <p class="post-meta">{formatDate(post.date)} · {post.author}</p>
          <Markdown value={post.body} />
        </article>
      </div>
      ```
- [x] 9. In `website/src/styles/global.css`, replace lines 1378-1386 (`.docs-shell`,
      `.docs-rail ul`) with:
      ```css
      .reading-shell {
        width: min(100% - 2rem, 88rem);
        margin-inline: auto;
        padding-block: var(--space-6);
        display: grid;
        grid-template-columns: var(--reading-rail) minmax(0, 1fr) var(--reading-toc);
        gap: var(--space-5);
        align-items: start;
      }
      .reading-shell--no-toc {
        grid-template-columns: var(--reading-rail) minmax(0, 1fr);
      }
      .reading-rail {
        position: sticky;
        top: calc(var(--header) + 1rem);
        max-height: calc(100vh - var(--header) - 2rem);
        overflow-y: auto;
        border: 1px solid var(--reading-rule);
        border-radius: var(--radius);
        background: var(--reading-surface);
        padding: 1rem 0.85rem;
      }
      .reading-rail ul {
        list-style: none;
        margin: 0 0 1.2rem;
        padding: 0;
      }
      .reading-rail li + li {
        margin-top: 0.15rem;
      }
      .reading-rail a {
        display: grid;
        border-radius: var(--radius-sm);
        color: var(--reading-ink-muted);
        padding: 0.45rem 0.55rem;
        text-decoration: none;
      }
      .reading-rail a small {
        color: var(--reading-ink-muted);
        font-size: 0.72rem;
      }
      .reading-rail a:hover,
      .reading-rail a:focus-visible {
        background: var(--reading-surface-raised);
        color: var(--reading-ink);
      }
      .reading-rail a[aria-current='page'] {
        background: var(--reading-surface-raised);
        color: var(--reading-ink);
        box-shadow: inset 0.18rem 0 0 var(--accent);
      }
      .reading-body {
        min-width: 0;
        border: 1px solid var(--reading-rule);
        border-radius: var(--radius);
        background: var(--reading-surface);
        color: var(--reading-ink);
        padding: clamp(1.25rem, 3vw, 2.5rem);
      }
      .reading-body > p,
      .reading-body li,
      .reading-body blockquote {
        max-width: var(--reading-measure);
      }
      .reading-body pre,
      .reading-body code {
        background: var(--reading-surface-raised);
      }
      ```
- [x] 10. Rename the remaining `.docs-body …` rules (old lines 1387-1404) to
      `.reading-body …` selectors, keeping the `h1 { margin-top: 0 }`, table and `pre`
      declarations; change the table border colour to `var(--reading-rule)`.
- [x] 11. Update the `@media (max-width: 64rem)` block (line 1438) to add:
      ```css
        .reading-shell,
        .reading-shell--no-toc {
          grid-template-columns: 1fr;
        }
        .reading-rail {
          position: static;
          max-height: none;
          order: -1;
        }
      ```
      and delete the `.docs-shell { grid-template-columns: 1fr; }` rule from the
      `@media (max-width: 44rem)` block (line 1021).
- [x] 12. Restyle `.post-list` / `.post-meta` (lines 1554-1568) to use `var(--reading-rule)`
      dividers and `var(--reading-ink-muted)` metadata.
- [x] 13. In `website/scripts/check-chrome.mjs::chromeIssues`, add:
      ```js
      if (/^(docs|blog)\//.test(file) || file === 'docs/index.html' || file === 'blog/index.html') {
        if (!html.includes('class="reading-rail')) problems.push(`${file}: reading page is missing its rail`);
        if (!html.includes('class="reading-shell')) problems.push(`${file}: reading page is missing the reading shell`);
      }
      ```
- [x] 14. Run the three vitest files — green.
- [x] 15. Run `cd website && npm run format && npm run ci`, then `npm run budgets:check`.

## Outputs

- Touched: `website/src/lib/blog-rail.ts` (new),
  `website/src/components/BlogRail.astro` (new), `website/src/components/DocsRail.astro`,
  the four docs/blog pages, `website/src/styles/global.css`,
  `website/scripts/check-chrome.mjs`, `website/tests/unit/reading-tokens.test.ts`,
  `website/tests/unit/blog-rail.test.ts` (new),
  `website/tests/unit/reading-shell.test.ts` (new), `website/tests/unit/chrome.test.ts`.
- Behaviour: `docs-shell`/`docs-rail`/`docs-body` class names are gone; docs and blog share
  `reading-shell` / `reading-rail` / `reading-body`.

## Validation

- [x] `cd website && npm run test` — all pass
- [x] `cd website && npm run ci` — exit 0, new reading gates pass on every docs/blog page
- [x] `cd website && npm run budgets:check` — within limits
- [x] manual: `npm run dev`, `/docs/` — rail is a panel with clear inset from the catalog
      rail; `/docs/rules/zones/` — current page marked; `/blog/` — a rail lists every post;
      `/blog/legend-of-alpha-project-introduction/` — that post is marked current.
      Satisfied via automated equivalent (no dev server, per role guidance): grepped built
      `dist/` HTML in the disposable worktree —
      `dist/docs/index.html` has `class="reading-shell"` / `class="reading-rail docs-rail"` /
      `class="reading-body docs-body"`; `dist/docs/rules/zones/index.html` has
      `aria-current="page">Zones` on the rail link; `dist/blog/index.html` has
      `class="reading-rail blog-rail"` inside `class="reading-shell reading-shell--no-toc"`;
      `dist/blog/legend-of-alpha-project-introduction/index.html` has 2
      `aria-current="page"` hits (nav + rail entry).
- [ ] manual: narrow the window below 1024px — rails move above the prose, nothing overflows.
      No automated equivalent exists (no viewport-driven layout test in this suite) — left
      unchecked per role guidance; source evidence only: `.reading-shell`/`.reading-rail`
      rules are added inside the existing `@media (max-width: 64rem)` block in
      `website/src/styles/global.css` (grid-template-columns: 1fr; position: static; order: -1),
      mirroring the pre-existing `.chapter-summary` behaviour at the same breakpoint.
- [ ] app functional — `npm run test:e2e` passes. CANNOT RUN — confirmed two ways: (a) known
      pre-existing Playwright browser-launch failure (missing `libglib-2.0.so.0`) per parent
      brief; (b) independently reproduced in the main tree: the Playwright webServer's
      `npm run content` prestart hits the shared-tree hazard
      (`cards_mse/01_alpha/LOTA-0001-Alpha_0.1: package hash mismatch`) and refuses to boot.
      Deferred gate, not attributable to this ticket.
- [x] commit msg draft: `feat(website): give docs and blog one styled reading surface`

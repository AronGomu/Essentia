# T7: Blog rail shape and latest-post landing

**Plan:** `./ai-artifacts/PLAN_2026_08_13_feedback_batch_3.md`
**Depends:** T6
**Commit outcome:** `/blog/` renders the latest post instead of a post list, and the rail
shows every post as a full-width title with a numeric date beneath it.

## Context (self-contained)

- Goal: `/blog/` currently renders a list of every post, duplicating the rail that is already
  on screen. In the rail each post renders as `{title}<small>{formatDate(date)}</small>`, so
  a long title competes with "8 August 2026" on one line.
- This slice: the blog surface only — rail item shape, date format, and what `/blog/`
  serves.
- Out of scope here: docs navigation (T5, T6), post content, the RSS feed, the header's
  Blog link.
- Assumptions in force: `DD/MM/YYYY` applies to the **blog rail only**; `formatDate` stays
  as it is on the post page, card pages and updates. `/blog/{slug}/` stays canonical, so the
  landing page must declare the latest post's own URL as its canonical link.

**From Depends (T6) — spell out, do not go looking:**

- `website/src/components/Navigation.svelte` no longer contains a `.reading-switch` block in
  either the desktop rail or the mobile drawer.
- Its reading branch renders the group with `key === ''` as a bare `<ul>` and every other
  group as `<details open={…}><summary>{group.label}</summary><ul>…</ul></details>`, with
  open state persisted under `essentia.v1.docs-group.{key}` via
  `docsGroupStorageKey` and `isGroupOpen` in `website/src/lib/docs.ts`.
- `website/src/lib/reading-nav.ts::readingNavGroups(kind, source)` still returns
  `Array<{ key, label, items: Array<{ route, title, meta? }> }>` and its blog branch still
  maps `source.postGroups` through `formatDate`.
- `website/content/reading-order.json` currently holds only
  `{ "schemaVersion": 1, "blog": [{ "key": "all", "label": "All posts", "slugs": null }] }`.

## Requirements

- The blog rail is one flat list, newest post first, with no group heading.
- Each rail item renders the title on its own line at full rail width, with the date beneath
  it as `DD/MM/YYYY` (`08/08/2026`).
- `/blog/` renders the latest post's title, meta line and body inline — the same content as
  `/blog/{slug}/`.
- `/blog/` declares `<link rel="canonical">` pointing at the latest post's own route.
- `/blog/{slug}/` is unchanged and remains the canonical location of every post.
- With no posts at all, `/blog/` renders "No posts published yet." and does not crash.
- `reading-order.json` and its loader lose the `blog` array; `postGroups` disappears from the
  catalog.

## Inputs

- `website/src/lib/reading-nav.ts` — the blog branch builds items from `source.postGroups`
  and sets `meta: formatDate(post.date)`.
- `website/src/lib/catalog.ts` — `export function formatDate(value: string): string` uses
  `Intl.DateTimeFormat('en', { dateStyle: 'long' })`; `CatalogPost` is
  `{ slug, route, title, date, author, summary, tags, body }`; the catalog carries
  `postGroups: ReadonlyArray<{ key, label, slugs }>`.
- `website/src/pages/blog/index.astro` — 39 lines, renders `catalog.posts` as a `<ul class="post-list">`.
- `website/src/pages/blog/[slug].astro` — renders `<h1>{post.title}</h1>`, a
  `<p class="post-meta">{formatDate(post.date)} · {post.author}</p>`, then
  `<Markdown value={post.body} />` inside `<div class="reading-shell reading-shell--no-toc">`.
- `website/src/layouts/BaseLayout.astro` — props are `title`, `description`, `image`,
  `accent`, `theme`, `breadcrumb`, `page`, `background`. It renders `<Seo {title}
  {description} {image} />` and does **not** forward a canonical path today.
- `website/src/components/Seo.astro` — already accepts
  `canonicalPath?: string | undefined`, defaulting to `Astro.url.pathname`.
- `website/scripts/content/reading-order.mjs` and `website/content/reading-order.json` —
  after T5 they carry only the `blog` array; `postGroups(readingOrder.blog, posts)` is called
  in `website/scripts/content/orchestrator.mjs`.
- `website/src/styles/global.css` — `.post-list`, `.post-meta`, and the rail's
  `.desktop-catalog li a small` rule that currently inlines the date.

## TDD

1. **Red** — add the date-format test and the flat-blog-rail test; watch them fail.
2. **Green** — implement `formatDateNumeric`, flatten the blog branch, rewrite the landing
   page.
3. **Refactor** — only if needed. Keep green.

## Test plan

File: `website/tests/unit/reading-shell.test.ts` (exists) or a new
`website/tests/unit/blog-rail.test.ts`

| Test                                                   | Input                                                          | Expect                                                    |
| ------------------------------------------------------ | -------------------------------------------------------------- | ---------------------------------------------------------- |
| `formatDateNumeric renders day, month, year`           | `'2026-08-08'`                                                  | `'08/08/2026'`                                             |
| `formatDateNumeric rejects a malformed date`           | `'2026-8-8'`                                                    | throws                                                     |
| `the blog rail is one flat group, newest first`        | fixture with posts dated `2026-08-01` and `2026-08-08`          | one group, `items[0].route` is the `08-08` post's route     |
| `blog rail items carry the numeric date as meta`       | same fixture                                                    | `items[0].meta === '08/08/2026'`                            |
| `the blog group has no label`                          | same fixture                                                    | `groups[0].label === ''`                                    |

File: `website/tests/unit/latest-release.test.ts` (exists — extend) or a new
`website/tests/unit/blog-landing.test.ts`

| Test                                        | Input                     | Expect                                    |
| ------------------------------------------- | ------------------------- | ------------------------------------------ |
| `latestPost returns the newest post`        | the live catalog          | `catalog.posts[0]` — posts are pre-sorted   |
| `latestPost is undefined for an empty list` | `{ posts: [] }`           | `undefined`                                 |

File: `website/tests/e2e/blog.spec.ts` (new)

| Test                                              | Input      | Expect                                                                        |
| ------------------------------------------------- | ---------- | ----------------------------------------------------------------------------- |
| `/blog/ renders the latest post body`             | `/blog/`   | `h1` text equals the newest post's title; no `.post-list` in the DOM           |
| `/blog/ points its canonical at the post URL`     | `/blog/`   | `link[rel=canonical]` href ends with the newest post's slug path               |
| `the rail lists posts with a numeric date`        | `/blog/`   | first rail item shows `\d{2}/\d{2}/\d{4}` and its title on its own line        |

Run: `cd website && npx vitest run tests/unit/blog-rail.test.ts tests/unit/blog-landing.test.ts`
then `cd website && npm run build && npx playwright test tests/e2e/blog.spec.ts`.

## Impl steps

- [x] 1. In `website/src/lib/catalog.ts`, add
      `export function formatDateNumeric(value: string): string` returning
      `` `${day}/${month}/${year}` `` from a `/^(\d{4})-(\d{2})-(\d{2})$/` match, throwing
      `new Error(\`Invalid local date: ${value}\`)` otherwise. Leave `formatDate` alone.
- [x] 2. In `website/src/lib/catalog.ts`, add
      `export function latestPost(source: { posts: readonly CatalogPost[] }): CatalogPost | undefined`
      returning `source.posts[0]` (the catalog is already sorted newest first).
- [x] 3. In `website/src/lib/reading-nav.ts`, replace the blog branch with a single group
      `{ key: 'posts', label: '', items: source.posts.map((post) => ({ route: post.route, title: post.title, meta: formatDateNumeric(post.date) })) }`,
      returning `[]` when there are no posts. Drop `postGroups` from `ReadingNavSource`.
- [x] 4. In `website/src/components/Navigation.svelte`, render a reading item as
      `<a …><span class="nav-item-title">{item.title}</span>{#if item.meta}<span class="nav-item-meta">{item.meta}</span>{/if}</a>`
      in both the desktop rail and the drawer, replacing the inline `<small>`.
- [x] 5. In `website/src/styles/global.css`, style `.nav-item-title` as
      `display: block;` with the rail's existing link typography, and `.nav-item-meta` as
      `display: block; font-size: .78rem; color: var(--muted-ish);` matching the current
      `small` colour. Keep the docs rail unaffected — docs items have no `meta`.
- [x] 6. Rewrite `website/src/pages/blog/index.astro` to read
      `const post = latestPost(catalog);`, render the same markup as
      `blog/[slug].astro` when a post exists, and `<p>No posts published yet.</p>` otherwise.
- [x] 7. Add `canonicalPath?: string | undefined` to `BaseLayout.astro`'s `Props`, default
      `undefined`, and forward it: `<Seo {title} {description} {image} {canonicalPath} />`.
- [x] 8. In `blog/index.astro`, pass `canonicalPath={withBase(base, post.route)}` so the
      landing page points at `/blog/{slug}/`.
- [x] 9. In `website/scripts/content/orchestrator.mjs`, drop `postGroups` from the catalog
      object and its import; delete `postGroups` from
      `website/scripts/content/reading-order.mjs`. If nothing else imports that module,
      delete `website/scripts/content/reading-order.mjs`,
      `website/content/reading-order.json` and
      `website/tests/unit/reading-order.test.ts`, and remove the `loadReadingOrder` call
      from the orchestrator.
- [x] 10. In `website/src/lib/catalog.ts`, remove `postGroups` from the catalog type.
- [x] 11. Remove the now-unused `.post-list` rules from `global.css` if nothing else uses
      them (`grep -rn "post-list" src/`).
- [x] 12. Write the test files per the test plan.
- [x] 13. Update `docs/website-information-architecture.html`: `/blog/` is the latest post;
      the rail is the blog index. Cite
      `docs/ADR/proposed/0043-blog-landing-is-the-latest-post.md`.

## Outputs

- Touched: `website/src/lib/catalog.ts`, `website/src/lib/reading-nav.ts`,
  `website/src/components/Navigation.svelte`, `website/src/layouts/BaseLayout.astro`,
  `website/src/pages/blog/index.astro`, `website/src/styles/global.css`,
  `website/scripts/content/orchestrator.mjs`, `website/scripts/content/reading-order.mjs`
  (likely deleted), `website/content/reading-order.json` (likely deleted), the test files
  above, `docs/website-information-architecture.html`.
- Catalog shape change: `postGroups` is removed.
- New exports: `formatDateNumeric`, `latestPost`.

## Validation

- [x] `cd website && npx vitest run` — whole unit suite green
- [x] `cd website && npm run content` — exits 0, still prints `… 2 posts`
- [x] `cd website && npm run check` — no type error from the removed `postGroups`
- [x] `cd website && npm run build && npm run test:e2e` — green, including the new spec
- [x] `cd website && npm run links:check` — exits 0; nothing links to a removed list page
- [x] manual check: `/blog/` shows the 2026-08-08 post in full; the rail shows both posts,
      each title on its own line with `08/08/2026` and `01/08/2026` beneath
- [x] manual check: `/blog/lota-alpha-v0-1-presentation/` still renders and its canonical is
      itself (post routes are `/blog/{slug}/`, with the date prefix stripped from the filename)
- [x] commit msg draft: `feat(website): land the blog on its latest post`

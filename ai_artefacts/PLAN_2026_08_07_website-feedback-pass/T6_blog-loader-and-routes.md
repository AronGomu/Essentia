# T6: Blog loader and routes

**Plan:** `./ai_artefacts/PLAN_2026_08_07_website-feedback-pass.md`
**Depends:** T3, T4
**Commit outcome:** `/blog/` lists published posts newest first and `/blog/<slug>/` renders a post, with the existing project-introduction script migrated as the first post.

## Context (self-contained)

- Goal: ship the UX feedback backlog in `.dev/feedback.md`. Feedback **Home #6** adds a header button "Blog" that redirects to the blog section of the website. No blog exists yet.
- This slice: the blog content collection, its loader, and its two routes. The header button lands in T9.
- Out of scope here: `@astrojs/mdx`, tag pages `/blog/tag/<tag>/`, `/blog/feed.xml`, pagination, prose components (`<Card id>`, `<Decklist>`), release cross-links. Plain Markdown only.
- Assumptions in force: posts are plain Markdown rendered by the repo's own renderer — no new dependency, CSP untouched. Videos are never embedded; a post links out.

## Requirements

- New content directory `website/content/blog/<yyyy-mm-dd-slug>/index.md` with YAML-ish front matter delimited by `---`.
- Front-matter fields: `title` (string, required), `date` (`YYYY-MM-DD`, required, must match the directory prefix), `author` (string, required), `summary` (string, required, ≤ 240 chars), `tags` (comma-separated string, optional), `draft` (`true`/`false`, optional, default `false`).
- Loader fails loudly on: unknown front-matter key, missing required key, date/directory mismatch, duplicate slug, file over 262 144 bytes, symlink, body containing raw HTML.
- Draft posts are excluded from the catalog.
- Catalog gains `posts`; `CATALOG_SCHEMA_VERSION` goes `5` → `6`.

## Inputs

- `content/2026-08-01-legend-of-alpha-project-introduction/script.md` at the **repo root** — the source text to migrate. Leave the original file untouched; copy its prose into the new post.
- `website/scripts/content/shared.mjs` — `WEBSITE`, `CONTENT` (= `website/content`), `fail(message)`, `slugify(value)`, `validDate(value)`, `LIMITS`.
- `website/scripts/content/orchestrator.mjs` — `build({checkOnly})`; `CATALOG_SCHEMA_VERSION` const near line 28; the `catalog` object literal near the end. `loadExplanations` in the same file is the pattern to copy for a safe content loader (symlink rejection, size cap, markup rejection, URL allow-list).
- `website/src/lib/catalog.ts` — `Catalog` interface, `withBase`, `formatDate(value: string)` which needs a `YYYY-MM-DD`-prefixed string.
- `website/src/components/Markdown.astro` — `interface Props { value: string; class?: string }`.
- `website/src/layouts/BaseLayout.astro` — props `{ title, description, image?, accent?, theme? }`.
- **From Depends (T4):** `catalog` already carries a `docs: CatalogDoc[]` field and `CATALOG_SCHEMA_VERSION` is `5`; `website/scripts/content/docs.mjs` exports `loadDocs()` and is already awaited inside `build()` in `orchestrator.mjs`. Add the blog loader beside it.
- **From Depends (T3):** `renderSafeMarkdown(value, base)` in `website/src/lib/markdown.ts` handles h1–h4, ordered lists, one level of nested bullets, fenced code, blockquotes, pipe tables, `---` rules, and still throws `Unsafe Markdown URL: <url>` for anything not starting `https://`, `mailto:`, `#`, or `/`. `headingSlug(text)` is exported from the same module.

## TDD

1. **Red** — write `website/tests/unit/blog.test.ts` first against `parseFrontMatter` and `loadPosts` from `../../scripts/content/blog.mjs`. Fails: module missing.
2. **Green** — implement `blog.mjs`, wire the orchestrator, add the two pages, migrate the post.
3. **Refactor** — none.

Exact API:

```js
/** @returns {{ data: Record<string,string>, body: string }} */
export function parseFrontMatter(text, source)

/** @returns {Promise<Post[]>} non-draft posts, newest date first, then slug */
export async function loadPosts()
```

`Post` shape stored in the catalog:

```js
{
  slug: 'legend-of-alpha-project-introduction',   // directory name minus the date prefix
  route: '/blog/legend-of-alpha-project-introduction/',
  title: 'Legend of the Alpha — project introduction',
  date: '2026-08-01',
  author: 'Aron Gomu',
  summary: '…',
  tags: ['release', 'alpha'],
  body: '…'
}
```

`ALLOWED_POST_KEYS = new Set(['title', 'date', 'author', 'summary', 'tags', 'draft'])`. Unknown key → `fail(\`post ${source}: unknown front-matter key ${key}\`)`.

## Test plan

| Test | Input | Expect |
| ---- | ----- | ------ |
| `parses front matter and body` | `'---\ntitle: A\ndate: 2026-08-01\n---\nbody text'` | `{ data: { title: 'A', date: '2026-08-01' }, body: 'body text' }` |
| `rejects a missing front-matter block` | `'no front matter'` | throws containing `post <src>: missing front matter` |
| `rejects an unknown key` | front matter with `hero: x.png` | throws containing `unknown front-matter key hero` |
| `loads the migrated post` | `await loadPosts()` | length `1`, `[0].slug === 'legend-of-alpha-project-introduction'`, `[0].date === '2026-08-01'` |
| `excludes drafts` | temp fixture with `draft: true` | that slug is absent |
| `sorts newest first` | fixture with two dates | `[0].date > [1].date` |
| `splits tags` | `tags: release, alpha` | `['release', 'alpha']` |

Run: `cd website && npx vitest run tests/unit/blog.test.ts`

## Impl steps

- [ ] 1. Create `website/tests/unit/blog.test.ts` with the seven cases above.
- [ ] 2. Create `website/scripts/content/blog.mjs` with `ALLOWED_POST_KEYS`, `parseFrontMatter`, `loadPosts`.
- [ ] 3. `loadPosts` reads `path.join(CONTENT, 'blog')`; if the directory is absent it returns `[]`. For each entry: reject symlinks and non-directories via `fail()`, require the name to match `/^\d{4}-\d{2}-\d{2}-[a-z0-9-]+$/`, read `index.md`, cap at `262_144` bytes, reject a body matching `/<\/?[A-Za-z][^>]*>/` with `fail(\`post ${slug}: raw HTML is not allowed\`)`.
- [ ] 4. Create `website/content/blog/2026-08-01-legend-of-alpha-project-introduction/index.md`. Front matter:
      `title: Legend of the Alpha — project introduction`, `date: 2026-08-01`, `author: Aron Gomu`,
      `summary: The first Essentia package, what is in it, and how the cube plays.`, `tags: release, alpha`.
      Body: the prose of root `content/2026-08-01-legend-of-alpha-project-introduction/script.md`, converted to article form — strip any teleprompter/section-timing scaffolding, keep the headings and paragraphs, replace any raw HTML with Markdown, and point card mentions at `/cards/<id>/` routes.
- [ ] 5. Import `loadPosts` in `website/scripts/content/orchestrator.mjs`, await it beside `loadDocs()`, and add `posts` to the `catalog` object literal.
- [ ] 6. Bump `CATALOG_SCHEMA_VERSION` to `6`; add `CatalogPost` and `posts: CatalogPost[]` to `website/src/lib/catalog.ts` and change `schemaVersion: 5` to `6`; update `website/tests/unit/catalog.test.ts`.
- [ ] 7. Create `website/src/pages/blog/index.astro`: `BaseLayout title="Blog — Essentia" description="Announcements and design notes from the Essentia project." accent="relic"`, a `.page-shell` with `<h1>Blog</h1>` and `<ul class="post-list">` of `<li><a href={withBase(base, post.route)}><h2>{post.title}</h2></a><p class="post-meta">{formatDate(post.date)} · {post.author}</p><p>{post.summary}</p></li>`. When `catalog.posts.length === 0`, render `<p>No posts published yet.</p>`.
- [ ] 8. Create `website/src/pages/blog/[slug].astro` with `getStaticPaths()` over `catalog.posts`, rendering `<article class="page-shell post-body"><h1>{post.title}</h1><p class="post-meta">{formatDate(post.date)} · {post.author}</p><Markdown value={post.body} /></article>`.
- [ ] 9. Add `.post-list { list-style: none; padding: 0; display: grid; gap: var(--space-4); }`, `.post-meta { color: var(--silver-ink); margin: 0.2rem 0 0.6rem; }`, `.post-body { max-width: 52rem; }` to `website/src/styles/global.css`.
- [ ] 10. Extend the orchestrator summary line with `, ${posts.length} posts`.
- [ ] 11. Run `npm run content:check`, `npm run format`, `npm run lint`, `npm run check`.

## Outputs

- Files touched: `website/scripts/content/blog.mjs` (new), `website/content/blog/2026-08-01-legend-of-alpha-project-introduction/index.md` (new), `website/scripts/content/orchestrator.mjs`, `website/src/lib/catalog.ts`, `website/src/pages/blog/index.astro` (new), `website/src/pages/blog/[slug].astro` (new), `website/src/styles/global.css`, `website/tests/unit/blog.test.ts` (new), `website/tests/unit/catalog.test.ts`.
- Public API: `catalog.posts`, `CatalogPost`, `loadPosts`, `parseFrontMatter`.
- Migration: catalog schemaVersion 5 → 6.

## Validation

- [ ] `cd website && npx vitest run tests/unit/blog.test.ts` — 7 passed
- [ ] `cd website && npm run content:check` — summary line ends with `1 posts`
- [ ] `cd website && npm run build` — `dist/blog/index.html` and `dist/blog/legend-of-alpha-project-introduction/index.html` exist
- [ ] `cd website && npm run links:check` — exit 0
- [ ] manual check: `node scripts/serve-dist.mjs`, open `/blog/`, click through to the post, confirm it reads correctly with JavaScript disabled
- [ ] `cd website && npm run ci` — exit 0
- [ ] app functional — every pre-existing route unchanged
- [ ] commit msg draft: `feat(website): publish a blog section with the first project post`

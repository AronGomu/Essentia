# T9: Reading order config

**Plan:** `./ai-artifacts/PLAN_2026_08_08_website-feedback-pass-2.md`
**Depends:** T1
**Commit outcome:** A hand-editable `website/content/reading-order.json` defines the sections and order of both the docs list and the blog list; the hardcoded `DOC_GROUPS` array is gone.

## Context (self-contained)

- Goal: website feedback pass 2. This ticket delivers feedback item
  **"Docs & Blog 3"**: "Generate a config file that I can manually edit to define
  the order and sections of docs and blog articles in the reading rail."
- This slice: the data layer only. The navigation that consumes it moves into the
  catalog rail in T10 — until then the existing `DocsRail`/`BlogRail` components
  keep rendering, now fed from the config.
- Out of scope here: deleting the reading rail, the nav, keyword rulings, MSE card
  data, hero art, section intros, back-to-top.
- Assumptions in force: `graphify` is not installed — do not run it. The config
  reproduces today's grouping exactly, so this ticket is behaviour-neutral on the
  rendered site.

## Requirements

- New file `website/content/reading-order.json`, schema:

  ```json
  {
    "schemaVersion": 1,
    "docs": [
      { "key": "overview", "label": "Overview", "files": ["docs/PRESENTATION.md", "docs/CONTEXT.md", "docs/GLOSSARY.md"] },
      { "key": "design", "label": "Design", "files": ["docs/DESIGN.md", "docs/design/CONVERSION.md", "docs/design/BALANCE.md", "docs/design/FRAMES.md"] },
      { "key": "rules", "label": "Rules", "files": ["docs/RULES.md", "docs/rules/DECK_BUILDING.md", "docs/rules/CARD_TYPES.md", "docs/rules/ZONES.md", "docs/rules/SUMMONING.md", "docs/rules/TEMPLATING.md", "docs/rules/DECKLISTS_ALPHA_0.1.md"] },
      { "key": "keywords", "label": "Keywords", "files": ["docs/KEYWORDS.md", "docs/keywords/ACTIONS.md", "docs/keywords/EVENTS.md", "docs/keywords/ABILITIES.md", "docs/keywords/COSTS_AND_PROCEDURES.md"] },
      { "key": "archetypes", "label": "Archetypes", "files": null },
      { "key": "project", "label": "Project", "files": ["docs/RELEASES.md", "docs/SET_PROMOTIONS.md", "docs/MSE.md"] }
    ],
    "blog": [{ "key": "all", "label": "All posts", "slugs": null }]
  }
  ```

  `"files": null` marks the single catch-all docs group (today: archetype docs, in
  path order). `"slugs": null` marks the single catch-all blog group (posts newest
  first, then slug ascending).
- New loader `website/scripts/content/reading-order.mjs` exporting
  `READING_ORDER_FILE` and `async function loadReadingOrder(file = READING_ORDER_FILE)`
  returning `{ docs, blog }`, failing the build on every invalid shape listed in the
  test plan.
- `website/scripts/content/docs.mjs` stops exporting `DOC_GROUPS`; `loadDocs(groups)`
  takes the groups as its first argument.
- `catalog.postGroups` is added: `Array<{ key: string; label: string; slugs: string[] }>`,
  empty groups dropped, computed from the blog config against the loaded posts.
- `CATALOG_SCHEMA_VERSION` is bumped by one (read the current value and add one).
- Rendered output is unchanged: `/docs/` shows the same six groups in the same
  order, `/blog/` shows the same list.

## Inputs

- `website/scripts/content/docs.mjs`:
  - `export const DOC_GROUPS = [ … ]` at lines 9–55 — the six groups above, verbatim;
    copy the file lists from there, do not retype them from memory.
  - `function groupFor(relativePath, archetypeOrder)` at lines 120–133 — matches an
    explicit `files` list first, then falls back to the group whose `key` is
    `'archetypes'` for paths matching `/^docs\/0\d_[^/]+\/[A-Z_]+\.md$/`.
  - `export async function loadDocs()` at line 136 — closes over `DOC_GROUPS` in
    `groupFor` and in the final `groupIndex` sort.
- `website/scripts/content/blog.mjs` — `loadPosts()` returns posts sorted
  `date` desc then `slug` asc, each `{ slug, route, title, date, author, summary, tags, body }`.
- `website/scripts/content/orchestrator.mjs` — `const docs = await loadDocs();`
  at line 83, `const posts = await loadPosts();` at line 84, the `catalog` object at
  lines 210–224, and `export const CATALOG_SCHEMA_VERSION` at line 31.
- `website/scripts/content/shared.mjs` — `CONTENT`, `fail()`.
- `website/src/lib/catalog.ts` — `Catalog` interface; add `postGroups`.
- `website/tests/unit/docs-corpus.test.ts` imports `{ docRoute, loadDocs, rewriteDocLinks }`
  from `../../scripts/content/docs.mjs`; its `loadDocs` calls must pass the groups.
- **From Depends (T1):** baseline green.

## TDD

1. **Red** — add `website/tests/unit/reading-order.test.ts` with the rows below; it
   fails (no loader, no config file).
2. **Green** — write the config, the loader, and thread it through `docs.mjs` and the
   orchestrator.
3. **Refactor** — delete `DOC_GROUPS`; keep green.

## Test plan

Run with `cd website && npm run test`.

| Test | Input | Expect |
| ---- | ----- | ------ |
| `loads the shipped config` | `await loadReadingOrder()` | `docs` length `6`, keys `['overview','design','rules','keywords','archetypes','project']`; `blog` length `1` |
| `rejects a wrong schemaVersion` | fixture `{ schemaVersion: 2, … }` | rejects `/reading order must use schemaVersion 1/` |
| `rejects a duplicate docs key` | two groups keyed `overview` | rejects `/duplicate reading group overview/` |
| `rejects a non-kebab key` | key `Over_view` | rejects `/invalid reading group key Over_view/` |
| `rejects an empty label` | `label: ''` | rejects `/reading group overview: label is required/` |
| `rejects two catch-all docs groups` | two groups with `files: null` | rejects `/exactly one docs group may use files: null/` |
| `rejects zero catch-all docs groups` | every group with a `files` array | rejects `/exactly one docs group may use files: null/` |
| `rejects a duplicate file across groups` | `docs/RULES.md` in two groups | rejects `/doc docs\/RULES\.md is listed twice/` |
| `rejects two catch-all blog groups` | two groups with `slugs: null` | rejects `/exactly one blog group may use slugs: null/` |
| `docs-corpus.test.ts` › `groups docs from the config` | `await loadDocs((await loadReadingOrder()).docs)` | first entry `path === 'docs/PRESENTATION.md'`, `group === 'overview'` |
| `docs-corpus.test.ts` › `fails on an ungrouped doc` | groups fixture missing the `rules` group | rejects `/is not listed in the reading order/` |
| `reading-order.test.ts` › `assigns unlisted posts to the catch-all` | `postGroups(config.blog, posts)` with 3 posts, config `[{key:'all',label:'All posts',slugs:null}]` | one group holding all 3, newest first |
| `reading-order.test.ts` › `honours an explicit slug order` | config `[{key:'featured',label:'Featured',slugs:['b']},{key:'all',label:'All posts',slugs:null}]` | `featured` holds `['b']`; `all` holds the rest |
| `reading-order.test.ts` › `rejects an unknown slug` | config listing `slugs: ['ghost']` | rejects `/blog group featured: unknown post ghost/` |
| `reading-order.test.ts` › `drops empty groups` | config `featured` with a slug that exists but no posts loaded | `postGroups(...)` omits the empty group |
| `catalog.test.ts` › `exposes post groups` | `catalog.postGroups` | array; every `slugs` entry resolves to a post in `catalog.posts` |

## Impl steps

- [x] 1. Create `website/content/reading-order.json` with the exact JSON in
      **Requirements**, copying every path from `DOC_GROUPS` in
      `website/scripts/content/docs.mjs`.
- [x] 2. Create `website/scripts/content/reading-order.mjs`:
      ```js
      import { readFile } from 'node:fs/promises';
      import path from 'node:path';
      import { CONTENT, fail } from './shared.mjs';

      export const READING_ORDER_FILE = path.join(CONTENT, 'reading-order.json');
      const KEY_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
      ```
- [x] 3. Implement `loadReadingOrder(file = READING_ORDER_FILE)`:
      parse JSON; `data.schemaVersion !== 1` →
      `fail('reading order must use schemaVersion 1')`; `docs` and `blog` must be
      arrays or `fail('invalid reading order')`.
- [x] 4. For each docs group validate: `KEY_RE.test(key)` else
      `fail(\`invalid reading group key ${key}\`)`; unique key else
      `fail(\`duplicate reading group ${key}\`)`; non-empty trimmed `label` else
      `fail(\`reading group ${key}: label is required\`)`; `files` is `null` or a
      non-empty array of strings starting `docs/` and ending `.md`; a path seen in a
      previous group → `fail(\`doc ${file} is listed twice in the reading order\`)`.
      Count `files === null`; not exactly 1 →
      `fail('exactly one docs group may use files: null')`.
- [x] 5. Same key/label validation for blog groups, with `slugs` instead of `files`
      (array of `/^[a-z0-9-]+$/` or `null`), and
      `fail('exactly one blog group may use slugs: null')`.
- [x] 6. Add and export from the same module:
      ```js
      /** Blog groups filled from loaded posts; explicit slugs first, catch-all takes the rest. */
      export function postGroups(groups, posts) {
        const bySlug = new Map(posts.map((post) => [post.slug, post]));
        const claimed = new Set();
        const output = [];
        for (const group of groups) {
          if (group.slugs === null) continue;
          for (const slug of group.slugs)
            if (!bySlug.has(slug)) fail(`blog group ${group.key}: unknown post ${slug}`);
          group.slugs.forEach((slug) => claimed.add(slug));
        }
        for (const group of groups) {
          const slugs =
            group.slugs === null
              ? posts.filter((post) => !claimed.has(post.slug)).map((post) => post.slug)
              : group.slugs;
          if (slugs.length) output.push({ key: group.key, label: group.label, slugs });
        }
        return output;
      }
      ```
      (`posts` arrives already sorted newest-first from `loadPosts()`.)
- [x] 7. In `website/scripts/content/docs.mjs`: delete `export const DOC_GROUPS`;
      change `groupFor(relativePath, archetypeOrder, groups)` to take the groups;
      change the signature to `export async function loadDocs(groups)`; replace both
      `DOC_GROUPS` references (`groupFor` and the `groupIndex` map) with `groups`;
      change the failure message to
      `fail(\`doc ${relative} is not listed in the reading order\`)`.
- [x] 8. In `website/scripts/content/orchestrator.mjs`: import
      `loadReadingOrder, postGroups`; add
      `const readingOrder = await loadReadingOrder();` before the docs load; change
      to `const docs = await loadDocs(readingOrder.docs);`; after `const posts = …`
      add `const groupedPosts = postGroups(readingOrder.blog, posts);`; add
      `postGroups: groupedPosts,` to the `catalog` object; bump
      `CATALOG_SCHEMA_VERSION` by one.
- [x] 9. In `website/src/lib/catalog.ts` add to the `Catalog` interface:
      ```ts
      /** Blog sections, in reading-order.json order; every slug resolves to a post. */
      postGroups: ReadonlyArray<{ key: string; label: string; slugs: readonly string[] }>;
      ```
- [x] 10. Update `website/tests/unit/docs-corpus.test.ts` `loadDocs()` calls to pass
      `(await loadReadingOrder()).docs`, and add the two new rows.
- [x] 11. Add `website/tests/unit/reading-order.test.ts` with every remaining row.
- [x] 12. `cd website && npm run content` → exit 0, same counts as before.
- [x] 13. `cd website && npm run test && npm run build` → exit 0.
- [x] 14. Manual: reorder `docs/GLOSSARY.md` above `docs/CONTEXT.md` in
      `reading-order.json`, run `npm run content`, confirm the docs rail order
      changed, then revert.

## Outputs

- Files touched: new `website/content/reading-order.json`,
  new `website/scripts/content/reading-order.mjs`,
  new `website/tests/unit/reading-order.test.ts`;
  edited `website/scripts/content/docs.mjs`,
  `website/scripts/content/orchestrator.mjs`, `website/src/lib/catalog.ts`,
  `website/tests/unit/docs-corpus.test.ts`,
  `website/tests/unit/catalog.test.ts`, `website/src/generated/catalog.ts`.
- Public API / behaviour change: `loadDocs(groups)` now takes an argument;
  `catalog.postGroups` added; `DOC_GROUPS` removed.
- Migrate / config: authors edit `website/content/reading-order.json`.

## Validation

- [x] tests pass: `cd website && npm run test`; `cd website && npm run ci`
      (run in a disposable detached worktree at HEAD — the main checkout's
      `blog/` is mid-edit by the owner and breaks `npm run content` there for
      unrelated reasons; see report)
- [x] manual check: `/docs/` still shows Overview / Design / Rules / Keywords /
      Archetypes / Project in that order (`docs-corpus.test.ts` "orders groups"
      + "groups docs from the config" pass; generated catalog groups verified)
- [x] manual check: editing `reading-order.json` and re-running `npm run content`
      changes the order (reverted afterwards)
- [x] app functional — `cd website && npm run build` exits 0
- [ ] commit msg draft: `feat(website): drive docs and blog ordering from reading-order.json`
      (draft only — commit not yet made, see report)

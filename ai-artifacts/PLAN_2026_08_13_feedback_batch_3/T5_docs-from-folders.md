# T5: Folder-derived docs content

**Plan:** `./ai-artifacts/PLAN_2026_08_13_feedback_batch_3.md`
**Depends:** none
**Commit outcome:** Doc groups, labels, order and routes all derive from the `docs/` folder
tree; `content/reading-order.json` no longer configures docs, and moving a doc file can
never break the build again.

## Context (self-contained)

- Goal: docs navigation is currently grouped by a hand-maintained list in
  `website/content/reading-order.json`, and `scripts/content/docs.mjs::groupFor` fails the
  build for any doc not listed there. The owner wants groups to follow the folder tree, with
  ordering controlled purely by numeric filename prefixes he will add himself.
- This slice: the content side only — discovery, grouping, labels, ordering, routes. The
  rail UI (collapsing) is T6; the actual file moves are T8, executed by Aron.
- Out of scope here: `Navigation.svelte`, blog reading order, the file moves themselves.
- Assumptions in force: URLs keep their numeric prefixes; visible labels do not. Root-level
  docs are ungrouped and come first. The alphabetically first root-level doc also serves the
  `/docs/` route.

## Requirements

- Group key = the first path segment under `docs/` when the doc is inside a directory;
  root-level docs use the empty group key `''`.
- Group label = the directory name with a leading `NN_` (or `NN-`) prefix stripped,
  underscores and hyphens replaced by spaces, then Title Case
  (`02_burning_abyss` → `Burning Abyss`, `01_general_rules` → `General Rules`).
- Ordering: root-level docs first, sorted by filename; then directories sorted by raw
  directory name; inside a directory, docs sorted by raw filename. Raw name means the
  numeric prefix is included, so `01_` sorts before `02_`.
- Route keeps the numbers: `docs/01_general_rules/01_ZONES.md` → `/docs/01-general-rules/01-zones/`.
- The alphabetically first root-level doc gets route `/docs/`; every other root-level doc
  gets `/docs/{slug}/`.
- No doc can fail the build for being "unlisted"; the only doc failures left are a missing
  `#` first heading, an oversize file, a symlink, and a duplicate route.
- `docs/ADR/**` and `docs/keywords/<slug>.md` ruling files stay excluded exactly as today.

## Inputs

- `website/scripts/content/docs.mjs` — exports `docRoute(relativePath)`,
  `rewriteDocLinks(body, relativePath, knownPaths)`, `loadDocs(groups, root = ROOT)`;
  private `discoverDocPaths(root)` and `groupFor(relativePath, archetypeOrder, groups)`.
  Current `docRoute` special-cases `docs/PRESENTATION` → `/docs/` and slugifies every other
  segment after dropping the leading `docs/`.
- `website/scripts/content/shared.mjs` — `slugify(value)` lowercases and replaces
  `[^a-z0-9]+` with `-`, trimming leading and trailing dashes. `01_general_rules` becomes
  `01-general-rules` unchanged by this ticket.
- `website/scripts/content/reading-order.mjs` — `loadReadingOrder()` reads
  `website/content/reading-order.json` and returns `{ docs, blog }`; `postGroups(...)` is
  used by the blog and must survive this ticket untouched.
- `website/content/reading-order.json` — has a `docs` array (keys `overview`, `design`,
  `rules`, `keywords`, `archetypes`, `project`) and a `blog` array. Only the `docs` array
  goes.
- `website/scripts/content/orchestrator.mjs` — `const docs = await loadDocs(readingOrder.docs);`
- `website/src/lib/catalog.ts` — `CatalogDoc` carries `{ id, path, route, title, group,
  groupLabel, order, body, headings }`.
- `website/src/lib/docs.ts` — `docsRailGroups(docs)` groups by `doc.group`, preserving
  catalog order and reusing `doc.groupLabel`.
- Consumers that must keep working: `website/src/pages/docs/index.astro`
  (`catalog.docs.find((entry) => entry.route === '/docs/')`),
  `website/src/pages/docs/[...path].astro`, `website/src/lib/find.ts` (uses `groupLabel`),
  `website/src/lib/reading-nav.ts` (`readingNavGroups` → `docsRailGroups`).
- Current tree for reference: root files `CONTEXT.md`, `DESIGN.md`, `GLOSSARY.md`,
  `KEYWORDS.md`, `MSE.md`, `PRESENTATION.md`, `RELEASES.md`, `RULES.md`,
  `SET_PROMOTIONS.md`; directories `01_burning_abyss`, `02_shaddoll`, `03_nekroz`,
  `04_spellbook`, `design`, `keywords`, `rules`.

## TDD

- [x] 1. **Red** — rewrite `website/tests/unit/docs-routes.test.ts` against the new `docRoute`
      and a new `groupLabel` export; add the fixture-tree test below. Verify the targeted
      Vitest command fails against production code.
- [x] 2. **Green** — rewrite `docs.mjs`, drop the docs half of the reading order. Verify the
      targeted Vitest command passes.
- [x] 3. **Refactor** — only if needed. Keep green by rerunning the targeted Vitest command.

## Test plan

File: `website/tests/unit/docs-routes.test.ts`

| Test                                                   | Input                                   | Expect                              |
| ------------------------------------------------------ | --------------------------------------- | ------------------------------------ |
| `a nested doc keeps its numeric prefixes in the route` | `docs/01_general_rules/01_ZONES.md`      | `/docs/01-general-rules/01-zones/`   |
| `an unnumbered folder still routes`                    | `docs/rules/ZONES.md`                    | `/docs/rules/zones/`                 |
| `a root doc routes under /docs/`                       | `docs/GLOSSARY.md`                       | `/docs/glossary/`                    |
| `groupLabelFor strips the prefix and title-cases`      | `02_burning_abyss`                       | `Burning Abyss`                      |
| `groupLabelFor handles multi-word unnumbered folders`  | `general_rules`                          | `General Rules`                      |

File: `website/tests/unit/docs-corpus.test.ts` — point `loadDocs` at a `mkdtemp` fixture
tree, never at the tracked tree:

| Test                                                        | Fixture                                                                                 | Expect                                                                     |
| ----------------------------------------------------------- | --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `root docs come first in alphabetical order`                | `docs/B.md`, `docs/A.md`, `docs/01_x/01_C.md`                                             | order is `A`, `B`, `C`; `A` and `B` have `group === ''`                     |
| `the alphabetically first root doc serves /docs/`           | same fixture                                                                              | `A.route === '/docs/'`, `B.route === '/docs/b/'`                            |
| `directories become groups in raw name order`               | `docs/02_b/01_X.md`, `docs/01_a/01_Y.md`                                                  | groups appear as `01_a` then `02_b`, labelled `A` then `B`                  |
| `a doc in a new folder needs no configuration`              | add `docs/03_c/01_Z.md` to the fixture                                                    | `loadDocs` succeeds and places it last                                      |
| `a doc without a first heading still fails`                 | `docs/D.md` starting with `text`                                                          | `loadDocs` throws mentioning `D.md`                                         |

File: `website/tests/unit/reading-order.test.ts` — delete every docs-group assertion; keep
the blog ones.

Run: `cd website && npx vitest run tests/unit/docs-routes.test.ts tests/unit/docs-corpus.test.ts tests/unit/reading-order.test.ts`

## Impl steps

- [x] 1. In `website/scripts/content/docs.mjs`, add
      `export function groupLabelFor(directoryName)`: strip `/^\d+[_-]/`, replace `[_-]+`
      with a space, then upper-case the first letter of each word.
- [x] 2. Rewrite `docRoute(relativePath, { isLanding })`: return `/docs/` when `isLanding`;
      otherwise `\`/docs/${segments.map(slugify).join('/')}/\`` where `segments` is the path
      under `docs/` with `.md` removed. Numeric prefixes survive `slugify` untouched.
- [x] 3. In `discoverDocPaths`, keep the `docs/ADR` and per-keyword exclusions and the
      symlink and size checks exactly as they are.
- [x] 4. Delete `groupFor` and the `archetypeOrder` computation.
- [x] 5. Change the signature to `export async function loadDocs(root = ROOT)` — no groups
      argument.
- [x] 6. Compute placement per doc: `const segments = relative.slice('docs/'.length).split('/');`
      `const group = segments.length > 1 ? segments[0] : '';`
      `const groupLabel = group ? groupLabelFor(group) : '';`
- [x] 7. Sort the discovered paths: root docs (`group === ''`) first by filename, then by
      `group` raw name, then by filename inside the group. Assign `order` as the index
      within the group.
- [x] 8. Mark the landing doc: the first entry of the root group, if any; give it
      `docRoute(path, { isLanding: true })`. If there is no root-level doc,
      `fail('docs: no root-level doc to serve /docs/')`.
- [x] 9. Keep the duplicate-route check and the `#` heading requirement unchanged.
- [x] 10. In `website/scripts/content/reading-order.mjs`, remove the `docs` key from the
      parsed shape and its validation; `loadReadingOrder()` now returns `{ blog }`.
- [x] 11. In `website/content/reading-order.json`, delete the `docs` array, leaving
      `{ "schemaVersion": 1, "blog": [...] }`.
- [x] 12. In `website/scripts/content/orchestrator.mjs`, change to
      `const docs = await loadDocs();` and update the `readingOrder` destructuring.
- [x] 13. Confirm `website/src/lib/docs.ts::docsRailGroups` still works unchanged — it keys
      on `doc.group` and `doc.groupLabel`, both still present, with `''` for root docs.
- [x] 14. Update the tests per the test plan.
- [x] 15. Update `docs/website-information-architecture.html`: the docs section now derives
      from the folder tree; cite `docs/ADR/proposed/0041-docs-navigation-from-folders.md`.

## Outputs

- Touched: `website/scripts/content/docs.mjs`,
  `website/scripts/content/reading-order.mjs`, `website/content/reading-order.json`,
  `website/scripts/content/orchestrator.mjs`, `website/tests/unit/docs-routes.test.ts`,
  `website/tests/unit/docs-corpus.test.ts`, `website/tests/unit/reading-order.test.ts`,
  `docs/website-information-architecture.html`.
- Behaviour change on the **current** tree: root docs become ungrouped and alphabetical, so
  `docs/CONTEXT.md` — not `PRESENTATION.md` — would take `/docs/`. To avoid shipping that
  regression, rename `docs/PRESENTATION.md` → `docs/00_PRESENTATION.md` in this commit
  (one file), which restores it as the first root doc and the `/docs/` landing page. Update
  any `docs/PRESENTATION.md` link found by
  `grep -rn "PRESENTATION.md" --include=*.md --include=*.mjs --include=*.ts .` in the same
  commit.
- Supersedes the docs half of ADR 0026.

## Validation

- [ ] `cd website && npx vitest run` — whole unit suite green
      (owner-gated baseline only: 761 passed; `asset-rights.test.ts` reports
      `Public artifact blocked: 92 missing/changed and 0 stale rights records`)
- [x] `cd website && npm run content` — exits 0, prints `… 38 docs …`
- [x] `node -e` on the built catalog: `/docs/` resolves to the Essentia presentation doc,
      and every root doc has `group === ''`
- [x] `cd website && npm run build` — 152 pages, exits 0, `check-404` and `check-links` pass
- [x] `cd website && npm run links:check` — exits 0
- [x] manual check: `/docs/` shows the presentation page; `/docs/rules/zones/` still resolves
- [x] app functional — the rail still renders one heading per group (styling unchanged until T6)
- [x] commit msg draft: `feat(website): derive docs navigation from the docs folder tree`

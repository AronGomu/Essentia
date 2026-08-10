# T4: Docs corpus loader

**Plan:** `./ai-artifacts/PLAN_2026_08_07_website-feedback-pass.md`
**Depends:** T3
**Commit outcome:** the generated catalog carries every publishable `docs/**/*.md` file with a site route, a title, an outline, and rewritten internal links — with no page rendering them yet.

## Context (self-contained)

- Goal: ship the UX feedback backlog in `.dev/feedback.md`. Feedback **Home #5/#6** replaces the header links with a "Learn about Essentia" button pointing at the first page of the documentation, so the repo's `docs/` tree must be publishable.
- This slice: the build-time loader and catalog field only. Routes come in T5.
- Out of scope here: any `src/pages/**` file, the left rail component, `/rules/` and `/philosophy/` rewrites, the `/keywords/` index.
- Assumptions in force: `docs/ADR/**` stays internal (decision evidence, not visitor documentation). Everything else under `docs/` is published.

## Requirements

- New module `website/scripts/content/docs.mjs` exporting `loadDocs()`.
- Catalog gains a `docs` array; `CATALOG_SCHEMA_VERSION` goes `4` → `5` and `src/lib/catalog.ts` types follow.
- Relative `*.md` links inside doc bodies are rewritten to site routes; an unresolvable target fails the build via `fail()`.
- Build fails on: a doc with no `# ` first heading, a duplicate route, a file over 262 144 bytes, a symlink.

## Inputs

- `website/scripts/content/shared.mjs` — exports `ROOT` (repo root), `fail(message)`, `slugify(value)`, `LIMITS`.
- `website/scripts/content/orchestrator.mjs` — `build({checkOnly})`; `CATALOG_SCHEMA_VERSION = 4` at line 28; the `catalog` object literal near the end lists `sections, cards, cardVersions, releases, keywords, explanations, updates, publicationDiagnostics`. Add `docs` there.
- `website/src/lib/catalog.ts` — `export interface Catalog { schemaVersion: 4; … }`. Bump the literal type to `5` and add the `docs` field.
- `website/tests/unit/catalog.test.ts` — asserts the catalog shape; update the schemaVersion expectation there.
- Corpus (52 files, `find docs -name '*.md'`): `docs/*.md` (CONTEXT, DESIGN, GLOSSARY, KEYWORDS, MSE, RELEASES, RULES, SET_PROMOTIONS), `docs/design/*.md`, `docs/keywords/*.md`, `docs/rules/*.md`, `docs/0{1,2,3,4}_*/{CONTEXT,DESIGN,KEYWORDS,RULES}.md`, and `docs/ADR/**` which is **excluded**.
- **From Depends (T3):** `website/src/lib/markdown.ts` exports `renderSafeMarkdown(value: string, base?: string): string` and `headingSlug(text: string): string`. The renderer handles h1–h4, ordered lists, nested bullets, fenced code, blockquotes, pipe tables, `---`. Bodies are stored raw in the catalog and rendered at page build time by T5, so this ticket only imports `headingSlug`.

## TDD

1. **Red** — write `website/tests/unit/docs-corpus.test.ts` first against `loadDocs`, `docRoute`, `rewriteDocLinks`. Fails: module missing.
2. **Green** — implement `docs.mjs`, wire it into the orchestrator, update the catalog type and its test.
3. **Refactor** — none.

Exact API:

```js
/** `docs/rules/ZONES.md` → `/docs/rules/zones/`; `docs/PRESENTATION.md` → `/docs/`. */
export function docRoute(relativePath)

/** Rewrites relative `.md` links, keeps anchors, throws through fail() on an unknown target. */
export function rewriteDocLinks(body, relativePath, knownPaths)

/** @returns {Promise<DocEntry[]>} sorted by group order then title */
export async function loadDocs()
```

`DocEntry` shape stored in the catalog:

```js
{
  id: 'rules-zones',          // slugify(relativePath without .md)
  path: 'docs/rules/ZONES.md',
  route: '/docs/rules/zones/',
  title: 'Zones',             // first `# ` heading, `# ` stripped
  group: 'rules',             // see DOC_GROUPS below
  groupLabel: 'Rules',
  order: 2,                   // index inside the group, from the ordered file list
  body: '…',                  // full markdown after link rewriting, `# Title` line removed
  headings: [{ id: 'field', text: 'Field', level: 2 }]
}
```

`DOC_GROUPS`, in this exact order, exported from `docs.mjs`:

```js
export const DOC_GROUPS = [
  { key: 'overview',   label: 'Overview',   files: ['docs/PRESENTATION.md', 'docs/CONTEXT.md', 'docs/GLOSSARY.md'] },
  { key: 'design',     label: 'Design',     files: ['docs/DESIGN.md', 'docs/design/CONVERSION.md', 'docs/design/BALANCE.md', 'docs/design/FRAMES.md'] },
  { key: 'rules',      label: 'Rules',      files: ['docs/RULES.md', 'docs/rules/DECK_BUILDING.md', 'docs/rules/CARD_TYPES.md', 'docs/rules/ZONES.md', 'docs/rules/SUMMONING.md', 'docs/rules/TEMPLATING.md', 'docs/rules/DECKLISTS_ALPHA_0.1.md'] },
  { key: 'keywords',   label: 'Keywords',   files: ['docs/KEYWORDS.md', 'docs/keywords/ACTIONS.md', 'docs/keywords/EVENTS.md', 'docs/keywords/ABILITIES.md', 'docs/keywords/COSTS_AND_PROCEDURES.md'] },
  { key: 'archetypes', label: 'Archetypes', files: null },   // every docs/0N_*/**.md, sorted by path
  { key: 'project',    label: 'Project',    files: ['docs/RELEASES.md', 'docs/SET_PROMOTIONS.md', 'docs/MSE.md'] },
];
```

`docs/PRESENTATION.md` does not exist yet — T5 authors it. `loadDocs()` must **not** fail on a listed file that is absent; it skips it. It **must** fail when a discovered `docs/**/*.md` file (excluding `docs/ADR/`) matches no group, message: `content: doc <path> is not listed in DOC_GROUPS`.

Link rewriting rules for `rewriteDocLinks(body, relativePath, knownPaths)`:

- `](./RULES.md)` / `](../rules/ZONES.md)` / `](ZONES.md#field)` → resolve against `path.posix.dirname(relativePath)`, look the result up in `knownPaths` (a `Set` of published relative paths), emit `docRoute(target)` plus the original `#anchor`.
- A resolved target under `docs/ADR/` → rewrite to the GitHub repo URL `https://github.com/AronGomu/YGO-x-MTG/blob/main/<target>`, exactly like an out-of-`docs/` target. ADRs stay off the site, but the citation must survive. **Do not fail the build on these, and do not edit the citing doc.** Six published docs cite ADRs today and every one of them is legitimate: `docs/CONTEXT.md`, `docs/03_nekroz/CONTEXT.md`, `docs/03_nekroz/RULES.md`, `docs/04_spellbook/RULES.md` (two links), `docs/rules/DECK_BUILDING.md`, `docs/design/FRAMES.md`.
- A resolved target under `docs/` but absent from `knownPaths` → `fail(\`doc ${relativePath}: unpublished link target ${target}\`)`.
- A resolved target outside `docs/` (for example `](../cards_mse/)`) → rewrite to the GitHub repo URL `https://github.com/AronGomu/YGO-x-MTG/blob/main/<target>`.
- `https://`, `mailto:`, and bare `#anchor` links are left untouched.

## Test plan

| Test | Input | Expect |
| ---- | ----- | ------ |
| `maps a nested doc to its route` | `docRoute('docs/rules/ZONES.md')` | `/docs/rules/zones/` |
| `maps the presentation doc to the index` | `docRoute('docs/PRESENTATION.md')` | `/docs/` |
| `maps an archetype doc` | `docRoute('docs/01_burning_abyss/RULES.md')` | `/docs/01-burning-abyss/rules/` |
| `rewrites a sibling link` | `rewriteDocLinks('[Zones](rules/ZONES.md)', 'docs/RULES.md', set)` | `[Zones](/docs/rules/zones/)` |
| `keeps the anchor` | `rewriteDocLinks('[F](rules/ZONES.md#field)', 'docs/RULES.md', set)` | `[F](/docs/rules/zones/#field)` |
| `rewrites an out-of-docs link to GitHub` | `rewriteDocLinks('[src](../cards_mse/)', 'docs/CONTEXT.md', set)` | contains `https://github.com/AronGomu/YGO-x-MTG/blob/main/cards_mse/` |
| `rewrites an ADR link to GitHub` | `rewriteDocLinks('[a](ADR/README.md)', 'docs/CONTEXT.md', set)` | contains `https://github.com/AronGomu/YGO-x-MTG/blob/main/docs/ADR/README.md` |
| `fails on a missing docs target` | `rewriteDocLinks('[x](rules/NOPE.md)', 'docs/RULES.md', set)` | throws containing `unpublished link target` |
| `loads every published doc` | `await loadDocs()` | length equals the count of `docs/**/*.md` minus `docs/ADR/**`, currently `37` (overview 2 + design 4 + rules 7 + keywords 5 + project 3 + archetypes 16) |
| `excludes ADRs` | `await loadDocs()` | no entry whose `path` starts `docs/ADR/` |
| `extracts titles and outlines` | entry for `docs/keywords/EVENTS.md` | `title === 'Event keywords'`, `headings` includes `{ id: 'combat-entry', text: 'Combat/entry', level: 2 }` |
| `orders groups` | `(await loadDocs()).map(d => d.group)` | first entry's group is `overview`, last is `project` |

Run: `cd website && npx vitest run tests/unit/docs-corpus.test.ts`

## Impl steps

- [x] 1. Create `website/tests/unit/docs-corpus.test.ts` with the twelve cases above.
      *Criterion:* the file exists and `npx vitest run tests/unit/docs-corpus.test.ts` collects exactly 12 tests.
- [x] 2. Create `website/scripts/content/docs.mjs` with `DOC_GROUPS`, `docRoute`, `rewriteDocLinks`, `loadDocs`.
      *Criterion:* all four symbols import cleanly in the test run; the `docRoute` and `rewriteDocLinks` cases pass.
- [x] 3. In `loadDocs`, walk `path.join(ROOT, 'docs')` with `readdir(..., {withFileTypes:true})`, skip `ADR`, reject symlinks with `fail()`, reject files over `262_144` bytes.
      *Criterion:* the `loads every published doc` and `excludes ADRs` cases pass (37 entries, none under `docs/ADR/`).
- [x] 4. Parse each file: first line matching `/^#\s+(.+)$/` is the title and is removed from `body`; `#{2,4}` headings become `headings` entries via `headingSlug` imported from `../../src/lib/markdown.ts`. If importing TS from an `.mjs` build script is not possible, duplicate the four-line slug function locally and add a unit test asserting both agree.
      *Criterion:* the `extracts titles and outlines` case passes; `node -e "import('./src/lib/markdown.ts')"` resolves, so no local slug duplicate is needed.
- [x] 5. Import `loadDocs` in `website/scripts/content/orchestrator.mjs`, call it after `loadKeywordRegistry()`, and add `docs` to the `catalog` object literal.
      *Criterion:* `npm run content:check` exits 0 and `src/generated/catalog.ts` contains a `"docs"` key with 37 entries.
- [x] 6. Bump `CATALOG_SCHEMA_VERSION` to `5` in `orchestrator.mjs`.
      *Criterion:* the generated `src/generated/catalog.ts` begins with `"schemaVersion": 5`.
- [x] 7. In `website/src/lib/catalog.ts` add `export interface CatalogDoc { id, path, route, title, group, groupLabel, order, body, headings }` with `headings: Array<{ id: string; text: string; level: number }>`, add `docs: CatalogDoc[]` to `Catalog`, and change `schemaVersion: 4` to `schemaVersion: 5`.
      *Criterion:* `npm run check` (astro check) exits 0 with 0 errors.
- [x] 8. Update the schemaVersion expectation in `website/tests/unit/catalog.test.ts`.
      *Criterion:* `npx vitest run tests/unit/catalog.test.ts` passes.
- [x] 9. Extend the orchestrator's final `process.stdout.write` summary with `, ${docs.length} docs`.
      *Criterion:* the `npm run content:check` summary line ends with `37 docs`.
- [x] 10. Run `npm run content:check`, `npm run format`, `npm run lint`, `npm run check`.
      *Criterion:* every one of the four commands exits 0.
- [x] 11. Corpus precondition: `docs/rules/DECKLISTS_ALPHA_0.1.md` carries no `#` heading at all, so the Requirements guard "a doc with no `# ` first heading fails the build" makes the 37-doc target unreachable. Promote its first line to `# Release Alpha 0.1` — the one-character data fix that satisfies the guard. No other line of any doc body is edited.
      *Criterion:* `head -1 docs/rules/DECKLISTS_ALPHA_0.1.md` prints `# Release Alpha 0.1` and `loadDocs()` returns 37 entries without failing.

## Outputs

- Files touched: `website/scripts/content/docs.mjs` (new), `website/scripts/content/orchestrator.mjs`, `website/src/lib/catalog.ts`, `website/tests/unit/docs-corpus.test.ts` (new), `website/tests/unit/catalog.test.ts`.
- Public API: `catalog.docs`, `CatalogDoc`, `loadDocs`, `docRoute`, `rewriteDocLinks`, `DOC_GROUPS`.
- Migration: catalog schemaVersion 4 → 5; `src/generated/catalog.ts` is regenerated by the build, not committed by hand.

## Validation

- [x] `cd website && npx vitest run tests/unit/docs-corpus.test.ts` — all pass
- [x] `cd website && npm run content:check` — exit 0, summary line ends with `37 docs`
- [x] `cd website && npm run test` — full suite green
- [x] `cd website && npm run check && npm run lint && npm run format:check` — exit 0
- [x] `cd website && npm run build` — exit 0
- [x] app functional — no visible page change; the site builds and every existing route still resolves
- [x] commit msg draft: `feat(website): load the docs corpus into the catalog`

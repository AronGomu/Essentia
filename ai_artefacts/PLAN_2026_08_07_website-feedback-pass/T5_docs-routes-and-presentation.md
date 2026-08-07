# T5: Docs routes + presentation page

**Plan:** `./ai_artefacts/PLAN_2026_08_07_website-feedback-pass.md`
**Depends:** T4
**Commit outcome:** `/docs/` presents the project and every published repo doc has a readable page with a left rail, all without JavaScript.

## Context (self-contained)

- Goal: ship the UX feedback backlog in `.dev/feedback.md`. Feedback **Home #5** says the home CTA becomes "Learn about Essentia" and points at "the presentation page of project", which is "the first page of documentation". Feedback **Home #6** puts the same link in the header.
- This slice: the `/docs/` route tree plus the authored presentation page it opens on. The buttons themselves land in T9 and T12.
- Out of scope here: `/keywords/` index pages, `/blog/`, `/decks/`, rewriting `/rules/` and `/philosophy/` (they stay exactly as they are), any header or home-page edit.
- Assumptions in force: docs pages are zero-JS. `docs/ADR/**` is not published.

## Requirements

- New authored file `docs/PRESENTATION.md` (content given verbatim below).
- `/docs/` renders `docs/PRESENTATION.md`; `/docs/<group-path>/` renders every other published doc.
- Every doc page shows a left rail listing all published docs grouped by `groupLabel`, with `aria-current="page"` on the active entry, and a right-hand chapter summary built from the doc's `headings`.
- `npm run links:check` passes — no dead internal link from any doc page.

## Inputs

- `website/src/layouts/BaseLayout.astro` — props `{ title, description, image?, accent?, theme? }`; wraps content in `<main id="main-content">`. Use it.
- `website/src/components/Markdown.astro` — `interface Props { value: string; class?: string }`, calls `renderSafeMarkdown(value, import.meta.env.BASE_URL)`. Use it to render `doc.body`.
- `website/src/components/ChapterSummary.astro` — `interface Props { items: Array<{ href: string; label: string }> }`, renders `.chapter-summary`. Use it for the right rail.
- `website/src/lib/catalog.ts` — exports `catalog` and `withBase(base, route)`.
- `website/src/pages/philosophy/index.astro` — reference for a prose page using `BaseLayout` and `page-shell`.
- `website/src/styles/global.css` — existing classes to reuse: `.page-shell`, `.chapter-summary`, `.page-toc`, `.nav-label`, `.primary-link`, `.secondary-link`. Add `.docs-shell`, `.docs-rail`, `.docs-body` here.
- **From Depends (T4):** `catalog.docs` is `CatalogDoc[]` where
  `CatalogDoc = { id: string; path: string; route: string; title: string; group: string; groupLabel: string; order: number; body: string; headings: Array<{ id: string; text: string; level: number }> }`.
  Routes are already absolute site paths (`/docs/rules/zones/`), the presentation doc's route is `/docs/`, `body` has the `# Title` line removed and its links already rewritten, and the array is sorted by group order then `order`. `catalog.schemaVersion` is `5`. `DOC_GROUPS` order is overview, design, rules, keywords, archetypes, project.

## TDD

1. **Red** — write `website/tests/unit/docs-routes.test.ts` first against a new pure helper `docsRailGroups(docs)` exported from `website/src/lib/docs.ts`. Fails: module missing.
2. **Green** — add `src/lib/docs.ts`, then the two page files and the rail component, then author `docs/PRESENTATION.md` until `npm run build` and `npm run links:check` pass.
3. **Refactor** — none.

Exact helper:

```ts
export interface DocsRailGroup { key: string; label: string; docs: Array<{ route: string; title: string }> }
/** Groups catalog docs for the rail, preserving catalog order, dropping empty groups. */
export function docsRailGroups(docs: CatalogDoc[]): DocsRailGroup[]
```

## Test plan

| Test | Input | Expect |
| ---- | ----- | ------ |
| `groups docs in catalog order` | catalog docs fixture with overview + rules entries | `[{key:'overview',…},{key:'rules',…}]` in that order |
| `drops empty groups` | fixture with no `project` doc | no group with `key === 'project'` |
| `keeps per-group document order` | rules fixture ordered RULES, DECK_BUILDING | titles come back in that order |
| `covers every doc exactly once` | real `catalog.docs` | flattened length equals `catalog.docs.length` |

Run: `cd website && npx vitest run tests/unit/docs-routes.test.ts`

## Content: `docs/PRESENTATION.md` (author verbatim)

```md
# Essentia

**YGO × MTG: Essentia** adapts Yu-Gi-Oh! cards into English Magic: The Gathering cards. The name says the goal: keep the essence of Yu-Gi-Oh! — the archetypes, the lines of play, the feel of a turn — inside Magic's card-game rules.

## The idea

A Yu-Gi-Oh! card and a Magic card answer different rules questions. Essentia rewrites each card so that a Magic player can resolve it with no extra rulebook, while a Yu-Gi-Oh! player still recognises what the card does and why the archetype wants it.

- ATK and DEF convert to power and toughness; level converts to mana cost; attribute converts to colour.
- Effects are rewritten in Magic templating, using a closed keyword vocabulary so nothing depends on a private ruling.
- The Extra Deck becomes the sideboard. Fusion, Synchro, Xyz, Link, and Ritual keep their summoning identity as named procedures.

## What is published here

Cards are authored in Magic Set Editor and released in packages. This site publishes only Alpha, Beta, and Release packages, never drafts, and shows the current version of each card together with its release history.

- [Archetypes](/) — the published card gallery, grouped by archetype.
- [Rules](/rules/) — how the cube plays.
- [Card updates](/updates/) — everything that changed, newest first.

## How to play

Essentia is a cube. Build 40 cards plus a 10-card Extra Deck, two copies maximum of any card, and proxy the renders on this site. Deck-building rules live in [Deck building](rules/DECK_BUILDING.md); the starter decklists shipped with the first package live in [Legend of the Alpha decklists](rules/DECKLISTS_ALPHA_0.1.md).

## Reading the documentation

- [Project context](CONTEXT.md) — sources of truth and change ownership.
- [Design](DESIGN.md) and [Conversion](design/CONVERSION.md) — how a Yu-Gi-Oh! card becomes a Magic card.
- [Rules](RULES.md) — zones, card types, summoning, templating.
- [Keywords](KEYWORDS.md) — the closed vocabulary printed in bold on cards.
- [Release lifecycle](RELEASES.md) — how a card moves from draft to release.

Everything created for this project is free to use, modify, and redistribute, including commercially. Yu-Gi-Oh! and Magic: The Gathering remain property of their respective owners.
```

The relative links above resolve through T4's `rewriteDocLinks`; the `/rules/` and `/updates/` links are absolute site routes and pass through unchanged.

## Impl steps

- [x] 1. Create `website/tests/unit/docs-routes.test.ts` with the four cases above. — Evidence: file created; red run showed `Cannot find module '../../src/lib/docs'`.
- [x] 2. Create `website/src/lib/docs.ts` exporting `DocsRailGroup` and `docsRailGroups`. — Evidence: `npx vitest run tests/unit/docs-routes.test.ts` → 4 passed.
- [x] 3. Author `docs/PRESENTATION.md` with the content block above, byte for byte. — Evidence: file created verbatim; `npm run content:check` reports `38 docs` (was 37).
- [x] 4. Add `- [Presentation](PRESENTATION.md)` as the first bullet of the `## Documentation map` list in `docs/CONTEXT.md`. — Evidence: edit applied; `npm run links:check` passes with this link resolved.
- [x] 5. Create `website/src/components/DocsRail.astro` with `interface Props { groups: DocsRailGroup[]; currentRoute: string; base: string }` rendering `<nav class="docs-rail" aria-label="Documentation">` — one `<p class="nav-label">{group.label}</p>` plus `<ul>` per group, `aria-current="page"` when `doc.route === currentRoute`. — Evidence: `grep -o 'aria-current="page">[^<]*' dist/docs/index.html` → `aria-current="page">Essentia`.
- [x] 6. Create `website/src/pages/docs/index.astro`: find `catalog.docs.find((doc) => doc.route === '/docs/')`, `fail` loudly with `throw new Error('docs: PRESENTATION.md is missing')` when absent, render `BaseLayout title="Essentia — the project" description="What Essentia is: Yu-Gi-Oh! identities rebuilt as Magic cards." accent="relic"`, then `<div class="docs-shell">` containing `<DocsRail …>`, `<article class="docs-body"><h1>{doc.title}</h1><Markdown value={doc.body} /></article>`, and `<ChapterSummary items={doc.headings.filter((h) => h.level === 2).map((h) => ({ href: `#${h.id}`, label: h.text }))} />`. — Evidence: `dist/docs/index.html` built with `<h1>Essentia</h1>` and chapter-summary links `#the-idea`, `#what-is-published-here`, `#how-to-play`, `#reading-the-documentation`.
- [x] 7. Create `website/src/pages/docs/[...path].astro` with `getStaticPaths()` returning every `catalog.docs` entry whose `route !== '/docs/'`, `params: { path: doc.route.slice('/docs/'.length).replace(/\/$/, '') }`, `props: { doc }`, and the same three-column body as step 6 with `title={`${doc.title} — Essentia`}` and `description={doc.body.replace(/[#*_`>|-]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 150)}`. — Evidence: `dist/docs/rules/zones/index.html` and 35 other doc routes built (148 total pages).
- [x] 8. Add to `website/src/styles/global.css`: `.docs-shell { display: grid; grid-template-columns: 16rem minmax(0, 1fr) 14rem; gap: var(--space-5); }` inside the existing desktop media block, collapsing to a single column under `44rem`; `.docs-rail ul { list-style: none; padding: 0; }`; `.docs-body h1 { margin-top: 0; }`; `.docs-body table { width: 100%; border-collapse: collapse; }`; `.docs-body th, .docs-body td { border-bottom: 1px solid var(--ruleline); padding: 0.4rem 0.6rem; text-align: left; }`; `.docs-body pre { overflow-x: auto; background: var(--blackfoil-raised); padding: var(--space-3); }`. — Evidence: rules added to `global.css` (default `.docs-shell` 3-col grid plus `.docs-shell { grid-template-columns: 1fr; }` inside the existing `@media (max-width: 44rem)` block); `npm run build` compiled CSS with no errors.
- [x] 9. Run `npm run content:check` then `npm run build`, and fix any `content: doc … unpublished link target` failure by correcting the link in the offending `docs/**/*.md`. — Evidence: `content: 1 releases, 3 sections, 50 current cards, 50 versions, 73 keywords, 38 docs`; `npm run build` exit 0, no unpublished-link-target failures.
- [x] 10. Run `npm run links:check`, `npm run format`, `npm run lint`, `npm run check`. — Evidence: `links: 148 pages clean`; format reported all files unchanged; lint clean (no output); `check` → `Result (87 files): - 0 errors`.

## Outputs

- Files touched: `docs/PRESENTATION.md` (new), `docs/CONTEXT.md`, `website/src/lib/docs.ts` (new), `website/src/components/DocsRail.astro` (new), `website/src/pages/docs/index.astro` (new), `website/src/pages/docs/[...path].astro` (new), `website/src/styles/global.css`, `website/tests/unit/docs-routes.test.ts` (new).
- Behaviour: `/docs/` and 36 further doc routes exist. Nothing links to them yet.
- No migration.

## Validation

- [x] `cd website && npx vitest run tests/unit/docs-routes.test.ts` — 4 passed. — Evidence: `Test Files 1 passed (1)`, `Tests 4 passed (4)`.
- [x] `cd website && npm run build` — exit 0; `dist/docs/index.html` and `dist/docs/rules/zones/index.html` exist. — Evidence: build completed `148 page(s) built`; both files confirmed present via `ls`.
- [x] `cd website && npm run links:check` — exit 0. — Evidence: `links: 148 pages clean`.
- [x] `cd website && npm run budgets:check` — exit 0. — Evidence: `budgets: 6 JS, 148 HTML, 250 images, 50 print masters (16 MiB) within limits`.
- [x] manual check: `node scripts/serve-dist.mjs`, open `/docs/`, confirm the presentation renders, the rail lists every group, and links inside a doc page navigate to other doc pages — Evidence (static equivalent, no local server/browser available in this environment): inspected built `dist/docs/index.html` directly — `<h1>Essentia</h1>` present, one `.docs-rail` block present, `aria-current="page">Essentia` on the active rail entry, and `dist/docs/rules/index.html` contains `href="/docs/rules/zones/"` resolving to the built `dist/docs/rules/zones/index.html`.
- [x] manual check: disable JavaScript, reload `/docs/rules/zones/`, page is fully readable — Evidence (static equivalent): `dist/docs/rules/zones/index.html` is fully server-rendered markup (`Markdown.astro` renders to static HTML via `set:html`); the only `<script>` tags present (2) belong to `BaseLayout`'s pre-existing `Navigation`/`SearchPalette` progressive-enhancement widgets (same as every other page, e.g. `/philosophy/`), not the doc body/rail/chapter-summary content, so the doc content itself requires no JavaScript.
- [x] `cd website && npm run ci` — exit 0. — Evidence: `format:check`, `lint`, `check` (0 errors), `test` (`Test Files 14 passed (14)`, `Tests 108 passed (108)`), and `build` all succeeded; process exit 0.
- [x] app functional — every pre-existing route unchanged. — Evidence: `dist/index.html`, `dist/rules/index.html`, `dist/philosophy/index.html`, `dist/updates/index.html` all present after build; `links:check` found 0 dead links across all 148 pages.
- [ ] commit msg draft: `feat(website): publish the docs corpus and the project presentation page` — pending: commit not yet made (publish step follows validation in the report).

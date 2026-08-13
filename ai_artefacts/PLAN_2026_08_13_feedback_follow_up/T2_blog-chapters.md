# T2: Blog chapter summary

**Plan:** `./ai_artefacts/PLAN_2026_08_13_feedback_follow_up.md`
**Depends:** T1
**Commit outcome:** `/blog/` + `/blog/{slug}/` show right-side H2 chapter links; clicks scroll matching headings below sticky header.

## Context (self-contained)

- Goal: Make blog chapters visible + clickable on right, matching docs behavior.
- This slice: Build-time heading metadata, catalog schema, both blog render paths, native fragment UX.
- Out of scope here: nested H3/H4 UI, active-section scrollspy, client JS, docs chapter redesign, header/data/backdrop changes.
- Assumptions in force: loader retains H2-H4 for schema parity; UI shows H2 only; empty/no-H2 post gets one-column shell without empty summary. `renderSafeMarkdown()` applies raw `headingSlug()` with no duplicate-ID de-dupe; loader mirrors that known limitation exactly. Heading regex matches existing `docs.mjs`, including no fenced-code exclusion; current blog corpus has no duplicate headings or fenced heading lines.
- Runtime fact: project requires Node ≥24 (`website/package.json`); Node 24 runs `.mjs` → `.ts` imports through native type stripping. Current `docs.mjs` already imports `headingSlug` from `../../src/lib/markdown.ts` under `npm run content`.
- Lifecycle fact: posts load directly from root `blog/*.md` in `orchestrator.mjs`; package snapshots store only post slugs in `contentPosts`, never post bodies/heading records. No locked-package migration/backfill.
- Worktree rule: planning docs are expected outputs; never edit/stage unrelated files.
- Repo-policy correction: `website/src/generated/catalog.ts` is ignored + never tracked. Generate + inspect it for validation; never force-add/stage it.
- Repair input: first Chromium run showed both hash updates succeed, but upper-bound assertion sampled during CSS smooth scroll (`~1614px`) because poll stopped at lower bound alone. Poll final offset until it is within full accepted range `0..32px`; do not disable smooth scrolling or weaken product behavior.

## Requirements

- `loadPosts()` returns `headings: Array<{ id; text; level }>` from Markdown `##`–`####` lines.
- IDs use `website/src/lib/markdown.ts::headingSlug()` — same fn renderer uses.
- `CatalogPost.headings` becomes required.
- Catalog schema bumps 11 → 12 in generator, TS type, generated output, schema test.
- Both `website/src/pages/blog/index.astro` + `[slug].astro` derive H2 `chapters`, reuse `ChapterSummary.astro`, render summary after article.
- Post/no-chapter fallback uses `reading-shell reading-shell--no-toc`; no empty right panel.
- Chapter href = `#${heading.id}`. No click handler/island.
- `.reading-body :is(h2, h3, h4)` gets `scroll-margin-top: calc(var(--header) + 1rem)`, fixing shared docs/blog native chapter targets.
- `/blog/` canonical/latest behavior stays unchanged.

## Inputs

- `website/scripts/content/blog.mjs::loadPosts()` + `parseFrontMatter()`.
- `website/scripts/content/docs.mjs` — reference extraction: `/^(#{2,4})\s+(.+)$/gm` + `headingSlug()`.
- `website/src/lib/markdown.ts::headingSlug()` + `renderSafeMarkdown()` IDs.
- `website/src/lib/catalog.ts::{CatalogPost,Catalog}`.
- `website/scripts/content/orchestrator.mjs::CATALOG_SCHEMA_VERSION`.
- `website/src/components/ChapterSummary.astro` — native anchor UI.
- `website/src/pages/blog/{index,[slug]}.astro`.
- `website/src/styles/global.css` — `.reading-shell`, `.chapter-summary`, `.page-toc`.
- `website/tests/unit/{blog,reading-shell,catalog}.test.ts`; `website/tests/e2e/blog.spec.ts`.
- `docs/ADR/proposed/0020-reading-surfaces-for-docs-and-blog.md` — proposed target doc amended during planning; this ticket owns it in implementation diff.
- **From Depends:** T1 commit `7aa29b171817dc7865d8417da953ea9bcacc0912` leaves `global.css` with compact utility padding `0.5rem 0.25rem` + `.hero-art { object-position: center 0%; }`; preserve both. `BaseLayout.astro` has Cards before Learn; preserve. T1 also repaired baseline Prettier/Navigation lint, synced owner-approved asset rights, passed `npm run ci` with 780 tests, and is pushed to `origin/plan/feedback-follow-up`.

## TDD

1. **Red** — write failing tests first:
   - `loadPosts > extracts renderer-matching H2-H4 metadata`: fixture body `## Opening`, `### Details`, `#### Deep note`, `## Open/locked lifecycle (v2)`; expect exact objects with ids `opening`, `details`, `deep-note`, `open-locked-lifecycle-v2` + levels 2/3/4/2. In this test, import `renderSafeMarkdown`; assert rendered HTML contains each extracted `id="..."` to own renderer-parity proof.
   - `docs and blog reading shell > both blog routes render ChapterSummary when chapters exist`: source assertions for import, exact H2 mapping, component render, conditional no-TOC fallback. Exact mapping uses `href: '#' + heading.id`; exact render: `<ChapterSummary items={chapters} />`.
   - Update `immutable publication graph > publishes open/locked packages, never drafts`: expect schema 12.
   - E2E tests `blog landing chapter links scroll to their sections` + `blog post chapter links scroll to their sections`: desktop summary right of article; click Archetypes; URL hash `#archetypes`; target top ≥ sticky header bottom + ≤32 px offset.
   - E2E `blog chapter summary moves above prose below 64rem`: summary box bottom ≤ article box top.
2. **Green** — min build metadata + shared component wiring + scroll margin. No new component/JS.
3. **Refactor** — share only existing `headingSlug()`; no speculative nested TOC helper.

## Test plan

| Test | Input | Expect |
| --- | --- | --- |
| Loader metadata | H2/H3/H4 fixture | exact IDs/text/levels, source order |
| Renderer parity | heading `## Open/locked lifecycle (v2)` | metadata id = rendered `open-locked-lifecycle-v2` |
| Catalog schema | generated catalog | schemaVersion 12; every post has headings |
| Desktop landing | `/blog/` @1280 | summary right of article; H2 links shown |
| Desktop canonical | `/blog/lota-alpha-v0-1-presentation/` @1280 | same summary behavior |
| Native click | `Archetypes` link | hash `#archetypes`; target below header |
| Responsive | post @900 | summary static above article |
| Empty/no H2 | fixture/page source | one-column shell; no empty summary |

## Impl steps

- [x] 1. Add Red loader/source/schema/e2e tests. Run focused Vitest; confirm missing `headings`, schema 11, absent `ChapterSummary` failures.
- [x] 2. In `blog.mjs`, import `headingSlug` from `../../src/lib/markdown.ts`; after body validation, extract `##`–`####` matches into `{ id: headingSlug(text), text, level }`; include `headings` in each post object.
- [x] 3. In `catalog.ts`, add required `CatalogPost.headings: Array<{ id: string; text: string; level: number }>`; change `Catalog.schemaVersion` literal 11 → 12.
- [x] 4. In `orchestrator.mjs`, change `CATALOG_SCHEMA_VERSION` 11 → 12; update `catalog.test.ts` expectation.
- [x] 5. In `blog/[slug].astro`, import `ChapterSummary`. Define `chapters = post.headings.filter((heading) => heading.level === 2).map((heading) => ({ href: '#' + heading.id, label: heading.text }))`; define `shellClass = chapters.length ? 'reading-shell' : 'reading-shell reading-shell--no-toc'`; use `class={shellClass}`; after `</article>`, render `{chapters.length > 0 && <ChapterSummary items={chapters} />}`.
- [x] 6. In `blog/index.astro`, use exact optional derivation `const chapters = post?.headings.filter((heading) => heading.level === 2).map((heading) => ({ href: '#' + heading.id, label: heading.text })) ?? []`; use same `shellClass` + conditional component. Retain empty-post copy + canonicalPath logic unchanged.
- [x] 7. Add `.reading-body :is(h2, h3, h4) { scroll-margin-top: calc(var(--header) + 1rem); }` beside reading-body heading rules so shared docs/blog fragment targets clear header.
- [x] 8. Update `reading-shell.test.ts` source assertions for both blog routes; never require summary on empty/no-H2 state.
- [x] 9. Run `npm run content`; inspect generated diff: schema 12 + post `headings` only. Never hand-edit `src/generated/catalog.ts`.
- [x] 10. Preserve planning amendment in ADR 0020. Update `docs/website-information-architecture.html` blog routes/pipeline: H2-H4 metadata, H2 ChapterSummary, native fragments, no-H2 fallback.
- [x] 11. Repair smooth-scroll E2E wait: poll target-to-header offset until both bounds hold (`0 <= offset <= 32`), then retain explicit final-range evidence. Criterion: both landing + post chapter scroll tests pass without disabling smooth scroll.
- [x] 12. Run focused unit/e2e, `content:check`, then `npm run ci`. Criterion: all four Validation commands exit 0.

## Outputs

- Touched: `website/scripts/content/blog.mjs`, `orchestrator.mjs`, `src/lib/catalog.ts`, `src/pages/blog/index.astro`, `src/pages/blog/[slug].astro`, `src/styles/global.css`, listed tests, generated catalog, `docs/ADR/proposed/0020-reading-surfaces-for-docs-and-blog.md`, `docs/website-information-architecture.html`.
- Public behavior: clickable blog H2 chapter summary; native hash navigation.
- Public API: `CatalogPost.headings` required; catalog schema 12.
- Migration/config: regenerate catalog via `npm run content`; no runtime migration/deps.

## Validation

- [x] `cd website && npx vitest run tests/unit/blog.test.ts tests/unit/reading-shell.test.ts tests/unit/catalog.test.ts tests/unit/markdown.test.ts` → exit 0.
- [x] `cd website && npm run content && npm run content:check` → both exit 0; second reports no stale generated output.
- [x] `cd website && npx playwright test tests/e2e/blog.spec.ts --project=chromium` → exit 0; both routes scroll target below header.
- [x] `cd website && npm run ci` → exit 0.
- [ ] Manual: desktop blog shows chapters right; 900 px shows them above prose; click several links, confirm correct sections.
- [x] App functional: `/blog/` still renders latest post + canonical; every `/blog/{slug}/` remains self-canonical.
- [x] Commit msg draft: `feat(blog): add anchored chapter summaries`

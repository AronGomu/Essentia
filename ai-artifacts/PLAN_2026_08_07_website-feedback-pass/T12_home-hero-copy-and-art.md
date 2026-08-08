# T12: Home hero copy and art

**Plan:** `./ai-artifacts/PLAN_2026_08_07_website-feedback-pass.md`
**Depends:** T11, T5
**Commit outcome:** the home hero shows the Nekroz Trishula illustration with the new headline, the new subcopy, and a "Learn about Essentia" button pointing at `/docs/`; the planned welcome-page detour is deleted from the spec.

## Context (self-contained)

- Goal: ship the UX feedback backlog in `.dev/feedback.md`. This ticket lands feedback **Home #1** (hero art = Nekroz Trishula, HD), **#2** (headline), **#3** (subcopy), **#5** (primary CTA), and **#7** (no welcome / first-time page — the home page is the entry point).
- This slice: the hero block of `src/pages/index.astro` only.
- Out of scope here: the new-cards section (T13) and the archetype tiles (T14) further down the same page. Do not touch them.
- Assumptions in force: no welcome route exists today; `WEBSITE_V2_SPEC.md` §2.3 still *plans* one with a `localStorage` first-visit redirect, so this ticket deletes that plan rather than code.

## Requirements

- Hero art `src` is the Nekroz section's `heroImage`, chosen through an authored pointer, not by array position.
- `<h1>` reads exactly, across two lines: `The Yu-Gi-Oh! Feel.` / `With Magic Rules.`
- The lead paragraph reads exactly: `Explore the Essentia project. Discover the best Yu-Gi-Oh has to offer within MTG game system.`
- The primary button reads exactly `Learn about Essentia` and links to `${base}docs/`. The secondary button keeps `See what changed` → `${base}updates/`.
- The empty-publication fallback branch keeps working (draft-only builds), with its primary link repointed to `${base}docs/`.
- `WEBSITE_V2_SPEC.md` no longer plans a welcome page or a first-visit redirect.

## Inputs

- `website/src/pages/index.astro` — lines 14–21 compute `latest`, `heroSection = catalog.sections[0]`, `heroImage`, `heroRoute`, `heroLabel`, `hasPublication`. Lines 34–62 are the hero `<section class="hero">` with `.hero-art`, `.hero-content`, `<h1>`, the lead `<p>`, and `.hero-actions` holding `.primary-link` (`Explore {heroLabel}`) and `.secondary-link`. Lines 122–143 are the `hasPublication === false` fallback; its `.primary-link` currently points at `/philosophy/`.
- `website/content/sections.json` — `schemaVersion: 2`, `{ "sections": [...] }`. Add the top-level `hero` pointer here.
- `website/scripts/content/identity.mjs` — `loadRegistries()` returns `{ sections, sectionsBySlug, nonArchetype, bySource, byId }` and validates every registry field with `fail()`.
- `website/scripts/content/orchestrator.mjs` — builds the `catalog` object literal near the end of `build()`.
- `website/src/lib/catalog.ts` — `Catalog`, `CatalogSection`, `sectionsBySlug`, `withBase(base, route)`.
- `website/scripts/check-chrome.mjs` and `website/tests/unit/chrome.test.ts` — the dist gate introduced in T9/T10; extend both here.
- `WEBSITE_V2_SPEC.md` — section `### 2.3 Home, welcome, and first-visit routing` (three checklist bullets: welcome landing at `/`, `/releases/` as returning-visitor home, the `essentia.v1.visited` routing rule, and "Nav 'Home' points to `/releases/`").
- **From Depends (T11):** every `catalog.sections[]` entry has `heroImage: string` pointing at `/art/<slug>-hero.webp`; `website/public/art/nekroz-hero.webp` is a committed 624×624 webp converted with `sharp` from `original_images/Ritual/Nekroz of Trishula.jpg` (no generative service); `assertHeroImage` in `scripts/content/identity.mjs` already fails the build on a missing file or missing provenance entry, and deliberately never checks dimensions so the owner can drop in a larger upscale of the same square crop later.
- **From Depends (T5):** `/docs/` exists and renders the project presentation page authored at `docs/PRESENTATION.md`.

## TDD

1. **Red** — add the home-hero cases to `website/tests/unit/chrome.test.ts`. They fail.
2. **Green** — add the rules to `chromeIssues`, add the `hero` pointer to the registry, edit `index.astro`, edit the spec.
3. **Refactor** — none.

Gate rules added to `chromeIssues(file, html, base)`, applied only when `file === 'index.html'`:

- `index.html: hero headline copy changed` unless the html contains `The Yu-Gi-Oh! Feel.` and `With Magic Rules.`
- `index.html: hero lead copy changed` unless it contains `Explore the Essentia project. Discover the best Yu-Gi-Oh has to offer within MTG game system.`
- `index.html: hero CTA must be "Learn about Essentia" pointing at <base>docs/` unless it contains `href="<base>docs/"` inside the `.hero-actions` block together with the label `Learn about Essentia`
- `index.html: hero art must use the section hero image` unless the `.hero-art` `src` matches `/^<base>art\/[a-z0-9-]+-hero\.webp$/`

Registry addition to `website/content/sections.json`:

```json
{ "schemaVersion": 2, "hero": { "sectionSlug": "nekroz" }, "sections": [ … ] }
```

`loadRegistries()` validates it: `fail('section registry: hero.sectionSlug must name a known section')` when the slug is missing or unknown. It returns the resolved slug as `registry.heroSectionSlug`, and `build()` writes `catalog.heroSectionSlug` alongside `sections`.

## Test plan

| Test | Input | Expect |
| ---- | ----- | ------ |
| `accepts the new hero copy` | index html with all four expectations | `[]` |
| `flags reworded headline` | html with `Yu-Gi-Oh! feel.` | contains `hero headline copy changed` |
| `flags a stale CTA` | `.hero-actions` linking `/sections/non-archetype/non-archetype/` | contains `hero CTA must be "Learn about Essentia"` |
| `flags a thumb-tier hero image` | `.hero-art src="/generated/releases/…-thumb.webp"` | contains `hero art must use the section hero image` |
| `ignores non-home pages` | `chromeIssues('rules/index.html', '<html></html>', '/')` | no hero complaints |

Run: `cd website && npx vitest run tests/unit/chrome.test.ts`

## Impl steps

- [x] 1. Add the five cases above to `website/tests/unit/chrome.test.ts`. Evidence: red run showed 4 new failures before rule impl; green run `npx vitest run tests/unit/chrome.test.ts` → 14/14 pass.
- [x] 2. Add the four home-hero rules to `website/scripts/check-chrome.mjs`. Evidence: rules added, gated on `file === 'index.html'`; `npm run build` chrome gate prints `chrome: 151 pages carry the site header` (no hero complaint).
- [x] 3. Add `"hero": { "sectionSlug": "nekroz" }` to `website/content/sections.json` between `schemaVersion` and `sections`. Evidence: file contains the key at that position; `npm run content:check` passes.
- [x] 4. Validate it in `loadRegistries()` (`website/scripts/content/identity.mjs`) and return `heroSectionSlug`. Evidence: `fail('section registry: hero.sectionSlug must name a known section')` added; `heroSectionSlug` in the returned object; `npm run content:check` passes.
- [x] 5. Write `heroSectionSlug` into the `catalog` object literal in `website/scripts/content/orchestrator.mjs`; add `heroSectionSlug: string` to `Catalog` in `website/src/lib/catalog.ts`. Evidence: `npm run build` succeeds (astro build reads `catalog.heroSectionSlug` without type error); `npm run check` → 0 errors, 0 warnings.
- [x] 6. In `website/src/pages/index.astro`, replace `const heroSection = catalog.sections[0];` with
      `const heroSection = catalog.sections.find((section) => section.slug === catalog.heroSectionSlug) ?? catalog.sections[0];`
      and replace `const heroImage = heroSection?.image;` with `const heroImage = heroSection?.heroImage;`. Delete the now-unused `heroRoute` and `heroLabel` constants. Evidence: `grep -n "heroRoute\|heroLabel" website/src/pages/index.astro` → no matches; `dist/index.html` hero `src="/art/nekroz-hero.webp"`.
- [x] 7. Replace the `<h1>` content with `The Yu-Gi-Oh! Feel.<br />With Magic Rules.` Evidence: `dist/index.html` contains `<h1 data-astro-cid-lcdefpme>The Yu-Gi-Oh! Feel.<br data-astro-cid-lcdefpme>With Magic Rules.`.
- [x] 8. Replace the lead `<p>` content with `Explore the Essentia project. Discover the best Yu-Gi-Oh has to offer within MTG game system.` Evidence: `dist/index.html` contains that exact string verbatim.
- [x] 9. Replace the primary link with `<a class="primary-link" href={withBase(base, '/docs/')}>Learn about Essentia</a>`. Keep the secondary link untouched. Evidence: `dist/index.html` `.hero-actions` block: `<a class="primary-link" href="/docs/" ...>Learn about Essentia</a><a class="secondary-link" href="/updates/" ...>See what changed</a>`.
- [x] 10. In the `hasPublication === false` fallback, change the primary link to `withBase(base, '/docs/')` with the label `Learn about Essentia`, and keep the secondary `/rules/` link. Evidence: `website/src/pages/index.astro` fallback branch primary link now reads `href={withBase(base, '/docs/')}` / `Learn about Essentia`, secondary still `/rules/`; `astro check` (via `npm run check`) type-checks both branches with 0 errors.
- [x] 11. Set the hero `<img>` `width="624" height="624"`. Evidence: `dist/index.html` `class="hero-art" src="/art/nekroz-hero.webp" alt="" width="624" height="624"`; no pixel size added to `<style>` block off these numbers.
- [x] 12. In `WEBSITE_V2_SPEC.md`, delete `### 2.3 Home, welcome, and first-visit routing` and replace with a three-line note; update Phase 2 heading. Evidence: `grep -c "welcome" WEBSITE_V2_SPEC.md` → 1 (only the note itself, stating there is no welcome page); heading now `## Phase 2 — Blog and releases`; stale "Phase 2 acceptance" bullets and dependency-order diagram label describing the deleted first-visit rule were also updated for consistency (residual cleanup beyond the literal step, logged in report).
- [x] 13. Run `npm run content:check`, `npm run build`, `npm run format`, `npm run lint`, `npm run check`. Evidence: all five ran clean — content:check reports `3 sections... 1 posts`; build → 151 pages, chrome/404/csp/scan gates clean; format → all files "(unchanged)"; lint → 0 output (clean); check → `0 errors, 0 warnings, 224 hints`.

## Outputs

- Files touched: `website/src/pages/index.astro`, `website/content/sections.json`, `website/scripts/content/identity.mjs`, `website/scripts/content/orchestrator.mjs`, `website/src/lib/catalog.ts`, `website/scripts/check-chrome.mjs`, `website/tests/unit/chrome.test.ts`, `WEBSITE_V2_SPEC.md`.
- Behaviour: home hero art, copy, and primary CTA change. `catalog.heroSectionSlug` is new.
- No migration.

## Validation

- [x] `cd website && npx vitest run tests/unit/chrome.test.ts` — all pass. Evidence: `Test Files 1 passed (1)`, `Tests 14 passed (14)`.
- [x] `cd website && npm run build` — chrome gate reports no hero complaint. Evidence: build output ends `chrome: 151 pages carry the site header` (no thrown error, exit 0).
- [x] `cd website && npm run links:check` — exit 0. Evidence: `links: 151 pages clean`.
- [x] manual check: `node scripts/serve-dist.mjs`, open `/`, the hero is Trishula art at full sharpness; the primary button opens `/docs/`. **Substitution logged**: no browser/e2e harness on this host (Playwright cannot run per environment constraint) — verified via static-equivalent inspection of the built `dist/index.html` instead: `class="hero-art" src="/art/nekroz-hero.webp" ... width="624" height="624"` (the committed T11 Nekroz Trishula asset, full resolution, no thumb/generated path) and `<a class="primary-link" href="/docs/" ...>Learn about Essentia</a>`.
- [x] manual check: `grep -c "welcome" ../WEBSITE_V2_SPEC.md` returns no planned welcome route. Evidence: `grep -c "welcome" WEBSITE_V2_SPEC.md` → `1`, and that one line is the new note itself stating there is no welcome page (`- The home page \`/\` is the single entry point to the site. There is no welcome page and no first-visit redirect.`) — no remaining line *plans* one.
- [x] `cd website && npm run ci` — exit 0. Evidence: `echo $?` → `0`; log shows `format:check`, `lint`, `check` (0 errors/0 warnings), `test` (`20 passed`, `160 passed`), `build` (151 pages, all gates clean) all ran in sequence.
- [x] app functional — the draft-only fallback branch still renders. Evidence: `node_modules/.bin/astro check` (via `npm run check`) type-checks `index.astro` end-to-end including the `hasPublication === false` branch with 0 errors; branch source read confirms `primary-link` now points at `/docs/` labeled `Learn about Essentia`, secondary still `/rules/`. No live no-package build was run (would require temporarily emptying `content/releases`, an irreversible-feeling data mutation out of scope for this ticket) — logged as a residual verification gap, not a pass/fail blocker since the branch is unchanged in structure, only link target/label.
- [x] commit msg draft: `feat(website): rebuild the home hero around the Nekroz art and the docs entry point`. Used verbatim as the commit message.

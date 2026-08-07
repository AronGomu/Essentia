# T12: Home hero copy and art

**Plan:** `./ai_artefacts/PLAN_2026_08_07_website-feedback-pass.md`
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

- [ ] 1. Add the five cases above to `website/tests/unit/chrome.test.ts`.
- [ ] 2. Add the four home-hero rules to `website/scripts/check-chrome.mjs`.
- [ ] 3. Add `"hero": { "sectionSlug": "nekroz" }` to `website/content/sections.json` between `schemaVersion` and `sections`.
- [ ] 4. Validate it in `loadRegistries()` (`website/scripts/content/identity.mjs`) and return `heroSectionSlug`.
- [ ] 5. Write `heroSectionSlug` into the `catalog` object literal in `website/scripts/content/orchestrator.mjs`; add `heroSectionSlug: string` to `Catalog` in `website/src/lib/catalog.ts`.
- [ ] 6. In `website/src/pages/index.astro`, replace `const heroSection = catalog.sections[0];` with
      `const heroSection = catalog.sections.find((section) => section.slug === catalog.heroSectionSlug) ?? catalog.sections[0];`
      and replace `const heroImage = heroSection?.image;` with `const heroImage = heroSection?.heroImage;`. Delete the now-unused `heroRoute` and `heroLabel` constants.
- [ ] 7. Replace the `<h1>` content with `The Yu-Gi-Oh! Feel.<br />With Magic Rules.`
- [ ] 8. Replace the lead `<p>` content with `Explore the Essentia project. Discover the best Yu-Gi-Oh has to offer within MTG game system.`
- [ ] 9. Replace the primary link with `<a class="primary-link" href={withBase(base, '/docs/')}>Learn about Essentia</a>`. Keep the secondary link untouched.
- [ ] 10. In the `hasPublication === false` fallback, change the primary link to `withBase(base, '/docs/')` with the label `Learn about Essentia`, and keep the secondary `/rules/` link.
- [ ] 11. Set the hero `<img>` `width="624" height="624"` — the committed asset is a square crop, so these carry the 1:1 aspect ratio and no layout shift is introduced. Do not hard-code a pixel size in CSS off these numbers; a later higher-resolution replacement keeps the same ratio.
- [ ] 12. In `WEBSITE_V2_SPEC.md`, delete the whole `### 2.3 Home, welcome, and first-visit routing` subsection and replace it with a three-line note: the home page `/` is the single entry point, there is no welcome page and no first-visit redirect, and the header links to `/docs/`, `/blog/`, `/decks/`. Update the Phase 2 heading `## Phase 2 — Blog, welcome, releases` to `## Phase 2 — Blog and releases`.
- [ ] 13. Run `npm run content:check`, `npm run build`, `npm run format`, `npm run lint`, `npm run check`.

## Outputs

- Files touched: `website/src/pages/index.astro`, `website/content/sections.json`, `website/scripts/content/identity.mjs`, `website/scripts/content/orchestrator.mjs`, `website/src/lib/catalog.ts`, `website/scripts/check-chrome.mjs`, `website/tests/unit/chrome.test.ts`, `WEBSITE_V2_SPEC.md`.
- Behaviour: home hero art, copy, and primary CTA change. `catalog.heroSectionSlug` is new.
- No migration.

## Validation

- [ ] `cd website && npx vitest run tests/unit/chrome.test.ts` — all pass
- [ ] `cd website && npm run build` — chrome gate reports no hero complaint
- [ ] `cd website && npm run links:check` — exit 0
- [ ] manual check: `node scripts/serve-dist.mjs`, open `/`, the hero is Trishula art at full sharpness; the primary button opens `/docs/`
- [ ] manual check: `grep -c "welcome" ../WEBSITE_V2_SPEC.md` returns no planned welcome route
- [ ] `cd website && npm run ci` — exit 0
- [ ] app functional — the draft-only fallback branch still renders (verify by temporarily pointing `OUT_DIR` at a build with no published package, or by reading the branch)
- [ ] commit msg draft: `feat(website): rebuild the home hero around the Nekroz art and the docs entry point`

# T16: Archetype page refresh

**Plan:** `./ai_artefacts/PLAN_2026_08_07_website-feedback-pass.md`
**Depends:** T10, T11, T13, T14, T15
**Commit outcome:** an archetype page shows its full iconic illustration, one alphabetical card grid with NEW badges instead of per-day sections, and a header date that always matches the release lock-in.

## Context (self-contained)

- Goal: ship the UX feedback backlog in `.dev/feedback.md`. This ticket lands **Archetype #1** (HD illustration, same image as the home tile), **#2** ("sort only by alphabetical order, add new badge for cards released last release. Remove dates and dates sections"), and **#5** ("I found incoherence in Nekroz page. Latest update date is older than first date section date shown. Make sure latest date match set version lock-in").
- This slice: `CardGallery.astro` and the two pages that use it, plus the archetype hero.
- Out of scope here: the card detail page (T17, T19, T21) and the home page.
- Assumptions in force: the incoherence is caused by `CardGallery` grouping on the MSE `card.modified` timestamp (2026-08-03) while the hero prints `section.latestModified`, which is the package release date (2026-08-01). Removing date grouping removes the contradiction; a unit test pins the remaining date to the release lock-in.

## Requirements

- `CardGallery` renders one flat `.card-grid`, sorted by `name` with `localeCompare`, no `<section class="day-group">` and no date headings.
- Each gallery card shows a `New` badge when it came from the newest release package.
- The archetype hero image is `section.heroImage` — the same asset the home tile uses.
- The archetype hero stat reads `Latest release <date>` where the date is the newest `releasedOn` among the section's cards, and a unit test asserts that value equals the newest release package's `releasedOn` for every section.
- The breadcrumb is the header one; no in-page breadcrumb paragraph remains.

## Inputs

- `website/src/components/CardGallery.astro` — `Props { cards: GalleryCard[]; base: string }`. It computes `const date = (value) => value.slice(0, 10)`, `groups = Object.entries(Object.groupBy(cards, (card) => date(card.modified))).sort(([a],[b]) => b.localeCompare(a))`, and `ranks`, then renders one `<section class="day-group">` per day with an `<h2>` date heading and a `.card-grid` of `<a class="gallery-card" data-card-preview=…>` holding `CardPicture` and `.card-caption` (`<strong>{card.name}</strong>`, `<span>{card.superType}</span>`, `{card.support && <small>Support card</small>}`).
- `website/src/lib/catalog.ts` — `GalleryCard = Pick<CatalogCard, 'id'|'name'|'route'|'superType'|'subType'|'rarity'|'ruleTextPlain'|'modified'|'support'|'images'|'width'|'height'>`; `toGalleryCard(card)` builds it. `GalleryCard` has **no** `packageId` today — this ticket adds `'packageId'` and `'releasedOn'` to the `Pick` list and to `toGalleryCard`.
- `website/src/pages/archetypes/[slug].astro` — 60 lines. `getStaticPaths()` filters `catalog.sections` to `kind === 'archetype'`; `cards = section.cardIds.map((id) => toGalleryCard(cardsById.get(id)!))`; the `.catalog-hero` block holds the breadcrumb paragraph (removed in T10), `<h1>{section.label}</h1>`, `{section.intro}`, `.catalog-stats` with `{section.count} published cards` and `Latest update {formatDate(section.latestModified)}`, then `.catalog-hero-art` with `<img src={withBase(base, section.image)} width="1200" height="800" fetchpriority="high">`, then `<CardGallery {cards} {base} />`.
- `website/src/pages/sections/non-archetype/[slug].astro` — the same shape for the non-archetype section; apply the identical changes.
- `website/src/styles/global.css` — `.day-group` (~line 683) and `.day-group > h2` become dead; `.card-grid` and `.gallery-card` stay. `.catalog-hero-art img` at ~line 660.
- `website/scripts/check-chrome.mjs`, `website/tests/unit/chrome.test.ts` — the dist gate; extend both.
- **From Depends (T10):** `BaseLayout` accepts a `breadcrumb` prop and renders `<nav class="breadcrumb">` in the header; the archetype page already passes `[{ label: 'Archive', href: base }, { label: 'Archetypes' }, { label: section.label }]` and its in-page paragraph is already deleted.
- **From Depends (T11):** every `catalog.sections[]` entry has `heroImage: string` = `/art/<slug>-hero.webp`, a committed 624×624 webp converted with `sharp` from the section's original iconic illustration (`original_images/<type>/<Card Name>.jpg`), no generative service involved. Nothing validates its dimensions, so a later higher-resolution replacement of the same square crop needs no code change.
- **From Depends (T13):** `website/src/lib/catalog.ts` exports `latestRelease: ReleasePackage | null` and `isLatestRelease(card: { packageId: string }): boolean`.
- **From Depends (T14):** `website/src/styles/global.css` already declares `.tile-badge` — an absolutely positioned pill at `top: 0.9rem; right: 0.9rem; z-index: 2` in `var(--accent)` on `var(--blackfoil)` reading `New` — and `website/src/lib/catalog.ts` exports `sectionHasNewCards(section)`.
- **From Depends (T15):** archetype sections now contain only printed-name members plus explicitly linked support cards; unlinked support cards moved to the non-archetype section. `section.count` and `section.cardIds` already reflect that.

## TDD

1. **Red** — write `website/tests/unit/section-dates.test.ts` and add the gallery cases to `website/tests/unit/chrome.test.ts`. Both fail.
2. **Green** — extend `GalleryCard`, rewrite `CardGallery`, update the two pages, add the gate rules.
3. **Refactor** — none.

Gate rules added to `chromeIssues(file, html, base)` for any `file` matching `/^(archetypes|sections)\//`:

- `${file}: gallery must not group by date` when the html contains `class="day-group"`
- `${file}: hero art must use the section hero image` unless the `.catalog-hero-art` block's `img src` matches `/^<base>art\/[a-z0-9-]+-hero\.webp$/`

## Test plan

| Test | Input | Expect |
| ---- | ----- | ------ |
| `section date equals the release lock-in` | for every `catalog.sections` entry, `section.latestModified` | equals `max(card.releasedOn)` over `section.cardIds`, and equals a `releasedOn` present in `catalog.releases` |
| `no section date precedes a card modification claim` | for every section, `section.latestModified` | is not less than any published `card.releasedOn` in that section |
| `gallery card carries its package` | `toGalleryCard(catalog.cards[0])` | has `packageId` and `releasedOn` |
| `accepts a flat gallery` | archetype html without `day-group`, hero art path correct | `[]` |
| `flags a date-grouped gallery` | html containing `class="day-group"` | contains `gallery must not group by date` |
| `flags a thumb-tier hero` | `.catalog-hero-art img src="/generated/…-thumb.webp"` | contains `hero art must use the section hero image` |

Run: `cd website && npx vitest run tests/unit/section-dates.test.ts tests/unit/chrome.test.ts`

## Impl steps

- [x] 1. Create `website/tests/unit/section-dates.test.ts` with the first three cases; add the last three to `website/tests/unit/chrome.test.ts`.
      _Criterion:_ both files exist with the six named cases and `npx vitest run tests/unit/section-dates.test.ts tests/unit/chrome.test.ts` reports failures for the not-yet-implemented cases (red).
      _Evidence:_ red run — `Test Files 2 failed (2) / Tests 4 failed | 24 passed (28)`; failures were `gallery card carries its package`, `flags a date-grouped gallery`, `flags a thumb-tier hero`, `applies the gallery rules to the non-archetype section page`.
- [x] 2. Add `'packageId'` and `'releasedOn'` to the `GalleryCard` `Pick` list in `website/src/lib/catalog.ts` and to the destructuring plus the return object of `toGalleryCard`.
      _Criterion:_ the `gallery card carries its package` case passes and `npm run check` reports no type error.
      _Evidence:_ `section dates > gallery card carries its package` passes; `astro check` → `Result (104 files): 0 errors, 0 warnings`.
- [x] 3. Rewrite `website/src/components/CardGallery.astro`:
  - [x] 3a. frontmatter becomes `const sorted = [...cards].sort((a, b) => a.name.localeCompare(b.name));`
        _Criterion:_ the file contains that exact line.
        _Evidence:_ line 15 of `website/src/components/CardGallery.astro`; the 15 Nekroz captions in `dist/archetypes/nekroz/index.html` come out in DOM order `Brionac → Catastor → … → Valkyrus`, byte-identical to `sort` of that list.
  - [x] 3b. body becomes a single `<div class="card-grid">` mapping `sorted`, each entry keeping the existing `<a class="gallery-card" href data-card-preview>` + `CardPicture` + `.card-caption` markup, with `eager={index < 8}`, and adding `{isLatestRelease(card) && <span class="tile-badge">New</span>}` as the anchor's first child.
        _Criterion:_ built `dist/archetypes/nekroz/index.html` holds exactly one `<div class="card-grid">` and one `tile-badge` per card.
        _Evidence:_ nekroz 1 card-grid / 15 gallery-card / 15 tile-badge; burning-abyss 1 / 13 / 13; non-archetype 1 / 22 / 22.
  - [x] 3c. Delete `date`, `groups`, `ranks`, and the `Object.groupBy` import usage.
        _Criterion:_ `grep -n "day-group\|Object.groupBy\|ranks" src/components/CardGallery.astro` returns nothing.
        _Evidence:_ grep returns no match; `day-group` count in all three built pages is 0.
- [x] 4. In `website/src/pages/archetypes/[slug].astro`, change the hero `<img>` to `src={withBase(base, section.heroImage)}` with `width="624" height="624"` (the committed asset is a square crop), and change the stat label from `Latest update` to `Latest release`.
      _Criterion:_ built `dist/archetypes/nekroz/index.html` contains `<img src="/art/nekroz-hero.webp"` with `width="624" height="624"` inside `.catalog-hero-art`, and the string `Latest release`.
      _Evidence:_ `<div class="catalog-hero-art"><img src="/art/nekroz-hero.webp" alt="Nekroz iconic card artwork" width="624" height="624" fetchpriority="high">` and `Latest release <strong>August 1, 2026</strong>`; same for burning-abyss with `/art/burning-abyss-hero.webp`.
- [x] 5. Apply the identical hero-image and label change to `website/src/pages/sections/non-archetype/[slug].astro`.
      _Criterion:_ built `dist/sections/non-archetype/non-archetype/index.html` shows the same two properties.
      _Evidence:_ `<img src="/art/non-archetype-hero.webp" … width="624" height="624">` and `Latest release <strong>August 1, 2026</strong>`.
- [x] 6. Add the two gate rules to `website/scripts/check-chrome.mjs`.
      _Criterion:_ the three chrome gate cases pass and `node scripts/check-chrome.mjs` exits 0 over the real `dist`.
      _Evidence:_ `chrome: 151 pages carry the site header` (exit 0); mutation probe on the real built HTML — regrouped nekroz → `["archetypes/nekroz/index.html: gallery must not group by date"]`, thumb hero → `["archetypes/nekroz/index.html: hero art must use the section hero image"]`, regrouped non-archetype → `["sections/non-archetype/non-archetype/index.html: gallery must not group by date"]`, unmutated pages → `[]`.
- [x] 7. In `website/src/styles/global.css`, delete the `.day-group` and `.day-group > h2` rules; add `.gallery-card { position: relative; }` so `.tile-badge` (added in T14) anchors correctly, and confirm `.tile-badge`'s `z-index: 2` sits above the card image.
      _Criterion:_ `grep -c day-group src/styles/global.css` is 0, and the compiled `dist/_astro/*.css` contains `.gallery-card{position:relative` plus `.tile-badge{position:absolute…z-index:2`.
      _Evidence:_ `grep -c day-group src/styles/global.css` → 0, and 0 in the compiled CSS too. Compiled: `.gallery-card{gap:.75rem;width:100%;max-width:25rem;text-decoration:none;display:grid;position:relative}` and `.tile-badge{z-index:2;…;position:absolute;top:.9rem;right:.9rem}`. `.gallery-card img` declares no `z-index`, so the badge's `z-index: 2` on a positioned ancestor paints above it.
- [x] 8. Grep for other `CardGallery` consumers (`grep -rn "CardGallery" website/src`) and confirm each still renders correctly after the prop-shape change.
      _Criterion:_ every consumer listed by the grep is covered by an inspected built page.
      _Evidence:_ the grep lists exactly two consumers — `src/pages/archetypes/[slug].astro` and `src/pages/sections/non-archetype/[slug].astro`. Both build clean and both were inspected in `dist` (3 pages total: nekroz, burning-abyss, non-archetype). No other consumer exists.
- [x] 9. Run `npm run build`, `npm run links:check`, `npm run format`, `npm run lint`, `npm run check`.
      _Criterion:_ each command exits 0.
      _Evidence:_ `build` → `151 page(s) built` + `csp` + `dist scan: clean` + `404: redirects to site root` + `chrome: 151 pages carry the site header`; `links:check` → `links: 151 pages clean` (exit 0); `format` → all files formatted (it reflowed one line in `tests/unit/chrome.test.ts`); `lint` → eslint exit 0; `check` → `0 errors, 0 warnings`. `budgets:check` also run → `budgets: 10 JS, 151 HTML, 255 images, 50 print masters (16 MiB) within limits`.

## Outputs

- Files touched: `website/src/components/CardGallery.astro`, `website/src/lib/catalog.ts`, `website/src/pages/archetypes/[slug].astro`, `website/src/pages/sections/non-archetype/[slug].astro`, `website/src/styles/global.css`, `website/scripts/check-chrome.mjs`, `website/tests/unit/section-dates.test.ts` (new), `website/tests/unit/chrome.test.ts`.
- Behaviour: galleries are one alphabetical grid with NEW badges; archetype heroes use the committed hero art; the date shown is the release lock-in.
- Migration: `GalleryCard` gains two fields (additive, type-level only).

## Validation

- [x] `cd website && npx vitest run tests/unit/section-dates.test.ts tests/unit/chrome.test.ts` — all pass
      _Evidence:_ `Test Files 2 passed (2) / Tests 28 passed (28)`. Red run before the fix was `2 failed / 4 failed | 24 passed`.
- [x] `cd website && npm run build && npm run links:check` — exit 0
      _Evidence:_ `[build] 151 page(s) built in 629ms` → `chrome: 151 pages carry the site header`; `links: 151 pages clean`. Both exit 0.
- [x] manual check: `node scripts/serve-dist.mjs`, open `/archetypes/nekroz/` — one alphabetical grid, no date headings, the header reads `Latest release August 1, 2026`, and no date anywhere on the page is later than it
      _Substituted:_ no browser / Playwright harness on this host, so this was satisfied statically against the built `dist/archetypes/nekroz/index.html` rather than a served page.
      _Evidence:_ exactly one `<div class="card-grid">`, zero occurrences of `day-group`, 15 `.gallery-card` anchors whose captions are in strict alphabetical order (`Nekroz - Brionac` … `Nekroz - Valkyrus`, verified byte-equal to `sort`); the header prints `Latest release <strong>August 1, 2026</strong>`; and a sweep of every rendered date on the page (`grep -oE '(January|…|December) [0-9]{1,2}, [0-9]{4}'` plus an ISO-date sweep) returns the single value `August 1, 2026` and no ISO dates at all. The old incoherence — day headings built from `card.modified` (2026-08-03) sitting above a `2026-08-01` header — is structurally gone because the grouping is gone.
- [x] manual check: the Nekroz hero image is the same illustration as the Nekroz tile on `/`
      _Substituted:_ static asset-path comparison instead of a visual browser check.
      _Evidence:_ the home tile for `/archetypes/nekroz/` in `dist/index.html` uses `src="/art/nekroz-hero.webp"`; the archetype hero in `dist/archetypes/nekroz/index.html` uses `src="/art/nekroz-hero.webp"`. Identical asset, so identical illustration.
- [x] manual check: every card from LOTA-0001 carries a `New` badge
      _Substituted:_ counted in the built HTML instead of in a browser.
      _Evidence:_ `catalog.releases` holds exactly one package, `alpha-LOTA-0001-Alpha-0-1` (`releasedOn 2026-08-01`), so every published card belongs to it. Badge count equals gallery-card count on every gallery page: nekroz 15/15, burning-abyss 13/13, non-archetype 22/22 — 50 of 50 cards badged, matching the home page's `View all 50 new cards`.
- [x] `cd website && npm run ci` — exit 0
      _Evidence:_ `CI_EXIT=0`; `Test Files 23 passed (23) / Tests 188 passed (188)`; `Result (104 files): 0 errors, 0 warnings`; `[build] 151 page(s) built`.
- [x] app functional — the non-archetype section page renders with the same treatment
      _Evidence:_ `dist/sections/non-archetype/non-archetype/index.html` — 1 card-grid, 0 day-group, 22 gallery cards each with a `tile-badge`, hero `<img src="/art/non-archetype-hero.webp" width="624" height="624">`, header `Latest release <strong>August 1, 2026</strong>`, one `<nav class="breadcrumb">`. `chromeIssues` on the real file returns `[]`.
- [x] commit msg draft: `feat(website): flatten the archetype gallery and fix its release date`
      _Evidence:_ used verbatim as the commit subject — see the SHA in the report.

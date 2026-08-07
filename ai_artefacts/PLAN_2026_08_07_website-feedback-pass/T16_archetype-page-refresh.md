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

- [ ] 1. Create `website/tests/unit/section-dates.test.ts` with the first three cases; add the last three to `website/tests/unit/chrome.test.ts`.
- [ ] 2. Add `'packageId'` and `'releasedOn'` to the `GalleryCard` `Pick` list in `website/src/lib/catalog.ts` and to the destructuring plus the return object of `toGalleryCard`.
- [ ] 3. Rewrite `website/src/components/CardGallery.astro`:
      frontmatter becomes `const sorted = [...cards].sort((a, b) => a.name.localeCompare(b.name));`
      body becomes a single `<div class="card-grid">` mapping `sorted`, each entry keeping the existing `<a class="gallery-card" href data-card-preview>` + `CardPicture` + `.card-caption` markup, with `eager={index < 8}`, and adding `{isLatestRelease(card) && <span class="tile-badge">New</span>}` as the anchor's first child.
      Delete `date`, `groups`, `ranks`, and the `Object.groupBy` import usage.
- [ ] 4. In `website/src/pages/archetypes/[slug].astro`, change the hero `<img>` to `src={withBase(base, section.heroImage)}` with `width="624" height="624"` (the committed asset is a square crop), and change the stat label from `Latest update` to `Latest release`.
- [ ] 5. Apply the identical hero-image and label change to `website/src/pages/sections/non-archetype/[slug].astro`.
- [ ] 6. Add the two gate rules to `website/scripts/check-chrome.mjs`.
- [ ] 7. In `website/src/styles/global.css`, delete the `.day-group` and `.day-group > h2` rules; add `.gallery-card { position: relative; }` so `.tile-badge` (added in T14) anchors correctly, and confirm `.tile-badge`'s `z-index: 2` sits above the card image.
- [ ] 8. Grep for other `CardGallery` consumers (`grep -rn "CardGallery" website/src`) and confirm each still renders correctly after the prop-shape change.
- [ ] 9. Run `npm run build`, `npm run links:check`, `npm run format`, `npm run lint`, `npm run check`.

## Outputs

- Files touched: `website/src/components/CardGallery.astro`, `website/src/lib/catalog.ts`, `website/src/pages/archetypes/[slug].astro`, `website/src/pages/sections/non-archetype/[slug].astro`, `website/src/styles/global.css`, `website/scripts/check-chrome.mjs`, `website/tests/unit/section-dates.test.ts` (new), `website/tests/unit/chrome.test.ts`.
- Behaviour: galleries are one alphabetical grid with NEW badges; archetype heroes use the committed hero art; the date shown is the release lock-in.
- Migration: `GalleryCard` gains two fields (additive, type-level only).

## Validation

- [ ] `cd website && npx vitest run tests/unit/section-dates.test.ts tests/unit/chrome.test.ts` — all pass
- [ ] `cd website && npm run build && npm run links:check` — exit 0
- [ ] manual check: `node scripts/serve-dist.mjs`, open `/archetypes/nekroz/` — one alphabetical grid, no date headings, the header reads `Latest release August 1, 2026`, and no date anywhere on the page is later than it
- [ ] manual check: the Nekroz hero image is the same illustration as the Nekroz tile on `/`
- [ ] manual check: every card from LOTA-0001 carries a `New` badge
- [ ] `cd website && npm run ci` — exit 0
- [ ] app functional — the non-archetype section page renders with the same treatment
- [ ] commit msg draft: `feat(website): flatten the archetype gallery and fix its release date`

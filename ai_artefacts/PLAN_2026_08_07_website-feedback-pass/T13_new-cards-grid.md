# T13: Home new-cards grid

**Plan:** `./ai_artefacts/PLAN_2026_08_07_website-feedback-pass.md`
**Depends:** T1
**Commit outcome:** the home "New cards" section shows three rows of five cards instead of a carousel, with a "View all N new cards" link underneath, and the catalog exposes a reusable "came from the latest release" helper.

## Context (self-contained)

- Goal: ship the UX feedback backlog in `.dev/feedback.md`. Feedback **Home #8**: "In New cards section, replace carousel by 3 row of 5 cards with 'View all X new cards' link under."
- This slice: the new-cards block of `src/pages/index.astro`, its CSS, and a shared `isLatestRelease` helper that T14 and T16 reuse for their NEW badges.
- Out of scope here: the hero (T12) and the archetype tiles (T14) on the same page. Do not touch them.
- Assumptions in force: "new cards" keeps its current meaning — catalog updates whose `status` is `'new'` (a card whose only version is its first). Today that is all 50 published cards.

## Requirements

- Exactly 15 cards render in the section, in the catalog's existing update order.
- The grid is five columns at ≥ 70rem, three at ≥ 40rem, two below; each row keeps five items on desktop, so three rows.
- Under the grid: one link reading `View all {n} new cards` where `{n}` is the total count of `status === 'new'` updates, pointing at `${base}updates/`.
- The old `View all updates` link in the section heading is removed (one link, under the grid, per the feedback).
- `website/src/lib/catalog.ts` exports `latestRelease` and `isLatestRelease(card)`.

## Inputs

- `website/src/pages/index.astro` — lines 14–16 compute `const latest = catalog.updates.filter((update) => update.status === 'new').map((update) => ({ ...update, card: cardsById.get(update.cardId)! }));`. Lines 64–91 render `<section class="page-shell" aria-labelledby="new-cards-heading">` with a `.section-heading` block (h2 `New cards`, p `Latest cards from alpha/beta/release packages.`, and an `<a href={withBase(base, '/updates/')}>View all updates</a>`), then `<ul class="update-list new-card-carousel">` of `<li class="update-item">` each holding `<a data-card-preview=…><CardPicture card={card} eager={index < 3} /><span class="update-meta">…<StatusBadge status={status} /></span></a>`.
- `website/src/styles/global.css` — `.update-list` at line ~588 is `grid-template-columns: repeat(auto-fit, minmax(min(100%, 18rem), 1fr))`; `.update-item a` follows. `.new-card-carousel` has no rule of its own today.
- `website/src/components/CardPicture.astro` — `Props { card: { images: CardImages }; eager?: boolean; sizes?: string; class?: string; alt?: string; tier?: 'thumb' | 'display' }`.
- `website/src/components/StatusBadge.astro` — takes `status`.
- `website/src/lib/catalog.ts` — `catalog`, `cardsById`, `previewImage(card)`, `withBase(base, route)`, `formatDate(value)`. `catalog.releases` is already sorted newest first (stage rank, then version, then date) by `orchestrator.mjs`. `ReleasePackage` has `id`, `releasedOn`, `stageLabel`, `version`. `CatalogCard` has `packageId`.
- `website/scripts/check-chrome.mjs` and `website/tests/unit/chrome.test.ts` — the dist gate from T9/T10; extend both.
- **From Depends (T1):** `npm run preflight` passes. Nothing else consumed.

## TDD

1. **Red** — write `website/tests/unit/latest-release.test.ts` first against `isLatestRelease`; add the home-grid cases to `website/tests/unit/chrome.test.ts`. Both fail.
2. **Green** — add the helper, rewrite the section, add the CSS, add the gate rules.
3. **Refactor** — none.

Exact helper in `website/src/lib/catalog.ts`:

```ts
/** Newest published package, or null on a draft-only build. */
export const latestRelease: ReleasePackage | null = catalog.releases[0] ?? null;

/** True when this card's current version was published by the newest package. */
export function isLatestRelease(card: { packageId: string }): boolean {
  return latestRelease !== null && card.packageId === latestRelease.id;
}
```

Gate rules added to `chromeIssues(file, html, base)` for `file === 'index.html'`:

- `index.html: new-cards section must show 15 cards` unless the `<section aria-labelledby="new-cards-heading">…</section>` block contains exactly 15 `<li class="new-card-item"` occurrences (skip the rule when the block is absent, so draft-only builds stay green)
- `index.html: new-cards section must link "View all N new cards"` unless that block contains a link to `<base>updates/` whose text matches `/View all \d+ new cards/`
- `index.html: the new-card carousel must be gone` when the html contains `new-card-carousel`

## Test plan

| Test | Input | Expect |
| ---- | ----- | ------ |
| `flags a card from the newest package` | `isLatestRelease({ packageId: catalog.releases[0].id })` | `true` |
| `rejects a card from an older package` | `isLatestRelease({ packageId: 'alpha-OLD-0000-Alpha-0-1' })` | `false` |
| `is false on a draft-only catalog` | helper computed against `releases: []` | `false` |
| `accepts a compliant home grid` | html with 15 `new-card-item` and `View all 50 new cards` | `[]` |
| `flags a 12-card grid` | html with 12 items | contains `new-cards section must show 15 cards` |
| `flags a leftover carousel class` | html containing `new-card-carousel` | contains `the new-card carousel must be gone` |
| `flags a generic updates link` | link text `View all updates` | contains `must link "View all N new cards"` |

Run: `cd website && npx vitest run tests/unit/latest-release.test.ts tests/unit/chrome.test.ts`

## Impl steps

- [x] 1. Create `website/tests/unit/latest-release.test.ts` with the first three cases; add the last four to `website/tests/unit/chrome.test.ts`.
- [x] 2. Add `latestRelease` and `isLatestRelease` to `website/src/lib/catalog.ts`, exported after `sectionsBySlug`.
- [x] 3. Add the three gate rules to `website/scripts/check-chrome.mjs`.
- [x] 4. In `website/src/pages/index.astro`, add `const newCardCount = latest.length;` and `const newCards = latest.slice(0, 15);`.
- [x] 5. Delete the `<a href={withBase(base, '/updates/')}>View all updates</a>` from the section heading.
- [x] 6. Replace `<ul class="update-list new-card-carousel">` with `<ul class="new-card-grid">`, iterate `newCards`, and give each `<li>` the class `new-card-item`. Keep the existing anchor, `data-card-preview`, `CardPicture`, `.update-meta`, and `StatusBadge` markup. Set `eager={index < 5}`.
- [x] 7. Add, directly after the `</ul>`, `<p class="new-card-more"><a href={withBase(base, '/updates/')}>View all {newCardCount} new cards</a></p>`.
- [x] 8. Add to `website/src/styles/global.css`, inside the same desktop block that holds `.update-list`:
      `.new-card-grid { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: var(--space-4); list-style: none; padding: 0; margin: 0; }`
      `.new-card-grid li a { display: grid; gap: 0.65rem; text-decoration: none; }`
      `.new-card-more { margin-top: var(--space-4); }`
      and under `@media (max-width: 70rem) { .new-card-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } }` plus `@media (max-width: 40rem) { .new-card-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }`.
- [x] 9. Delete the now-unused `.new-card-carousel` selector if `global.css` declares one.
- [x] 10. Run `npm run build`, `npm run format`, `npm run lint`, `npm run check`.

## Outputs

- Files touched: `website/src/lib/catalog.ts`, `website/src/pages/index.astro`, `website/src/styles/global.css`, `website/scripts/check-chrome.mjs`, `website/tests/unit/latest-release.test.ts` (new), `website/tests/unit/chrome.test.ts`.
- Public API: `latestRelease`, `isLatestRelease` — consumed by T14 and T16.
- No migration.

## Validation

- [x] `cd website && npx vitest run tests/unit/latest-release.test.ts tests/unit/chrome.test.ts` — all pass. Evidence: `Test Files 2 passed (2)` / `Tests 21 passed (21)`.
- [x] `cd website && npm run build` — chrome gate reports no new-cards complaint. Evidence: build output ends `chrome: 151 pages carry the site header` with no thrown error.
- [x] `cd website && npm run links:check` — exit 0. Evidence: `links: 151 pages clean`.
- [x] manual check: `node scripts/serve-dist.mjs`, open `/` at ≥ 1400 px — three rows of five card images, then the `View all 50 new cards` link; no horizontal scrolling anywhere. **Substitution (no browser/e2e harness on this host):** inspected `dist/index.html` and `dist/_astro/*.css` statically instead — `grep -o 'class="new-card-item"' dist/index.html | wc -l` → 15; `.new-card-grid{gap:var(--space-4);grid-template-columns:repeat(5,minmax(0,1fr));...}` present in the built CSS (base/desktop rule); `View all 50 new cards` link renders directly after `</ul>`; no `new-card-carousel` string anywhere in `dist/index.html`.
- [x] manual check at 390 px — two columns, no overflow. **Substitution:** confirmed `@media (max-width: 40rem){.new-card-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}` present in built CSS; grid items are `minmax(0, 1fr)` tracks (no fixed widths) and base reset applies `img, picture { max-width: 100% }`, so no overflow is introduced.
- [x] `cd website && npm run ci` — exit 0. Evidence: `npm run ci > /tmp/ci_out.log 2>&1; echo $?` → `EXIT: 0`.
- [x] app functional — hero and section tiles unchanged, `/updates/` still resolves. Evidence: `dist/index.html` hero markup (`<h1>The Yu-Gi-Oh! Feel....`, `.hero-actions` links) and `.section-menu`/`.section-tile` markup byte-identical to pre-change; `links:check` (151 pages clean) confirms `/updates/` resolves.
- [x] commit msg draft: `feat(website): replace the home carousel with a fixed new-cards grid`

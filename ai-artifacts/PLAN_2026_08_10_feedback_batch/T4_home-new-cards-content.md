# T4: Homepage new-cards content

**Plan:** `./ai-artifacts/PLAN_2026_08_10_feedback_batch.md`
**Depends:** none
**Commit outcome:** homepage shows 10 new cards, no blurb under the heading, a
button-sized "View all N new cards" link, and a hero button reading "View new cards".

## Context (self-contained)

- Goal: `feedback.md` items 9, 11 (blurb half) and 13 — homepage new-cards block is
  too busy and its call to action is too quiet.
- This slice: content and labels only, on `website/src/pages/index.astro`.
- Out of scope here: margins and spacing (T6), grid columns (T5), archetype tiles.
- Assumptions in force: item 11's "remove the description below New Cards" and "remove
  the latest cards from alpha, beta and release packages" describe the one paragraph
  `Latest cards from alpha/beta/release packages.`

## Requirements

- `newCards` = first **10** entries, not 15.
- The `<p>Latest cards from alpha/beta/release packages.</p>` under `<h2 id="new-cards-heading">`
  is deleted. The `.section-heading` wrapper and the `<h2>` stay.
- `.new-card-more a` gains the `primary-link` class so it renders at button size
  (`min-height: 2.9rem`, bold, accent) instead of an inline text link. Text stays
  `View all {newCardCount} new cards`, where `newCardCount` is the full count (50), not 10.
- Hero secondary button text `See what changed` → `View new cards`. Href unchanged
  (`/updates/`).
- `eager` threshold on `CardPicture` stays `index < 5`.

## Inputs

- `website/src/pages/index.astro`:
  - line 20 `const newCards = latest.slice(0, 15);`
  - line 19 `const newCardCount = latest.length;`
  - hero action `<a class="secondary-link" href={withBase(base, '/updates/')}>See what changed</a>`
  - `<div class="section-heading"><div><h2 id="new-cards-heading">New cards</h2><p>Latest cards from alpha/beta/release packages.</p></div></div>`
  - `<p class="new-card-more"><a href={withBase(base, '/updates/')}>View all {newCardCount} new cards</a></p>`
- `website/src/styles/global.css`: `.primary-link` / `.secondary-link` share a rule at
  line 645 (`min-height: 2.9rem`, `border-radius`, `font-weight: 700`);
  `.new-card-more { margin-top: var(--space-4) }` at line 797.
- Catalog facts: 50 cards, all 50 updates have `status: 'new'`, so `newCardCount === 50`.
- **From Depends:** none.

## TDD

1. **Red** — add `website/tests/e2e/home-new-cards.spec.ts` with the four assertions
   below; run it against the current build and watch three fail.
2. **Green** — edit `index.astro`.
3. **Refactor** — none expected.

## Test plan

| Test | Input | Expect |
| --- | --- | --- |
| `shows exactly ten new cards` | `/` at 1280×900 | `.new-card-grid > li` count `=== 10` |
| `has no blurb under the New cards heading` | `/` | `#new-cards-heading` → its parent `div` has no `p` child |
| `the view-all link is a primary button` | `/` | `.new-card-more a` has class `primary-link`, text matches `/^View all \d+ new cards$/`, `height >= 40` |
| `the hero secondary button reads View new cards` | `/` | `.hero-actions .secondary-link` text `=== 'View new cards'`, `getAttribute('href')` ends `/updates/` |

## Impl steps

- [x] 1. In `index.astro`, change `latest.slice(0, 15)` to `latest.slice(0, 10)`.
- [x] 2. Delete the `<p>Latest cards from alpha/beta/release packages.</p>` line.
- [x] 3. Change the hero link text `See what changed` to `View new cards`.
- [x] 4. Add `class="primary-link"` to the `<a>` inside `<p class="new-card-more">`.
- [x] 5. In `global.css`, add `.new-card-more { display: flex; justify-content: center; }`
      to the existing `.new-card-more` rule so the button is not stranded at the left
      edge of an 88rem shell.
- [x] 6. Create `website/tests/e2e/home-new-cards.spec.ts` with the four tests, using the
      `basePath` / `urlFor` idiom from `tests/e2e/header-row.spec.ts`.

## Outputs

- `website/src/pages/index.astro`, `website/src/styles/global.css`,
  `website/tests/e2e/home-new-cards.spec.ts`.
- Behaviour change: 10 cards instead of 15; one paragraph gone; two link labels/styles.

## Validation

- [x] `cd website && npx playwright test tests/e2e/home-new-cards.spec.ts` → 8 passed across 2 browsers
      (Chromium + WebKit via Nix-provided binaries; Firefox cannot launch in this
      environment — pre-existing, confirmed against untouched `header-row.spec.ts`)
- [x] `cd website && npm run ci` → pass
- [x] manual check: `/` shows 10 renders, one accent button under them, hero says
      `View new cards`
- [x] app functional — `/updates/` still lists all 50
- [x] commit msg draft: `fix(website): trim the homepage new-cards block to ten cards and one CTA` — landed as `8b3db83`

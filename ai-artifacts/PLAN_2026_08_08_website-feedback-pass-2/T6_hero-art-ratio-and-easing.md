# T6: Hero art ratio and easing

**Plan:** `./ai-artifacts/PLAN_2026_08_08_website-feedback-pass-2.md`
**Depends:** T1
**Commit outcome:** `catalog-hero-art` is square like its source image, visibly bigger, and un-zooms slowly and smoothly on hover — on every archetype and non-archetype page.

## Context (self-contained)

- Goal: website feedback pass 2. This ticket delivers feedback item
  **"/sections/non-archetype/ 1"**: "Resize `catalog-hero-art` to be the same ratio
  as the original card image. The un-zoom animation is too fast — make it smooth and
  slower. Copy the `section-tile` work; that is the perfect implementation for the
  zoom animation and ratio (but keep the un-zoom). Make the image bigger. Reduce
  top and bottom margins to allow the increase in height. The overall height of
  `catalog-hero` should not change — only image size and margins/paddings. Apply to
  all archetype pages."
- This slice: CSS only, plus the tests that pin it. Both hero pages
  (`/archetypes/{slug}/` and `/sections/non-archetype/{slug}/`) share the same
  `.catalog-hero` / `.catalog-hero-art` rules, so one CSS change covers both.
- Out of scope here: keyword rulings, MSE card data, section intro copy, the nav,
  the docs/blog rails, the home-page `section-tile` rules (read them, do not change
  them).
- Assumptions in force: `graphify` is not installed — do not run it. "Same ratio as
  the original card image" means **1 / 1**: every hero source under
  `website/public/art/*-hero.webp` is square (1920×1920 or 624×624). Exact pixel
  parity of `.catalog-hero` height is not asserted — the art grows and the hero's own
  vertical padding shrinks to absorb it.

## Requirements

- `.catalog-hero-art` uses `aspect-ratio: 1 / 1` (was `3 / 2`).
- The resting zoom is stronger (`scale(1.12)`, was `1.08`) and the transition is
  slower and smoother: `900ms` on `transform` with `var(--ease-out)` (was `600ms`).
- The hover / focus-within state still resets to `object-fit: contain` and
  `transform: scale(1)` — the un-zoom is kept, not replaced by the `section-tile`
  zoom-in.
- `.catalog-hero` vertical padding shrinks: `padding-block: var(--space-2) var(--space-4)`
  (was `padding-bottom: var(--space-6)` with no top padding).
- The narrow-viewport override stops fighting the ratio: the `@media (max-width: 64rem)`
  rule `.catalog-hero-art { max-height: 22rem; }` becomes
  `.catalog-hero-art { max-width: 24rem; margin-inline: auto; }`.
- The reduced-motion block keeps dropping the resting zoom and must **not** gain an
  `object-fit` declaration (the existing test enforces this).

## Inputs

- `website/src/styles/global.css`:
  - `.catalog-hero` at line 774:
    ```css
    .catalog-hero {
      display: grid;
      grid-template-columns: minmax(0, 1.25fr) minmax(18rem, 0.75fr);
      gap: clamp(2rem, 6vw, 7rem);
      align-items: center;
      border-bottom: 1px solid var(--ruleline);
      padding-bottom: var(--space-6);
    }
    ```
  - `.catalog-hero-art` at line 786: `width: 100%; aspect-ratio: 3 / 2; overflow: hidden; border-radius: var(--radius); background: var(--blackfoil);`
  - `.catalog-hero img` at line 793: `object-fit: cover;` and
    `transition: transform 600ms var(--ease-out), opacity 180ms linear;`
  - the `@media (hover: hover) and (pointer: fine)` block at line 801 with the
    resting `transform: scale(1.08)` and the hover/focus `object-fit: contain; transform: scale(1);`
  - the reduced-motion block at line ~989 listing `.catalog-hero-art img` and
    `.catalog-hero-art:hover img` under `transform: none;`
  - the `@media (max-width: 64rem)` rule at line 1059: `.catalog-hero-art { max-height: 22rem; }`
  - reference implementation to copy the *feel* from — `.section-tile img` at line
    648: `object-fit: cover; transition: transform 450ms var(--ease-out), filter 450ms var(--ease-out);`
- `website/tests/unit/catalog-hero-art.test.ts` — slices the CSS between
  `'.catalog-hero-art {'` and `'.catalog-stats {'` and asserts: `object-fit: cover`
  at rest, `object-fit: contain` on hover and on focus-within, `transform: scale(1)`
  on hover, and that the reduced-motion hero rules contain `transform: none` and no
  `object-fit`. **Every one of these must stay green.**
- `website/public/art/` — `non-archetype-hero.webp` 1920×1920,
  `burning-abyss-hero.webp` 1920×1920, `nekroz-hero.webp` 1920×1920,
  `shaddoll-hero.webp` 624×624, `spellbook-hero.webp` 624×624.
- `website/src/pages/archetypes/[slug].astro` and
  `website/src/pages/sections/non-archetype/[slug].astro` both render
  `<div class="catalog-hero-art" tabindex="0" role="img" …><img … width="624" height="624" /></div>` —
  markup is already square-shaped; do not change it.
- **From Depends (T1):** baseline green.

## TDD

1. **Red** — add the four new assertions to
   `website/tests/unit/catalog-hero-art.test.ts`; they fail.
2. **Green** — apply the CSS edits.
3. **Refactor** — none.

## Test plan

Run with `cd website && npm run test`.

| Test | Input | Expect |
| ---- | ----- | ------ |
| `matches the square source ratio` | `.catalog-hero-art { … }` block | matches `/aspect-ratio:\s*1\s*\/\s*1/` |
| `un-zooms slowly` | `.catalog-hero img { … }` block | matches `/transform 900ms var\(--ease-out\)/` |
| `rests zoomed in further than before` | `@media (hover: hover)` hero rule | matches `/transform:\s*scale\(1\.12\)/` |
| `trims the hero padding to absorb the taller art` | `.catalog-hero { … }` block | matches `/padding-block:\s*var\(--space-2\) var\(--space-4\)/` and contains no `padding-bottom:` |
| `keeps the narrow-viewport art in ratio` | `@media (max-width: 64rem)` hero-art rule | matches `/max-width:\s*24rem/` and does **not** match `/max-height/` |
| existing rows (`cover` at rest, `contain` on hover, `contain` on focus-within, `scale(1)` on hover, reduced-motion) | unchanged | still green |

## Impl steps

- [x] 1. In `website/src/styles/global.css`, in `.catalog-hero`, replace
      `padding-bottom: var(--space-6);` with
      `padding-block: var(--space-2) var(--space-4);`.
      Evidence: rule now reads `padding-block: var(--space-2) var(--space-4);`.
- [x] 2. In `.catalog-hero-art`, change `aspect-ratio: 3 / 2;` to `aspect-ratio: 1 / 1;`.
      Evidence: rule now reads `aspect-ratio: 1 / 1;`.
- [x] 3. In `.catalog-hero img`, change the transition to
      `transition:\n      transform 900ms var(--ease-out),\n      opacity 180ms linear;`
      (Prettier formats it one declaration per line — run `npm run format` after).
      Evidence: `npm run format` run, no diff produced by formatter on this block.
- [x] 4. In the `@media (hover: hover) and (pointer: fine)` block, change
      `.catalog-hero-art img { transform: scale(1.08); }` to `scale(1.12)`.
      Evidence: rule now reads `transform: scale(1.12);`.
- [x] 5. Replace the stale comment above the hover rule with the new wording.
      Evidence: comment replaced verbatim as specified.
- [x] 6. In the `@media (max-width: 64rem)` block, replace
      `.catalog-hero-art { max-height: 22rem; }` with
      `.catalog-hero-art { max-width: 24rem; margin-inline: auto; }`.
      Evidence: rule now reads `max-width: 24rem; margin-inline: auto;`.
- [x] 7. Leave the reduced-motion block untouched.
      Evidence: `git diff` shows no change to the `prefers-reduced-motion` block content
      (only touched transiently for a mutation test, then reverted — see report).
- [x] 8. Add the five new rows to `website/tests/unit/catalog-hero-art.test.ts`.
      For the `.catalog-hero` block use a new slice
      `sliceBlock(css, '.catalog-hero {', '.catalog-hero p {')`; for the narrow
      override, slice from `'@media (max-width: 64rem)'` to `'@media (max-width: 44rem)'`.
      Evidence: added; red before CSS edits (5 failing), green after (10/10 passing).
- [x] 9. `cd website && npm run format && npm run test` → exit 0.
      Evidence (main checkout, polluted by unrelated concurrent blog-file work):
      `catalog-hero-art.test.ts` — Test Files 1 passed, Tests 10 passed. Full suite:
      474 passed, 2 failed, both in `blog.test.ts`/`blog-corpus.test.ts` (not this
      ticket's diff — confirmed by `git stash` isolation). Superseded by step 10's
      clean-worktree run: **48/48 test files, 476/476 tests, exit 0.**
- [x] 10. `cd website && npm run build` → exit 0.
      Confirmed clean in a disposable detached worktree at HEAD carrying only this
      ticket's diff (`git worktree add --detach .../wt-t6 HEAD` + `git apply` the
      2-file patch): `npm run ci` → **exit 0**, `Test Files 48 passed (48)`,
      `Tests 476 passed (476)`, `151 page(s) built`, `dist scan: clean`. Worktree
      removed after (`git worktree remove --force`). Main-checkout build remains
      blocked only by the repo owner's unrelated in-flight blog/image work — not by
      this ticket.

## Outputs

- Files touched: `website/src/styles/global.css`,
  `website/tests/unit/catalog-hero-art.test.ts`.
- Public API / behaviour change: hero art is square, larger, and un-zooms over 900 ms.
- Migrate / config: none.

## Validation

- [x] tests pass: `cd website && npm run test` — `catalog-hero-art.test.ts` 10/10 green
      (was 5/5). `cd website && npm run ci` — reached exit 0 in a disposable detached
      worktree at HEAD carrying only this ticket's 2-file diff: `Test Files 48 passed
      (48)`, `Tests 476 passed (476)`. Main checkout's `npm run ci` remains blocked by
      the repo owner's unrelated in-flight blog/image work (confirmed via `git stash`
      isolation: same 2 blog-test failures occur with or without this ticket's diff).
- [ ] manual check: `/sections/non-archetype/non-archetype/`, `/archetypes/nekroz/`,
      `/archetypes/burning-abyss/` — not run: no browser available on this host
      (parent baseline: Playwright cannot launch here at all).
- [ ] manual check: at 900 px viewport width the art is centred, capped at 24rem, and
      still square — not run: no browser available on this host.
- [x] app functional — `cd website && npm run build` exits 0 in the disposable
      worktree: `151 page(s) built`, `dist scan: clean`. Shipped `dist/` CSS verified:
      `.catalog-hero-art{aspect-ratio:1;...}`, `.catalog-hero img{...transition:
      transform .9s var(--ease-out), opacity .18s linear}`, `.catalog-hero-art
      img{transform:scale(1.12)}`, narrow-viewport `.catalog-hero-art{max-width:24rem;
      margin-inline:auto}`, and the reduced-motion selector list still includes
      `.catalog-hero-art img,.catalog-hero-art:hover img{transform:none}` (no
      `object-fit`).
- [x] commit msg draft: `style(website): square the section hero art and slow its un-zoom`

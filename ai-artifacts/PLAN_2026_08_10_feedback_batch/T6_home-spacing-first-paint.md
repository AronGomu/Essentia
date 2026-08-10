# T6: Homepage spacing + first-paint test

**Plan:** `./ai-artifacts/PLAN_2026_08_10_feedback_batch.md`
**Depends:** T4
**Commit outcome:** on a 1920×1080 screen the `New cards` heading is inside the
viewport on first load, with no scrolling, and the archetype heading sits close to
its tiles.

## Context (self-contained)

- Goal: `feedback.md` items 10, 11 (margins half) and 12 — the hero eats the whole
  first screen, and every homepage heading floats too far from its content.
- This slice: spacing only, plus the regression test that pins it.
- Out of scope here: card counts and labels (already done in T4), grid columns (T5),
  archetype page (T7).
- Assumptions in force: "HD screen" = 1920×1080 at default zoom. Item 10 means the
  homepage `Archetypes` heading → tile row gap, not a new per-archetype card list.

## What T4 already produced (do not redo)

- `website/src/pages/index.astro` renders 10 cards, has **no** `<p>` under
  `<h2 id="new-cards-heading">New cards</h2>`, and its view-all link carries
  `class="primary-link"`.
- The hero secondary button reads `View new cards`.
- `website/tests/e2e/home-new-cards.spec.ts` exists and must stay green.

## Requirements

- Hero no longer claims the full viewport: `.hero { min-height: min(40rem, calc(74svh - var(--header))) }`.
  At 1080px that is 727px of hero under a 72px header → hero bottom ≈ 799px.
- Hero inner padding shrinks: `.hero-content { padding: clamp(2.5rem, 8vw, 6rem) 0 }`.
- The new-cards section starts closer: scoped rule in `index.astro`
  `.new-cards-shell { padding-block-start: var(--space-5); }` (2.25rem, was `var(--space-6)`
  = up to 7rem).
- Heading-to-first-card gap shrinks: scoped `.new-cards-shell .section-heading { margin-bottom: var(--space-2); }`
  (0.625rem, was `var(--space-5)` = 2.25rem).
- Archetype heading-to-tiles gap shrinks: scoped `.catalog-shell.section-heading { margin-bottom: var(--space-2); }`.
- Nothing above changes any other page: all four rules are scoped to `index.astro`
  except the two `.hero` rules, which only that page uses (`grep -rn "class=\"hero\"" src`
  returns `index.astro` only — verify before editing).

## Inputs

- `website/src/pages/index.astro`: hero `<section class="hero">`,
  `<section class="page-shell" aria-labelledby="new-cards-heading">`,
  `<div class="page-shell section-heading">` around `<h2 id="catalog-heading">Archetypes</h2>`,
  and an existing `<style>` block at the end of the file (extend it; a new `<style>`
  element would need a fresh CSP hash from `scripts/harden-csp.mjs`, which is automatic,
  but one block keeps the diff small).
- `website/src/styles/global.css`: `.hero` line 598, `.hero-content` line 627,
  `.page-shell { padding-block: var(--space-6) }` line 325,
  `.section-heading { margin-bottom: var(--space-5) }` line 663,
  `--header: 4.5rem` line 46, `--space-2: 0.625rem`, `--space-5: 2.25rem`,
  `--space-6: clamp(3rem, 7vw, 7rem)`.
- Measured today at 1920×1080: hero occupies 72→1080px, `New cards` heading lands near
  1192px — off screen. Target after this ticket: heading top ≈ 835px.
- **From Depends:** T4, as listed above.

## TDD

1. **Red** — write `website/tests/e2e/home-first-paint.spec.ts` first. It fails today by
   roughly 110px.
2. **Green** — apply the five spacing rules.
3. **Refactor** — none; keep global `.section-heading` untouched for other pages.

## Test plan

| Test | Input | Expect |
| --- | --- | --- |
| `the New cards heading is visible on first load at 1920x1080` | viewport 1920×1080, `goto('/')`, no scroll | `#new-cards-heading` `boundingBox().y + height <= 1080` and `window.scrollY === 0` |
| `the page has not been scrolled to achieve it` | same | `await page.evaluate(() => window.scrollY)` `=== 0` |
| `the heading sits close to the first card` | same | first `.new-card-grid > li` `y` − heading `y+height` `<= 40` |
| `the archetype heading sits close to its tiles` | same | first `.section-tile` `y` − `#catalog-heading` `y+height` `<= 40` |
| `home-new-cards.spec.ts` (from T4) | unchanged | still 4 passing |

## Impl steps

- [ ] 1. `grep -rn 'class="hero"' website/src` — confirm only `index.astro` uses `.hero`.
- [ ] 2. In `global.css`, change `.hero` `min-height` to `min(40rem, calc(74svh - var(--header)))`.
- [ ] 3. In `global.css`, change `.hero-content` `padding` to `clamp(2.5rem, 8vw, 6rem) 0`.
- [ ] 4. In `index.astro`, add `new-cards-shell` to the new-cards section class list:
      `<section class="page-shell new-cards-shell" aria-labelledby="new-cards-heading">`.
- [ ] 5. In `index.astro`, add `catalog-shell` to the archetypes heading wrapper:
      `<div class="page-shell section-heading catalog-shell">`.
- [ ] 6. In the `index.astro` `<style>` block, append:
      ```css
      .new-cards-shell {
        padding-block-start: var(--space-5);
      }
      .new-cards-shell .section-heading {
        margin-bottom: var(--space-2);
      }
      .catalog-shell.section-heading {
        margin-bottom: var(--space-2);
      }
      ```
- [ ] 7. Create `website/tests/e2e/home-first-paint.spec.ts` with the four tests, using
      `test.use({ viewport: { width: 1920, height: 1080 } })` and the `urlFor` idiom from
      `tests/e2e/header-row.spec.ts`.
- [ ] 8. Re-run `tests/e2e/card-lists-400.spec.ts` (T5) if it already exists — the hero
      change must not reintroduce two-up cards at 400px.

## Outputs

- `website/src/styles/global.css`, `website/src/pages/index.astro`,
  `website/tests/e2e/home-first-paint.spec.ts`.
- Behaviour change: shorter hero, tighter homepage headings.

## Validation

- [ ] `cd website && npx playwright test tests/e2e/home-first-paint.spec.ts` → 4 passed × 3 browsers
- [ ] `cd website && npx playwright test tests/e2e/home-new-cards.spec.ts` → still green
- [ ] `cd website && npm run ci` → pass
- [ ] manual check: 1920×1080 window, load `/`, `New cards` heading visible without scrolling
- [ ] commit msg draft: `fix(website): pull the homepage sections up so New cards is above the fold`

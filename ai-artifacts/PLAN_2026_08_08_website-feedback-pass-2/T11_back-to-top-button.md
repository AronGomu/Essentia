# T11: Back to top button

**Plan:** `./ai-artifacts/PLAN_2026_08_08_website-feedback-pass-2.md`
**Depends:** T1
**Commit outcome:** A bottom-right "Back to top" button appears once the page has been scrolled far enough to be worth scrolling back, and returns the visitor to the top.

## Context (self-contained)

- Goal: website feedback pass 2. This ticket delivers feedback item
  **"Docs & Blog 2"**: "Add a return-to-top-of-page button feature at the bottom of
  the page when able to scroll up. Must be bottom right of page."
- This slice: one component, one pure helper, one style block, one gate rule.
- Out of scope here: keyword rulings, MSE card data, hero art, section intros, the
  nav, the docs/blog rail migration.
- Assumptions in force: `graphify` is not installed — do not run it. The button ships
  in `BaseLayout.astro`, so it appears on **every** page rather than only docs/blog —
  a strict superset of the request with one implementation. The `404.html` stub is
  exempt from the chrome gate, as it is for every other chrome rule.

## Requirements

- New pure helper `website/src/lib/back-to-top.ts`:
  ```ts
  /** Show the control once the visitor is far enough down to want it back. */
  export const BACK_TO_TOP_THRESHOLD = 480;
  export function shouldShowBackToTop(scrollY: number, threshold = BACK_TO_TOP_THRESHOLD): boolean;
  ```
  Returns `true` when `scrollY >= threshold`; a negative or non-finite `scrollY`
  returns `false`.
- New component `website/src/components/BackToTop.astro` rendering
  ```html
  <button class="back-to-top" type="button" hidden>
    <span aria-hidden="true">↑</span>
    <span class="sr-only">Back to top</span>
  </button>
  ```
  plus an inline module script that toggles `hidden` on `scroll` (passive) and on
  `resize`, and on `click` calls
  `window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' })`.
- Rendered inside `BaseLayout.astro` immediately before `<footer class="site-footer">`.
- Fixed at the bottom-right of the viewport:
  `position: fixed; right: clamp(1rem, 3vw, 2rem); bottom: clamp(1rem, 3vw, 2rem); z-index: var(--z-sticky);`
  with a `min-height`/`min-width` of `2.75rem` so it meets the touch-target floor the
  rest of the site uses.
- `website/scripts/check-chrome.mjs` requires `class="back-to-top"` on every page
  except `404.html`.
- Accessible name is `Back to top`; the axe run in `showcase.spec.ts` stays clean.

## Inputs

- `website/src/layouts/BaseLayout.astro` — the tail of `<body>`:
  `<main id="main-content"><slot /></main>`, the `#keyword-rulings` JSON script,
  `<CardHoverPreview />`, then `<footer class="site-footer">`. Import components at
  the top of the front-matter block alongside `CardQualityUpgrade`.
- `website/src/components/CardQualityUpgrade.astro` — the existing pattern for a
  small component with its own `<script>` island; copy its structure.
- `website/src/styles/global.css`:
  - `--z-sticky` is already defined in `:root`.
  - `@layer utilities { .sr-only { … } }` at line ~1014 — reuse `.sr-only`.
  - `@media (prefers-reduced-motion: reduce)` at line ~975 sets
    `scroll-behavior: auto` — the script must also honour it via
    `window.matchMedia('(prefers-reduced-motion: reduce)').matches`.
  - `.rail-toggle` and `.drawer-trigger` show the house button metrics
    (`min-height: 2.25rem`, `padding: 0.35rem 0.6rem`).
- `website/scripts/check-chrome.mjs` — `chromeIssues(file, html, base)` returns early
  with `if (file === '404.html') return leak;`; add the new rule after the existing
  `rail-toggle` rule.
- `website/tests/unit/chrome.test.ts` — page fixtures are template strings; add
  `<button class="back-to-top" type="button" hidden></button>` to the shared valid
  fixture, then add a negative test.
- **From Depends (T1):** baseline green.

## TDD

1. **Red** — add `website/tests/unit/back-to-top.test.ts`, the `chrome.test.ts`
   negative test, and the e2e test; they fail.
2. **Green** — write the helper, the component, the styles and the gate rule.
3. **Refactor** — none.

## Test plan

Unit: `cd website && npm run test`. E2E: `cd website && npm run test:e2e`.

| Test | Input | Expect |
| ---- | ----- | ------ |
| `back-to-top.test.ts` › `hides at the top of the page` | `shouldShowBackToTop(0)` | `false` |
| `back-to-top.test.ts` › `hides just below the threshold` | `shouldShowBackToTop(479)` | `false` |
| `back-to-top.test.ts` › `shows at the threshold` | `shouldShowBackToTop(480)` | `true` |
| `back-to-top.test.ts` › `honours a custom threshold` | `shouldShowBackToTop(100, 50)` | `true` |
| `back-to-top.test.ts` › `ignores nonsense scroll positions` | `shouldShowBackToTop(-10)`, `shouldShowBackToTop(Number.NaN)` | `false`, `false` |
| `back-to-top.test.ts` › `anchors the control bottom-right` | `.back-to-top {` block in `global.css` | matches `/position:\s*fixed/`, `/right:\s*clamp\(/`, `/bottom:\s*clamp\(/`, and contains no `left:` |
| `back-to-top.test.ts` › `the layout renders the control` | source of `src/layouts/BaseLayout.astro` | index of `<BackToTop` is less than index of `<footer class="site-footer"` |
| `chrome.test.ts` › `flags a page with no back-to-top control` | valid fixture minus `class="back-to-top"` | problem `index.html: page is missing the back-to-top control` |
| `chrome.test.ts` › `exempts the 404 stub` | `chromeIssues('404.html', '<html></html>', '/')` | `[]` |
| `showcase.spec.ts` › new `back to top returns the visitor to the top` | any page tall enough (`/docs/`) | button named `Back to top` is hidden at load; after `page.mouse.wheel(0, 2000)` it is visible; clicking it leaves `window.scrollY === 0`; axe violations `[]` |

## Impl steps

- [ ] 1. Create `website/src/lib/back-to-top.ts`:
      ```ts
      /** Pixels of scroll after which returning to the top is worth a control. */
      export const BACK_TO_TOP_THRESHOLD = 480;

      /** True once the visitor is far enough down that the control earns its place. */
      export function shouldShowBackToTop(
        scrollY: number,
        threshold: number = BACK_TO_TOP_THRESHOLD,
      ): boolean {
        return Number.isFinite(scrollY) && scrollY >= threshold;
      }
      ```
- [ ] 2. Create `website/src/components/BackToTop.astro` with the markup from
      **Requirements** and this script:
      ```astro
      <script>
        import {
          BACK_TO_TOP_THRESHOLD,
          shouldShowBackToTop,
        } from '../lib/back-to-top';

        const control = document.querySelector<HTMLButtonElement>('.back-to-top');
        if (control) {
          const sync = () => {
            control.hidden = !shouldShowBackToTop(
              window.scrollY,
              BACK_TO_TOP_THRESHOLD,
            );
          };
          control.addEventListener('click', () => {
            const reduced = window.matchMedia(
              '(prefers-reduced-motion: reduce)',
            ).matches;
            window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
          });
          window.addEventListener('scroll', sync, { passive: true });
          window.addEventListener('resize', sync);
          sync();
        }
      </script>
      ```
- [ ] 3. In `website/src/layouts/BaseLayout.astro`, import `BackToTop` next to the
      other component imports and render `<BackToTop />` on the line immediately
      before `<footer class="site-footer">`.
- [ ] 4. In `website/src/styles/global.css`, inside `@layer layout`, next to
      `.rail-toggle`-style chrome rules, add:
      ```css
      .back-to-top {
        position: fixed;
        right: clamp(1rem, 3vw, 2rem);
        bottom: clamp(1rem, 3vw, 2rem);
        z-index: var(--z-sticky);
        min-width: 2.75rem;
        min-height: 2.75rem;
        border-radius: 999px;
        border: 1px solid var(--ruleline);
        background: var(--blackfoil-raised);
        color: var(--cardstock);
        font-size: 1.05rem;
        line-height: 1;
      }
      .back-to-top:hover,
      .back-to-top:focus-visible {
        border-color: var(--accent);
        background: var(--sleeve);
      }
      .back-to-top[hidden] {
        display: none;
      }
      ```
- [ ] 5. In `website/scripts/check-chrome.mjs`, after the existing
      `class="rail-toggle"` rule, add:
      ```js
      if (!html.includes('class="back-to-top"')) {
        problems.push(`${file}: page is missing the back-to-top control`);
      }
      ```
- [ ] 6. Add `<button class="back-to-top" type="button" hidden></button>` to the
      valid page fixture in `website/tests/unit/chrome.test.ts`, then add the two
      chrome rows from the test plan.
- [ ] 7. Add `website/tests/unit/back-to-top.test.ts` with its seven rows.
- [ ] 8. Add the new e2e test to `website/tests/e2e/showcase.spec.ts`.
- [ ] 9. `cd website && npm run format && npm run test` → exit 0.
- [ ] 10. `cd website && npm run build` → exit 0.
- [ ] 11. `cd website && npm run test:e2e` → exit 0.

## Outputs

- Files touched: new `website/src/lib/back-to-top.ts`,
  new `website/src/components/BackToTop.astro`,
  new `website/tests/unit/back-to-top.test.ts`;
  edited `website/src/layouts/BaseLayout.astro`, `website/src/styles/global.css`,
  `website/scripts/check-chrome.mjs`, `website/tests/unit/chrome.test.ts`,
  `website/tests/e2e/showcase.spec.ts`.
- Public API / behaviour change: every page but `404.html` carries a back-to-top
  control.
- Migrate / config: none.

## Validation

- [ ] tests pass: `cd website && npm run ci`; `cd website && npm run test:e2e`
- [ ] manual check: `/docs/rules/templating/` — the button is absent at the top,
      appears after scrolling, sits bottom-right, and returns to the top on click
- [ ] manual check: with `prefers-reduced-motion: reduce` forced in devtools, the
      jump is instant and does not animate
- [ ] manual check: at 390 px the button does not cover the footer links when the
      page is fully scrolled
- [ ] app functional — `cd website && npm run build` exits 0
- [ ] commit msg draft: `feat(website): add a back-to-top control to every page`

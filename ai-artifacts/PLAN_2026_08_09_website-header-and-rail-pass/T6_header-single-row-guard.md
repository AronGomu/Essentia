# T6: 400px single-row guard

**Plan:** `./ai-artifacts/PLAN_2026_08_09_website-header-and-rail-pass.md`
**Depends:** T5
**Commit outcome:** The header is pinned to one row down to 400px, and a header
that ever wraps there warns — in the build output and in the browser console —
without failing anything.

## Context (self-contained)

- Goal: rework the Essentia website shell — full-width header menubar, rail
  docked beneath it, flat colour-coded rail, compact phone header, tighter
  archetype hero. This ticket guards the compact header.
- This slice: sixth of seven. It adds a width budget, a build-time warning, a
  runtime warning, and the Playwright test that pins the single row.
- Out of scope here: any further change to what the header renders (T5 settled
  that), the rail (T2–T4), the catalog hero (T7). Do not touch
  `website/scripts/content/`, `cards_mse/`, or any Python.
- Assumptions in force, from the feedback ("do not error but show warning in app
  compilation and web console"): a wrapped header is a **warning**. The build
  script exits 0 whatever it finds, and the browser guard uses `console.warn`,
  never `console.error` and never a thrown value.

What T5 left behind (do not re-do, do not undo). At ≤44rem the header's
laid-out children are exactly:

| element            | class             | width at 400px                                                     |
| ------------------ | ----------------- | ------------------------------------------------------------------ |
| brand letter mark  | `.compact-brand`  | 32px (`.compact-brand img { height: 2rem; width: 2rem }`)           |
| catalog hamburger  | `.drawer-trigger` | ≈36px (icon only, `padding: 0.5rem`, 1px border)                    |
| breadcrumb         | `.breadcrumb`     | variable; only the last crumb is shown at this width                |
| sections overflow  | `.utility-nav`    | 39.2px — it contains only `.utility-more` (2.45rem square); the popover is out of flow |
| find palette       | `.search-trigger` | ≈48px (icon only, `<kbd>` hidden, base `button` padding `0.65rem 0.9rem`) |

Other facts:

- `.site-header` at ≤44rem declares `flex-wrap: wrap; gap: 0.45rem; padding-block: 0.55rem;`
  and its base `padding` is `0.7rem clamp(1rem, 3vw, 3rem)` → 16px each side at
  400px (the clamp floor wins).
- `.breadcrumb ol` is `display: flex; flex-wrap: wrap; gap: 0.35rem`, and
  `@media (max-width: 44rem)` hides `li:not(:last-child)`. A long final crumb
  ("Ash Blossom & Joyous Spring") is the one thing that can still push the row
  to wrap — this ticket makes it ellipsise instead.
- `website/package.json` `build` is
  `node scripts/build-content.mjs && astro build && node scripts/harden-csp.mjs && node scripts/scan-dist.mjs && node scripts/check-404.mjs && node scripts/check-chrome.mjs`.
- `website/shared/` already holds cross-consumer ES modules (`keywords.mjs`),
  imported by both `scripts/` and tests.
- `BaseLayout.astro` already carries one `<script is:inline>` in `<head>` (the
  rail-state pre-paint script); the page CSP allows `'unsafe-inline'` scripts.

### Environment — verified by the parent, do not rediscover

- **Playwright cannot launch natively on this host.** It is NixOS; the downloaded
  chromium/firefox/webkit binaries fail on missing `libglib-2.0.so.0` /
  `libgtk-3.so.0`, and `playwright install-deps` needs sudo, which is blocked.
  Wherever this ticket says to run Playwright, run it through Docker instead:

  ```bash
  docker pull mcr.microsoft.com/playwright:v1.61.1-noble   # once, separately
  cd /home/aron/projects/essentia/website && docker run --rm --ipc=host \
    -v /home/aron/projects/essentia:/work -w /work/website \
    mcr.microsoft.com/playwright:v1.61.1-noble \
    bash -c "npm ci --no-audit --no-fund && npx playwright test tests/e2e/<spec>.spec.ts"
  ```

  The in-container `npm ci` is required and must run first, in the same
  `bash -c`. `playwright.config.ts` starts its own web server
  (`npm run build && node scripts/serve-dist.mjs`) inside the container, and its
  three projects are chromium, firefox and webkit.

- **After every Docker Playwright run, delete `website/playwright-report/` and
  `website/test-results/` before running `npm run ci` on the host.** They are
  gitignored test output, but `astro check` walks them anyway and dies with
  `FATAL ERROR: Ineffective mark-compacts near heap limit — JavaScript heap out
  of memory`. Deleting them makes `npm run ci` exit 0. Then run
  `find /home/aron/projects/essentia/website -not -user aron` and confirm it is
  empty (no root-owned files left by the bind mount).

- **One e2e row already fails on `main`, unrelated to this plan.**
  `empty publication home is English and accessible`
  (`website/tests/e2e/showcase.spec.ts:7`) asserts the heading
  `No release packages published yet.`, which `website/src/pages/index.astro:142`
  renders only when no sections are published. Sections *are* published in this
  checkout, so the assertion is stale. It is out of this plan's scope — **do not
  fix it, do not touch `index.astro`**. Treat an e2e gate as green when that
  single row is the only failure.

- **Pixel tolerances written into this ticket's own test code are guidance, not
  contract.** If a tolerance turns out to be unsatisfiable purely because of an
  untouched, out-of-scope value (container padding, border, authored `clamp()`),
  widen the tolerance to that structural value plus a small slack and add a code
  comment naming where the number comes from. Do **not** change the out-of-scope
  CSS to chase the number, and do **not** report it as a plan defect — this
  paragraph is the parent's standing decision on it. Only report a plan defect
  if the *behaviour* the ticket asks for is impossible, not merely a threshold.

- **Only 3 of the 5 configured sections actually publish in this checkout.**
  The sole release package is `LOTA-0001-Alpha_0.1`, so the built site renders
  Non-archetype, Burning Abyss and Nekroz; Shaddoll and Spellbook have no
  released cards and therefore no rail entry. Any e2e assertion that enumerates
  rail labels must expect those three, not five. Do not touch `cards_mse/` to
  change this — it is out of scope.

- **The built site runs a hashed CSP — inline `style="…"` attributes are inert.**
  `website/scripts/harden-csp.mjs` rewrites `style-src 'self' 'unsafe-inline'`
  and `script-src 'self' 'unsafe-inline'` (as authored in
  `BaseLayout.astro:120`) into specific `sha256-` allowlists on every
  `npm run build`. A `<style>` block in the page is hashed and works; a per-element
  `style` attribute is NOT, so its custom properties never reach
  `getComputedStyle`. This bit T4, which had to move its per-item tint to a
  CSSOM `setProperty` pass in `onMount`. `npm run dev` keeps `'unsafe-inline'`,
  so a bug here reproduces only in the built site — always confirm through the
  Docker Playwright runbook, which serves `dist`. The native HTML `popover`
  attribute needs no JS and is unaffected.

- **T5 shipped (`d712955`) and its contract is now live.** At ≤44rem the
  header's laid-out children are exactly `.compact-brand` (32px letter mark),
  `.drawer-trigger` (icon-only), `.utility-nav` (containing only the 2.45rem
  `.utility-more` `⋯` button — the native popover itself is out of flow), and
  `.search-trigger` (icon-only, its `<kbd>` hidden). The section links moved
  from `.utility-nav a` into `.utility-menu a` inside the popover. One known
  cosmetic leftover: a now-dead `.utility-nav a` rule remains in the phone
  `@media` block under `@layer utilities` — harmless, do not chase it.

- **T1 shipped (`9057dae`) and its contract is now live.** `<Navigation>` renders
  **inside** `<header class="site-header">`, directly after `.compact-brand`.
  The header's laid-out children, in order, are `.compact-brand`,
  `.drawer-trigger` (≤64rem only), `.breadcrumb` (optional), `.utility-nav`,
  `.search-trigger`. `.site-header` no longer has `margin-left` or a
  `padding-left` hamburger reservation, and its `z-index` is
  `calc(var(--z-sticky) + 2)`; `.desktop-catalog` now has
  `inset: var(--header) auto 0 0`. `.site-header` keeps its authored
  `padding: 0.7rem clamp(1rem, 3vw, 3rem)`, so `.compact-brand` sits at
  `x = 42` at a 1400px viewport — do not assert a tighter left edge than 48px,
  and do not change that padding.


## Requirements

1. New module `website/shared/header-row.mjs` exports `COMPACT_VIEWPORT_PX`,
   `HEADER_PADDING_INLINE_PX`, `HEADER_GAP_PX`, `HEADER_CONTROLS`,
   `BREADCRUMB_MIN_PX` and `headerRowBudget(viewportPx, options)`.
2. New script `website/scripts/check-header-row.mjs` prints a `console.warn`
   line when the budget does not fit, prints nothing when it does, and always
   exits 0.
3. `npm run build` runs it, last in the chain.
4. `BaseLayout.astro` ships an inline guard that, at `innerWidth <= 400`,
   measures the header's real children and `console.warn`s when they occupy more
   than one row. It never warns above 400px and never throws.
5. The breadcrumb cannot wrap the row: at ≤44rem it shrinks and ellipsises.
6. A Playwright test proves one row at 400×800 on a page with a breadcrumb and
   on the home page, and proves the console carries no error and no wrap warning.

## Inputs

- `website/shared/keywords.mjs` (read only — the shape to imitate)
- `website/scripts/check-chrome.mjs` (read only — how a check script is wired)
- `website/package.json`
- `website/src/layouts/BaseLayout.astro`
- `website/src/styles/global.css`
- **From T5:** the five header children and their compact widths, tabulated
  above; `.utility-more` is 2.45rem; `.label-full` is `display: none` at ≤44rem.

## TDD

1. **Red** — add `website/tests/unit/header-row.test.ts` per the table below and
   run `cd website && npx vitest run tests/unit/header-row.test.ts`; confirm
   failures (the module does not exist yet).
2. **Green** — apply the impl steps.
3. **Refactor** — none. Keep green.

## Test plan

| Test                                              | Input                                                                  | Expect                                                        |
| ------------------------------------------------- | ---------------------------------------------------------------------- | --------------------------------------------------------------- |
| `the compact header fits 400px with a breadcrumb` | `headerRowBudget(400)`                                                   | `fits === true`, `overflowPx === 0`, `contentPx === 248`         |
| `the compact header fits 400px without one`       | `headerRowBudget(400, { withBreadcrumb: false })`                        | `fits === true`, `contentPx === 176.8` (155.2 + 3 × 7.2)         |
| `a fatter control is reported, not thrown`        | `headerRowBudget(200)`                                                   | `fits === false`, `overflowPx > 0`                               |
| `the budget subtracts the header padding`         | `headerRowBudget(400).availablePx`                                       | `368`                                                            |
| `the build runs the guard`                        | `website/package.json`                                                   | `scripts.build` ends with `node scripts/check-header-row.mjs`    |
| `the guard script never fails the build`          | `scripts/check-header-row.mjs` source                                    | contains no `process.exit(1)` and no `throw`                     |
| `the guard warns rather than errors`              | `scripts/check-header-row.mjs` source                                    | contains `console.warn` and no `console.error`                   |
| `the page ships the runtime guard`                | `BaseLayout.astro`                                                       | contains `site-header wraps to` and `console.warn`, and no `console.error` |
| `the breadcrumb can shrink`                       | `resolve(css, '.breadcrumb', 'min-width', 390)`                          | `'0'`                                                            |
| `the breadcrumb cannot wrap`                      | `resolve(css, '.breadcrumb ol', 'flex-wrap', 390)`                       | `'nowrap'`                                                       |
| `the last crumb ellipsises`                       | `global.css`                                                             | matches `/\.breadcrumb li\s*\{[^}]*text-overflow:\s*ellipsis/`   |
| e2e `the header holds one row at 400px`           | viewport 400×800, `/` and `/archetypes/burning-abyss/`                    | exactly 1 distinct rounded `top` across the header's visible children on each page |
| e2e `no console error or wrap warning at 400px`   | viewport 400×800, `/archetypes/burning-abyss/`                            | zero messages of type `error`; zero messages matching `/site-header wraps/` |

## Impl steps

- [x] 1. Create `website/tests/unit/header-row.test.ts` with the eleven unit rows
      above, importing `headerRowBudget` from `../../shared/header-row.mjs` and
      `resolve` from `../support/css`.
- [x] 2. Run `cd website && npx vitest run tests/unit/header-row.test.ts`;
      confirm red.
- [x] 3. Create `website/shared/header-row.mjs`:
      ```js
      /**
       * Width budget for the compact site header.
       *
       * 400px is the narrowest supported viewport. The header must hold one row
       * there; a wrap is a warning, never a build failure, so this module only
       * ever reports arithmetic — see scripts/check-header-row.mjs (build) and
       * the inline guard in src/layouts/BaseLayout.astro (browser).
       */
      export const COMPACT_VIEWPORT_PX = 400;
      /** `.site-header { padding: 0.7rem clamp(1rem, 3vw, 3rem) }` — the 1rem floor wins at 400px. */
      export const HEADER_PADDING_INLINE_PX = 32;
      /** `.site-header { gap: 0.45rem }` inside `@media (max-width: 44rem)`. */
      export const HEADER_GAP_PX = 7.2;
      /** Every control the compact header renders, at its ≤44rem width. */
      export const HEADER_CONTROLS = [
        { name: 'compact-brand', widthPx: 32 },
        { name: 'drawer-trigger', widthPx: 36 },
        { name: 'utility-more', widthPx: 39.2 },
        { name: 'search-trigger', widthPx: 48 },
      ];
      /** Inner pages add a breadcrumb; below 44rem only its last crumb shows. */
      export const BREADCRUMB_MIN_PX = 64;

      export function headerRowBudget(
        viewportPx = COMPACT_VIEWPORT_PX,
        { withBreadcrumb = true } = {},
      ) {
        const items = withBreadcrumb
          ? [...HEADER_CONTROLS, { name: 'breadcrumb', widthPx: BREADCRUMB_MIN_PX }]
          : [...HEADER_CONTROLS];
        const contentPx =
          items.reduce((total, item) => total + item.widthPx, 0) +
          HEADER_GAP_PX * (items.length - 1);
        const availablePx = viewportPx - HEADER_PADDING_INLINE_PX;
        const overflowPx = Math.max(0, contentPx - availablePx);
        return {
          viewportPx,
          items,
          contentPx: Math.round(contentPx * 10) / 10,
          availablePx,
          overflowPx: Math.round(overflowPx * 10) / 10,
          fits: overflowPx === 0,
        };
      }
      ```
- [x] 4. Create `website/scripts/check-header-row.mjs`:
      ```js
      import { COMPACT_VIEWPORT_PX, headerRowBudget } from '../shared/header-row.mjs';

      // A wrapped header is a layout smell, not a broken build: this warns and
      // always exits 0, per the feedback that asked for a warning here.
      for (const withBreadcrumb of [true, false]) {
        const budget = headerRowBudget(COMPACT_VIEWPORT_PX, { withBreadcrumb });
        if (budget.fits) continue;
        console.warn(
          `[warn] site-header may wrap at ${COMPACT_VIEWPORT_PX}px` +
            `${withBreadcrumb ? ' with a breadcrumb' : ''}: ` +
            `needs ${budget.contentPx}px, has ${budget.availablePx}px ` +
            `(over by ${budget.overflowPx}px)`,
        );
      }
      ```
- [x] 5. In `website/package.json`, append ` && node scripts/check-header-row.mjs`
      to the `build` script.
- [x] 6. In `website/src/layouts/BaseLayout.astro`, add a second
      `<script is:inline>` immediately before `</body>` (after the `<footer>`):
      ```astro
      <script is:inline>
        // 400px is the narrowest supported width and the header must hold one
        // row there. A wrap is reported, never thrown: the page stays usable,
        // the regression is visible in the console and in `npm run build`.
        (() => {
          const check = () => {
            if (window.innerWidth > 400) return;
            const header = document.querySelector('.site-header');
            if (!header) return;
            const items = header.querySelectorAll(
              '.compact-brand, .drawer-trigger, .breadcrumb, .utility-nav, .search-trigger',
            );
            const rows = new Set();
            for (const item of items) {
              if (!item.getClientRects().length) continue;
              rows.add(Math.round(item.getBoundingClientRect().top));
            }
            if (rows.size > 1) {
              console.warn(
                `[essentia] site-header wraps to ${rows.size} rows at ${window.innerWidth}px`,
              );
            }
          };
          addEventListener('load', check);
          addEventListener('resize', check);
        })();
      </script>
      ```
      (The class list, not `header.children`: `<Navigation>` and `<FindPalette>`
      are wrapped in `astro-island`, which is `display: contents` and has no box
      of its own.)
- [x] 7. In `website/src/styles/global.css`, in `@media (max-width: 44rem)` — the
      block that already holds `.breadcrumb li:not(:last-child) { display: none }`
      — add:
      ```css
      /* The last crumb is the only variable-width thing in the compact header.
         Let it shrink and ellipsise rather than wrap the whole row. */
      .breadcrumb {
        flex: 1 1 auto;
        min-width: 0;
      }
      .breadcrumb ol {
        flex-wrap: nowrap;
        min-width: 0;
      }
      .breadcrumb li {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      ```
- [x] 8. Run `cd website && npx vitest run tests/unit/header-row.test.ts`;
      confirm green.
- [x] 9. Create `website/tests/e2e/header-row.spec.ts`:
      ```ts
      import { test, expect } from '@playwright/test';

      const basePath = process.env.E2E_BASE_PATH?.replace(/\/$/, '') ?? '';
      const urlFor = (path: string) => `${basePath}${path}`;

      const rowCount = (page: import('@playwright/test').Page) =>
        page.evaluate(() => {
          const header = document.querySelector('.site-header')!;
          const items = header.querySelectorAll(
            '.compact-brand, .drawer-trigger, .breadcrumb, .utility-nav, .search-trigger',
          );
          const rows = new Set<number>();
          for (const item of items) {
            if (!item.getClientRects().length) continue;
            rows.add(Math.round(item.getBoundingClientRect().top));
          }
          return rows.size;
        });

      test('the header holds one row at 400px', async ({ page }) => {
        await page.setViewportSize({ width: 400, height: 800 });
        for (const path of ['/', '/archetypes/burning-abyss/']) {
          await page.goto(urlFor(path));
          expect(await rowCount(page), path).toBe(1);
        }
      });

      test('no console error or wrap warning at 400px', async ({ page }) => {
        const messages: Array<{ type: string; text: string }> = [];
        page.on('console', (message) =>
          messages.push({ type: message.type(), text: message.text() }),
        );
        await page.setViewportSize({ width: 400, height: 800 });
        await page.goto(urlFor('/archetypes/burning-abyss/'));
        await page.waitForLoadState('load');
        expect(messages.filter((m) => m.type === 'error')).toEqual([]);
        expect(messages.filter((m) => /site-header wraps/.test(m.text))).toEqual([]);
      });
      ```
- [x] 10. Run `cd website && npx playwright test tests/e2e/header-row.spec.ts --project=chromium`; confirm green.
- [x] 11. Prove the warning path by hand: temporarily set
      `BREADCRUMB_MIN_PX = 400` in `shared/header-row.mjs`, run
      `cd website && node scripts/check-header-row.mjs`, confirm one `[warn] …`
      line and `echo $?` prints `0`. Restore `64`.
- [x] 12. Run `cd website && npm run format && npm run ci`.
- [x] 13. Run `graphify update .` from the repo root.

## Outputs

- Files touched: `website/shared/header-row.mjs` (new),
  `website/scripts/check-header-row.mjs` (new), `website/package.json`,
  `website/src/layouts/BaseLayout.astro`, `website/src/styles/global.css`,
  `website/tests/unit/header-row.test.ts` (new),
  `website/tests/e2e/header-row.spec.ts` (new).
- Behaviour change: a wrapped compact header now warns in the build output and
  in the browser console; the breadcrumb ellipsises instead of wrapping.
- Config change: `npm run build` gains a final step.
- No migration.

## Validation

- [x] `cd website && npx vitest run tests/unit/header-row.test.ts` passes
- [x] `cd website && npm run ci` passes and prints no `[warn] site-header` line
- [x] `cd website && npx playwright test tests/e2e/header-row.spec.ts` passes on all three projects
- [x] manual: DevTools at 400×800 on `/cards/ash-blossom-and-joyous-spring/` —
      one header row, crumb ellipsised, console clean
- [x] app functional — every route renders, no console error
- [ ] commit msg draft: `test(website): warn when the compact header stops fitting one row`

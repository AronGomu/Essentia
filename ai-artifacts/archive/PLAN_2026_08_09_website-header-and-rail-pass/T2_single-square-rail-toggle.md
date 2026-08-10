# T2: One square rail toggle

**Plan:** `./ai-artifacts/PLAN_2026_08_09_website-header-and-rail-pass.md`
**Depends:** T1
**Commit outcome:** The catalog rail has exactly one collapse control — a small
square button pinned to the bottom-right corner of the rail, the same size
expanded or collapsed.

## Context (self-contained)

- Goal: rework the Essentia website shell — full-width header menubar, rail
  docked beneath it, flat colour-coded rail, compact phone header, tighter
  archetype hero. This ticket fixes the rail's collapse control.
- This slice: second of seven. It only touches the rail toggle markup, its CSS,
  and the tests that count toggles.
- Out of scope here: the rail's list contents (T3), nav item tints (T4), the
  header's phone-width compaction (T5), the 400px guard (T6), the catalog hero
  (T7). Do not touch `website/scripts/content/`, `cards_mse/`, or any Python.
- Assumptions in force: "nav drawer" in the feedback means the desktop rail
  `nav#desktop-catalog`; the mobile drawer's `×` close button is a dialog close
  control and stays.

What T1 left behind (do not re-do it, do not undo it):

- `<Navigation client:load … />` now renders **inside**
  `<header class="site-header">` in `website/src/layouts/BaseLayout.astro`,
  directly after `<a class="compact-brand">`.
- `.site-header` has `z-index: calc(var(--z-sticky) + 2)` and no `margin-left`.
- `.desktop-catalog` has `inset: var(--header) auto 0 0`.
- `.drawer-trigger` is an in-flow flex item, `display: inline-flex` below 64rem.

Current state of the toggle, verbatim, in
`website/src/components/Navigation.svelte`:

- Two buttons with identical bodies. The first sits immediately after
  `<nav id="desktop-catalog" class="desktop-catalog" aria-label={navLabel}>`
  and carries `class="rail-toggle rail-toggle--top"`. The second sits
  immediately before the closing `</nav>` and carries
  `class="rail-toggle rail-toggle--bottom"`. Both read:
  ```svelte
  <button
    class="rail-toggle rail-toggle--{top|bottom}"
    aria-expanded={railState === 'expanded'}
    aria-controls="desktop-catalog"
    on:click={toggleRail}
  >
    <span aria-hidden="true">{railState === 'expanded' ? '⟨' : '⟩'}</span>
    <span class="sr-only"
      >{railState === 'expanded' ? 'Collapse catalog' : 'Expand catalog'}</span
    >
  </button>
  ```
- `website/src/styles/global.css` near line 1656 declares
  `.rail-toggle { align-self: stretch; min-height: 2.25rem; padding: 0.35rem 0.6rem; }`
  and `.rail-toggle--bottom { margin-top: auto; }`.
- The collapsed rail is `--sidebar: 3.25rem` with
  `html[data-catalog='collapsed'] .desktop-catalog { padding-inline: 0.4rem }`,
  so the collapsed content box is ≈2.45rem wide — a 2.25rem square fits.
- `website/scripts/check-chrome.mjs` fails any built page whose HTML has no
  `rail-toggle` class token. One toggle satisfies it.

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

1. `Navigation.svelte` renders exactly one `.rail-toggle` button, inside
   `nav#desktop-catalog`, at the end of the nav.
2. The class `rail-toggle--top` exists nowhere in the repo's website sources.
3. The toggle is a square: `width: 2.25rem; height: 2.25rem`, with no padding
   stretching it, in both the expanded and the collapsed rail.
4. The toggle is pushed to the rail's right edge (`align-self: flex-end`) and to
   the rail's bottom (`margin-top: auto`).
5. Collapsing and expanding still works from that one button, and the collapsed
   strip still shows it.

## Inputs

- `website/src/components/Navigation.svelte`
- `website/src/styles/global.css`
- `website/tests/unit/rail-toggle.test.ts` (currently asserts **two** toggles)
- `website/tests/e2e/showcase.spec.ts`, test
  `catalog rail collapses to a strip that keeps both toggles` (currently
  `toHaveCount(2)` and uses `.first()` / `.last()`)
- **From T1:** `<Navigation>` renders inside `.site-header`; `.desktop-catalog`
  is `inset: var(--header) auto 0 0`. Neither is changed here.

## TDD

1. **Red** — rewrite `website/tests/unit/rail-toggle.test.ts` per the table
   below and run `cd website && npx vitest run tests/unit/rail-toggle.test.ts`;
   confirm failures.
2. **Green** — apply the impl steps.
3. **Refactor** — none. Keep green.

## Test plan

| Test                                            | Input                                                                    | Expect                                                     |
| ----------------------------------------------- | ------------------------------------------------------------------------ | ---------------------------------------------------------- |
| `renders exactly one toggle`                    | `Navigation.svelte` match count of `/class="rail-toggle/g`                | `1`                                                        |
| `the toggle lives inside the nav`               | index of that match vs `<nav id="desktop-catalog"` … `</nav>`             | strictly between them                                      |
| `the top toggle is gone`                        | `Navigation.svelte` and `global.css`                                      | neither matches `/rail-toggle--top/`                       |
| `the toggle is a square`                        | `.rail-toggle { … }` block in `global.css`                                | matches `/width:\s*2\.25rem/` and `/height:\s*2\.25rem/`    |
| `the toggle no longer stretches`                | same block                                                                | does not match `/align-self:\s*stretch/`                   |
| `the toggle sits at the rail's right edge`      | same block                                                                | matches `/align-self:\s*flex-end/`                          |
| `the toggle sits at the rail's bottom`          | `.rail-toggle--bottom { … }` block                                        | matches `/margin-top:\s*auto/`                              |
| `the collapsed rail keeps a visible strip`      | `global.css` (existing test, unchanged)                                   | `html[data-catalog='collapsed']` still sets `--sidebar: 3.25rem` |
| `the toggle is no longer fixed-position`        | `.rail-toggle { … }` block (existing test, unchanged)                     | no `position: fixed`                                        |
| e2e `catalog rail collapses to a strip that keeps its toggle` | viewport 1400×900, `/`                                     | one `Collapse catalog` button; after click `html[data-catalog] === 'collapsed'`; one `Expand catalog` button, visible; after click back to `expanded`; button box `|width − height| ≤ 1` and its right edge within 20px of the rail's right edge (the rail's own `padding: 1rem` + `border-right: 1px` = 17px, plus slack) |

## Impl steps

- [x] 1. In `website/tests/unit/rail-toggle.test.ts`, change
      `it('renders two toggles')` to `it('renders exactly one toggle')` with
      `expect(matches.length).toBe(1)`. Done.
- [x] 2. In the same file, rename `it('both toggles live inside the nav')` to
      `it('the toggle lives inside the nav')` and change
      `expect(toggleIndexes.length).toBe(2)` to `.toBe(1)`. Done.
- [x] 3. Add to the same file:
      ```ts
      it('the top toggle is gone', () => {
        expect(navigationSource).not.toMatch(/rail-toggle--top/);
        expect(globalCss).not.toMatch(/rail-toggle--top/);
      });

      it('the toggle is a small square at the rail edge', () => {
        const block = globalCss.match(/\.rail-toggle\s*\{[^}]*\}/)?.[0] ?? '';
        expect(block).toMatch(/width:\s*2\.25rem/);
        expect(block).toMatch(/height:\s*2\.25rem/);
        expect(block).toMatch(/align-self:\s*flex-end/);
        expect(block).not.toMatch(/align-self:\s*stretch/);
      });

      it('the toggle sits at the bottom of the rail', () => {
        const block = globalCss.match(/\.rail-toggle--bottom\s*\{[^}]*\}/)?.[0] ?? '';
        expect(block).toMatch(/margin-top:\s*auto/);
      });
      ```
- [x] 4. Run `cd website && npx vitest run tests/unit/rail-toggle.test.ts`;
      confirm red. Confirmed: 4 failed / 5 passed (the 3 new tests + the
      rewritten count tests failed as expected).
- [x] 5. In `website/src/components/Navigation.svelte`, delete the entire
      `<button class="rail-toggle rail-toggle--top" …> … </button>` element
      (the one directly after the opening `<nav id="desktop-catalog" …>` tag).
      Leave the `{#if mode === 'catalog'}` block that followed it untouched.
      Done.
- [x] 6. In `website/src/styles/global.css`, replace the `.rail-toggle` block
      with:
      ```css
      /* One control, bottom-right of the rail. The square keeps the same
         footprint in the 3.25rem collapsed strip as in the 17rem rail, so the
         button never moves or resizes when the rail toggles. */
      .rail-toggle {
        align-self: flex-end;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 2.25rem;
        height: 2.25rem;
        min-height: 2.25rem;
        border: 1px solid var(--ruleline);
        border-radius: var(--radius-sm);
        background: transparent;
        color: var(--cardstock);
        padding: 0;
      }
      ```
- [x] 7. Leave `.rail-toggle--bottom { margin-top: auto; }` exactly as it is.
      Unchanged.
- [x] 8. Run `cd website && npx vitest run tests/unit/rail-toggle.test.ts`;
      confirm green. Confirmed: 9 passed (9).
- [x] 9. In `website/tests/e2e/showcase.spec.ts`, rewrite the test
      `catalog rail collapses to a strip that keeps both toggles` as:
      ```ts
      test('catalog rail collapses to a strip that keeps its toggle', async ({ page }) => {
        await page.setViewportSize({ width: 1400, height: 900 });
        await page.goto(urlFor('/'));

        const collapse = page.getByRole('button', { name: 'Collapse catalog' });
        await expect(collapse).toHaveCount(1);
        await expect(collapse).toBeVisible();

        const rail = (await page.locator('.desktop-catalog').boundingBox())!;
        const box = (await collapse.boundingBox())!;
        expect(Math.abs(box.width - box.height)).toBeLessThanOrEqual(1);
        // 17px is structural and out of this ticket's scope: `.desktop-catalog`
        // has `padding: 1rem` (16px) + `border-right: 1px`, and the toggle sits
        // flush at that content edge. 20px is that plus slack; a toggle that is
        // not corner-anchored would be hundreds of px off on a ~272px rail.
        expect(rail.x + rail.width - (box.x + box.width)).toBeLessThanOrEqual(20);

        // Same `client:load` race the other rail tests guard against: a click
        // that lands before hydration is dropped with no actionability retry.
        await expect
          .poll(async () => {
            await collapse.click();
            return page.locator('html').getAttribute('data-catalog');
          })
          .toBe('collapsed');

        const expand = page.getByRole('button', { name: 'Expand catalog' });
        await expect(expand).toHaveCount(1);
        await expect(expand).toBeVisible();
        await expand.click();
        await expect(page.locator('html')).toHaveAttribute('data-catalog', 'expanded');
      });
      ```
- [x] 10. Run `showcase.spec.ts` through the Docker runbook in the Environment
      block above (chromium, firefox and webkit); confirm
      `catalog rail collapses to a strip that keeps its toggle` is green and
      that the known pre-existing `empty publication home` row is the only
      failure. Done: full spec run gave `3 failed / 2 skipped / 31 passed`,
      the 3 failures being `empty publication home is English and accessible`
      on chromium, firefox and webkit — nothing else. A targeted
      `--grep 'catalog rail collapses to a strip that keeps its toggle'` run
      gave `3 passed (32.4s)`, one ✓ per browser project.
- [x] 11. In `website/DESIGN.md`, in the paragraph beginning
      `**The One Rail Rule.**`, append: `The rail carries a single collapse
      control: a 2.25rem square at its bottom-right corner, identical expanded
      or collapsed.` Done — appended after `never touches chrome.` at
      `website/DESIGN.md:102`.
- [x] 12. Run `cd website && npm run format && npm run ci`. Done — `npm run ci`
      exits 0: `astro check` reports `0 errors / 0 warnings`, vitest reports
      `Test Files 53 passed (53)` / `Tests 581 passed (581)`, and
      `chrome: 152 pages carry the site header`. The first `npm run ci` pass
      failed one stale sibling assertion,
      `tests/unit/reading-nav.test.ts > the reading nav sits between the two
      rail toggles` (`expected [ 5050 ] to have a length of 2 but got 1`) — a
      direct consequence of this ticket's single-toggle change. It was updated
      in place to `the reading nav sits before the rail toggle`
      (`toHaveLength(1)`, switcher index `<` the toggle index), preserving its
      original intent that the reading nav is a sibling of the toggle and never
      wraps it.
- [x] 13. Run `graphify update .` from the repo root. Done — see command output
      recorded in the report.

## Outputs

- Files touched: `website/src/components/Navigation.svelte`,
  `website/src/styles/global.css`, `website/DESIGN.md`,
  `website/tests/unit/rail-toggle.test.ts`,
  `website/tests/e2e/showcase.spec.ts`, plus — not anticipated by the ticket —
  `website/tests/unit/reading-nav.test.ts`, whose `toHaveLength(2)` toggle-count
  assertion went stale the moment the second toggle was deleted and blocked this
  ticket's own `npm run ci` gate.
- Behaviour change: one rail toggle instead of two; it is a bottom-right square.
- Contract for later tickets: `nav#desktop-catalog` now opens with
  `{#if mode === 'catalog'}` and ends with the single
  `<button class="rail-toggle rail-toggle--bottom">`.
- No migration, no config change.

- [x] `cd website && npx vitest run tests/unit/rail-toggle.test.ts` passes —
      re-verified: `Test Files 1 passed (1)` / `Tests 9 passed (9)`.
- [x] `cd website && npm run ci` passes (`check-chrome.mjs` still finds a
      `rail-toggle` class token on every built page) — delete
      `website/playwright-report/` and `website/test-results/` first. Done:
      both directories removed, then `npm run ci` exited 0 with
      `0 errors / 0 warnings` from `astro check`,
      `Test Files 53 passed (53)` / `Tests 581 passed (581)`, `dist scan: clean`
      and `chrome: 152 pages carry the site header`.
      `find website -not -user aron` returned nothing — no root-owned residue
      from the Docker bind mount.
- [x] `showcase.spec.ts` passes on chromium, firefox and webkit through the
      Docker runbook, with the single known pre-existing
      `empty publication home is English and accessible` row excluded. Done:
      `3 failed / 2 skipped / 31 passed`, the 3 failures being exactly that one
      row on the three browser projects. The targeted
      `catalog rail collapses to a strip that keeps its toggle` run reported
      `3 passed (32.4s)`, one ✓ each for chromium, firefox and webkit.
- [x] manual: at 1400px, collapse and expand the rail from the single square;
      confirm the square does not change size between the two states. Verified
      by instrumented headless measurement (throwaway spec, run in the Docker
      Playwright container against the real built site at 1400×900, then
      deleted): `T2BOX expanded=36x36 @x=219 collapsed=36x36 @x=228.609375` —
      36px is 2.25rem, identical in both states, and the button stays pinned to
      the rail's right edge as the rail narrows. The human eyeball pass is
      queued in `ai-artifacts/manual_test_checklist.md` under
      `## T2 single-square-rail-toggle`.
- [x] app functional — every route renders, no console error. Verified by the
      same throwaway spec walking every `<loc>` in the built sitemap:
      `T2ROUTES checked=110 html=109 bad=0` (no response ≥ 400, `.site-header`
      visible on all 109 HTML documents; the 1 non-HTML route is `/feed.xml`)
      and `T2CONSOLE errors=0` (no `console.error`, no uncaught page error).
- [x] commit msg draft: `fix(website): leave the rail one square collapse control`

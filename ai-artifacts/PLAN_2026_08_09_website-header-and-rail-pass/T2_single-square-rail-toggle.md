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
| e2e `catalog rail collapses to a strip that keeps its toggle` | viewport 1400×900, `/`                                     | one `Collapse catalog` button; after click `html[data-catalog] === 'collapsed'`; one `Expand catalog` button, visible; after click back to `expanded`; button box `|width − height| ≤ 1` and its right edge within 12px of the rail's right edge |

## Impl steps

- [ ] 1. In `website/tests/unit/rail-toggle.test.ts`, change
      `it('renders two toggles')` to `it('renders exactly one toggle')` with
      `expect(matches.length).toBe(1)`.
- [ ] 2. In the same file, rename `it('both toggles live inside the nav')` to
      `it('the toggle lives inside the nav')` and change
      `expect(toggleIndexes.length).toBe(2)` to `.toBe(1)`.
- [ ] 3. Add to the same file:
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
- [ ] 4. Run `cd website && npx vitest run tests/unit/rail-toggle.test.ts`;
      confirm red.
- [ ] 5. In `website/src/components/Navigation.svelte`, delete the entire
      `<button class="rail-toggle rail-toggle--top" …> … </button>` element
      (the one directly after the opening `<nav id="desktop-catalog" …>` tag).
      Leave the `{#if mode === 'catalog'}` block that followed it untouched.
- [ ] 6. In `website/src/styles/global.css`, replace the `.rail-toggle` block
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
- [ ] 7. Leave `.rail-toggle--bottom { margin-top: auto; }` exactly as it is.
- [ ] 8. Run `cd website && npx vitest run tests/unit/rail-toggle.test.ts`;
      confirm green.
- [ ] 9. In `website/tests/e2e/showcase.spec.ts`, rewrite the test
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
        expect(rail.x + rail.width - (box.x + box.width)).toBeLessThanOrEqual(12);

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
- [ ] 10. Run `cd website && npx playwright test tests/e2e/showcase.spec.ts --project=chromium`; confirm green.
- [ ] 11. In `website/DESIGN.md`, in the paragraph beginning
      `**The One Rail Rule.**`, append: `The rail carries a single collapse
      control: a 2.25rem square at its bottom-right corner, identical expanded
      or collapsed.`
- [ ] 12. Run `cd website && npm run format && npm run ci`.
- [ ] 13. Run `graphify update .` from the repo root.

## Outputs

- Files touched: `website/src/components/Navigation.svelte`,
  `website/src/styles/global.css`, `website/DESIGN.md`,
  `website/tests/unit/rail-toggle.test.ts`,
  `website/tests/e2e/showcase.spec.ts`.
- Behaviour change: one rail toggle instead of two; it is a bottom-right square.
- Contract for later tickets: `nav#desktop-catalog` now opens with
  `{#if mode === 'catalog'}` and ends with the single
  `<button class="rail-toggle rail-toggle--bottom">`.
- No migration, no config change.

## Validation

- [ ] `cd website && npx vitest run tests/unit/rail-toggle.test.ts` passes
- [ ] `cd website && npm run ci` passes (`check-chrome.mjs` still finds a
      `rail-toggle` class token on every built page)
- [ ] `cd website && npx playwright test tests/e2e/showcase.spec.ts` passes on all three projects
- [ ] manual: at 1400px, collapse and expand the rail from the single square;
      confirm the square does not change size between the two states
- [ ] app functional — every route renders, no console error
- [ ] commit msg draft: `fix(website): leave the rail one square collapse control`

# T8: Rail toggles inside nav

**Plan:** `./ai-artifacts/PLAN_2026_08_08_website-feedback-pass-2.md`
**Depends:** T7
**Commit outcome:** The catalog rail carries its collapse toggle at both its top and its bottom, and collapsing turns the rail into a narrow strip that still shows both toggles instead of sliding off screen.

## Context (self-contained)

- Goal: website feedback pass 2. This ticket delivers feedback item **"Nav 2"**:
  "Move `rail-toggle` for nav collapse inside the nav. Duplicate it to add the same
  button to the bottom of the nav. When collapsed, show the current top and bottom."
- This slice: the toggle buttons move from a fixed-position element outside the nav
  to two children of the nav, and the collapsed state becomes a visible strip rather
  than a hidden panel.
- Out of scope here: the brand (done in T7 — the nav has no brand any more), the
  docs/blog reading rail migration (T10), keyword rulings, MSE card data, hero art,
  section intros.
- Assumptions in force: `graphify` is not installed — do not run it. Collapsed
  sidebar width is **3.25rem** (was `0rem`); the nav stays in flow so the header,
  main and footer margins follow `--sidebar` exactly as they do today.

## Requirements

- `website/src/components/Navigation.svelte` renders two buttons, both
  `class="rail-toggle"`, both wired to `toggleRail()`, both carrying
  `aria-expanded={railState === 'expanded'}` and `aria-controls="desktop-catalog"`:
  - `.rail-toggle--top` as the first child of `<nav id="desktop-catalog">`
  - `.rail-toggle--bottom` as the last child of the same nav
- The standalone fixed-position `<button class="rail-toggle">` that currently sits
  between `.drawer-trigger` and `<nav>` is deleted.
- Collapsed state: `html[data-catalog='collapsed'] { --sidebar: 3.25rem; }`; the nav
  keeps `transform: none` and `visibility: visible`; every nav child except the two
  toggles is hidden.
- Both toggles remain reachable by keyboard and screen reader in both states.
- `website/scripts/check-chrome.mjs` keeps passing its
  `page is missing the catalog rail toggle` rule (it greps for `class="rail-toggle"`).
- Mobile (`max-width: 64rem`): the whole `.desktop-catalog` is already
  `display: none`, so the toggles disappear with it; the now-redundant
  `@media (max-width: 64rem) { .rail-toggle { display: none; } }` rule is deleted.

## Inputs

- `website/src/components/Navigation.svelte`:
  - `railState`, `toggleRail()`, `readRailState()`, `applyRailState()`,
    `writeRailState()` already exist (imported from `../lib/catalog-rail`).
  - lines 93–103, the standalone toggle:
    ```svelte
    <button
      class="rail-toggle"
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
  - line 105 `<nav id="desktop-catalog" class="desktop-catalog" aria-label="Catalog">`;
    after T7 its first child is `<button class="nav-group" …>Non-Archetype …</button>`.
- `website/src/styles/global.css`:
  - `.desktop-catalog` line 352: `position: fixed; inset: 0 auto 0 0; z-index: var(--z-sticky); width: var(--sidebar); overflow-y: auto; border-right: 1px solid var(--ruleline); background: var(--blackfoil-raised); padding: 1rem;`
  - lines 1698–1728:
    ```css
    html[data-catalog='collapsed'] { --sidebar: 0rem; }
    html[data-catalog='collapsed'] .desktop-catalog { transform: translateX(-100%); visibility: hidden; }
    .desktop-catalog { transition: transform 220ms var(--ease-out), visibility 0s linear 220ms; }
    html[data-catalog='expanded'] .desktop-catalog { transition: transform 220ms var(--ease-out), visibility 0s; }
    .rail-toggle { position: fixed; z-index: calc(var(--z-sticky) + 1); top: 0.9rem; left: calc(var(--sidebar) + 0.5rem); min-height: 2.25rem; padding: 0.35rem 0.6rem; transition: left 220ms var(--ease-out); }
    @media (max-width: 64rem) { .rail-toggle { display: none; } }
    ```
  - `@media (prefers-reduced-motion: reduce)` at line 1729 lists `.desktop-catalog`,
    `.rail-toggle`, `.site-header`, `main`, `.site-footer` with `transition: none;` —
    keep it as is.
- `website/src/layouts/BaseLayout.astro` line 91 —
  `<html … data-catalog="expanded">`, and the pre-paint inline script at lines
  120–128 that flips it to `collapsed` from `localStorage`.
- `website/src/lib/catalog-rail.ts` — unchanged by this ticket; `RAIL_STORAGE_KEY`
  is `essentia.v1.catalog-rail`.
- `website/tests/unit/chrome.test.ts` line ~50 uses
  `<button class="rail-toggle" aria-expanded="true"></button>` in its page fixture,
  and line ~787 has `flags a page with no rail-toggle button`. Both keep working.
- **From Depends (T7):** `Navigation.svelte` no longer renders
  `<a class="brand" …>`; `.desktop-catalog` padding is `1rem`; the wordmark lives in
  the header so nothing in the nav needs to survive collapse for branding.

## TDD

1. **Red** — add `website/tests/unit/rail-toggle.test.ts` and the e2e test below;
   they fail.
2. **Green** — move the buttons into the nav and rewrite the collapsed-state CSS.
3. **Refactor** — delete the dead fixed-position rules; keep green.

## Test plan

Unit: `cd website && npm run test`. E2E: `cd website && npm run test:e2e`.

| Test | Input | Expect |
| ---- | ----- | ------ |
| `rail-toggle.test.ts` › `renders two toggles` | source of `src/components/Navigation.svelte` | exactly 2 matches of `/class="rail-toggle/g` |
| `rail-toggle.test.ts` › `both toggles live inside the nav` | same source | both `rail-toggle` indexes are greater than the index of `<nav id="desktop-catalog"` and less than the index of `</nav>` |
| `rail-toggle.test.ts` › `the collapsed rail keeps a visible strip` | `global.css` | matches `/html\[data-catalog='collapsed'\]\s*\{[^}]*--sidebar:\s*3\.25rem/` |
| `rail-toggle.test.ts` › `the collapsed rail no longer slides away` | `global.css` | does not match `/data-catalog='collapsed'\]\s*\.desktop-catalog\s*\{[^}]*translateX/` |
| `rail-toggle.test.ts` › `the collapsed rail hides everything but the toggles` | `global.css` | matches `/html\[data-catalog='collapsed'\]\s*\.desktop-catalog\s*>\s*:not\(\.rail-toggle\)\s*\{[^}]*display:\s*none/` |
| `rail-toggle.test.ts` › `the toggle is no longer fixed-position` | `.rail-toggle {` block | does not match `/position:\s*fixed/` |
| `chrome.test.ts` (existing) | unchanged fixtures | still green |
| `showcase.spec.ts` › new `catalog rail collapses to a strip that keeps both toggles` | `/` at 1400×900 | 2 buttons named `Collapse catalog` visible; click the first; `html` gets `data-catalog="collapsed"`; 2 buttons named `Expand catalog` still visible; click the last; back to `expanded` |

## Impl steps

- [x] 1. In `Navigation.svelte`, delete the standalone toggle at lines 93–103.
      Evidence: `git diff` on `website/src/components/Navigation.svelte` shows the
      block removed.
- [x] 2. Add a Svelte snippet-free duplicate by writing the button markup twice
      (Svelte 5 is in use, but two literal buttons are clearer than a snippet here).
      Insert as the **first** child of `<nav id="desktop-catalog" …>`:
      ```svelte
      <button
        class="rail-toggle rail-toggle--top"
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
      Evidence: built `dist/index.html` contains
      `<button class="rail-toggle rail-toggle--top" aria-expanded="true" aria-controls="desktop-catalog">`
      as the first element inside `<nav id="desktop-catalog">`.
- [x] 3. Insert the identical button as the **last** child of the same nav, with
      `class="rail-toggle rail-toggle--bottom"`. Evidence: built `dist/index.html`
      contains the `--bottom` button, index inside the `<nav>…</nav>` span, verified
      by script.
- [x] 4. In `global.css`, change `.desktop-catalog` to add
      `display: flex;` and `flex-direction: column;` (keep every existing declaration).
      Evidence: `website/src/styles/global.css:352-363` now includes both declarations
      alongside the original ones.
- [x] 5. Replace the block at lines 1698–1728 with:
      ```css
      html[data-catalog='collapsed'] {
        --sidebar: 3.25rem;
      }
      /* Collapsed is a strip, not a hidden panel: both toggles stay on screen so the
         rail can always be reopened from the top or the bottom of the viewport. */
      html[data-catalog='collapsed'] .desktop-catalog > :not(.rail-toggle) {
        display: none;
      }
      html[data-catalog='collapsed'] .desktop-catalog {
        padding-inline: 0.4rem;
      }
      .desktop-catalog {
        transition: width 220ms var(--ease-out);
      }
      .rail-toggle {
        align-self: stretch;
        min-height: 2.25rem;
        padding: 0.35rem 0.6rem;
      }
      .rail-toggle--bottom {
        margin-top: auto;
      }
      ```
- [x] 6. Delete the `@media (max-width: 64rem) { .rail-toggle { display: none; } }`
      rule. Evidence: `grep -c "display: none" global.css` block confirms the rule is
      gone from the collapsed-rail section; compiled CSS bundle has no such rule.
- [x] 7. Leave `@media (prefers-reduced-motion: reduce)` untouched; it already names
      `.desktop-catalog` and `.rail-toggle`. Evidence: block unchanged in diff.
- [x] 8. Add `website/tests/unit/rail-toggle.test.ts` with the six unit rows.
      Evidence: file created; each of the 6 assertions mutation-tested red→green
      (broke the rule it asserts, confirmed failure, restored).
- [x] 9. Add the new e2e test to `website/tests/e2e/showcase.spec.ts`.
      **Not run** — Playwright is unrunnable on this host (`libglib-2.0.so.0`
      missing at browser launch, pre-existing per PREFLIGHT). Added per the ticket's
      test-plan row but unverified by execution.
- [x] 10. `cd website && npm run format && npm run test` → exit 0 in the disposable
      worktree (main checkout `npm run test` shows 2 pre-existing failures from the
      owner's in-flight `blog/` edit, unrelated to this ticket — see State below).
- [x] 11. `cd website && npm run build` → exit 0 in the worktree. Required a 1-line
      fix outside the ticket's declared file list — see Assumptions.
- [ ] 12. `cd website && npm run test:e2e` → **not run**, Playwright unrunnable on
      this host (browser launch fails). Unchecked per instructions; evidence is the
      PREFLIGHT note and the repeat failure at browser launch.

## Outputs

- Files touched: `website/src/components/Navigation.svelte`,
  `website/src/styles/global.css`, new `website/tests/unit/rail-toggle.test.ts`,
  `website/tests/e2e/showcase.spec.ts`.
- Public API / behaviour change: collapsed sidebar is 3.25rem wide and keeps two
  visible toggles; the toggle is no longer a fixed-position overlay.
- Migrate / config: none. The persisted `essentia.v1.catalog-rail` value is unchanged.

## Validation

- [x] tests pass: `cd website && npm run ci` → exit 0 in the disposable worktree,
      `Test Files 50 passed (50)`, `Tests 486 passed (486)`, `151 page(s) built`,
      `dist scan: clean`. `npm run test:e2e` — **not run**, unrunnable on this host
      (Playwright browsers fail to launch, missing `libglib-2.0.so.0`).
- [ ] manual check: collapse the rail — a narrow strip remains with a toggle at the
      top and one at the bottom; content reflows to the strip width, not to zero.
      **Not checked — no browser available on this host.** Mechanical evidence
      instead: compiled CSS sets `--sidebar:3.25rem` on collapse and hides every
      `.desktop-catalog` child except `.rail-toggle` via `:not()`; `.site-header`/
      `main`/`.site-footer` margin-left rules key off the same `--sidebar` token.
- [ ] manual check: keyboard `Tab` reaches both toggles in both states and the
      `Collapse catalog` / `Expand catalog` names swap correctly. **Not checked —
      no browser.** Mechanical evidence: both toggles are real `<button>` elements
      inside the nav with no `display:none`/`hidden`/`tabindex="-1"` applied to them
      in either state; `aria-expanded`/label text are driven by the same
      `railState === 'expanded'` ternary as before.
- [ ] manual check: reload with the rail collapsed — no flash of the expanded rail
      (the pre-paint script still runs). **Not checked — no browser.** Pre-paint
      script in `BaseLayout.astro` is unmodified by this ticket.
- [x] app functional — `cd website && npm run build` exits 0 in the disposable
      worktree; `151 page(s) built`, `dist scan: clean`, `check-chrome.mjs` silent
      on the rail-toggle rule.
- [x] commit msg draft: `feat(website): put the rail toggle inside the nav, top and bottom`

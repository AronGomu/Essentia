# T1: Header owns the top row

**Plan:** `./ai-artifacts/PLAN_2026_08_09_website-header-and-rail-pass.md`
**Depends:** none
**Commit outcome:** The site header spans the full viewport width above the
catalog rail, the rail starts at the header's bottom border, and the brand holds
the true top-left corner at every width.

## Context (self-contained)

- Goal: rework the Essentia website shell — full-width header menubar, rail
  docked beneath it, flat colour-coded rail, compact phone header, tighter
  archetype hero. This ticket does the shell geometry.
- This slice: first of seven. Everything after it assumes the header is a
  full-width flex row that contains the `<Navigation>` island.
- Out of scope here: removing the rail's top toggle (T2), flattening the rail
  groups (T3), nav item tints (T4), phone-width label compaction and the `⋯`
  menu (T5), the 400px guard (T6), the catalog hero (T7). Do not touch
  `website/scripts/content/`, `cards_mse/`, or any Python.
- Assumptions in force: plan artefacts live in `ai-artifacts/`;
  `astro-island { display: contents }` is shipped by Astro (verified in
  `website/dist/index.html`), so an island nested in a flex container is
  transparent to layout.

Current state, verbatim:

- `website/src/layouts/BaseLayout.astro` renders, inside `<body>`:
  `<a class="skip-link">`, then `<Navigation client:load … />`, then
  `<header class="site-header">` (brand → optional `<Breadcrumb>` →
  `<nav class="utility-nav">` → `<FindPalette client:load>`), then `<main>`.
- `website/src/styles/global.css` line ~213 `.site-header` declares
  `margin-left: var(--sidebar); transition: margin-left 220ms var(--ease-out);`
  and `z-index: var(--z-sticky);`.
- `.desktop-catalog` (line ~355) declares `inset: 0 auto 0 0;` and
  `z-index: var(--z-sticky);` — it currently runs the full viewport height and
  the header is pushed to its right.
- `@media (max-width: 64rem)` (line ~1056) declares
  `.drawer-trigger { position: fixed; z-index: calc(var(--z-sticky) + 1); top: 0.8rem; left: 1rem; display: inline-flex; gap: 0.4rem; }`,
  `.site-header, main, .site-footer { margin-left: 0 }` and
  `.site-header { padding-left: 8.8rem }`.
- `@media (max-width: 44rem)` (line ~1087) declares `.site-header { padding-left: 7.8rem }`.
- `--header: 4.5rem` and `--sidebar: 17rem` are tokens in `:root`.

## Requirements

1. `.site-header` starts at viewport x = 0 at every width and is never offset by
   `--sidebar`.
2. `.site-header` paints above `.desktop-catalog`.
3. `.desktop-catalog` starts vertically at the header's bottom border on every
   page (`inset: var(--header) auto 0 0`).
4. The brand (`.compact-brand`) is the first laid-out child of `.site-header` at
   every width; nothing is fixed-positioned over the top-left corner.
5. The hamburger (`.drawer-trigger`) becomes a normal in-flow header item,
   rendered directly after the brand, visible only below 64rem.
6. `main` and `.site-footer` keep `margin-left: var(--sidebar)` above 64rem.
7. `.site-header` declares no `transform`, `filter`, `backdrop-filter` or
   `will-change` — any of those would make it the containing block for the
   `position: fixed` rail nested inside it and break the layout.

## Inputs

- `website/src/layouts/BaseLayout.astro`
- `website/src/components/Navigation.svelte` (read only — the markup moves, the
  component does not change in this ticket)
- `website/src/styles/global.css`
- `website/tests/unit/header-brand.test.ts`
- `website/tests/support/css.ts` — exports `resolve(css, selector, property, widthPx)`
  returning the value that wins at that viewport width, and `flatten(css)`.
- `website/tests/e2e/showcase.spec.ts`
- **From Depends:** none.

## TDD

1. **Red** — add `website/tests/unit/header-priority.test.ts` with the seven
   tests below, and edit `website/tests/unit/header-brand.test.ts` so both
   `brandHoldsTheLeftEdge` calls include `.drawer-trigger`. Run
   `cd website && npx vitest run tests/unit/header-priority.test.ts tests/unit/header-brand.test.ts`
   and confirm failures.
2. **Green** — apply the impl steps until both files pass.
3. **Refactor** — none expected. Keep green.

## Test plan

| Test                                                                | Input                                                                | Expect                                                            |
| ------------------------------------------------------------------- | -------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `the header is never offset by the sidebar`                          | `resolve(css, '.site-header', 'margin-left', w)` for w ∈ 1440/1280/900/704/390 | `undefined` or `'0'` — never contains `--sidebar`         |
| `the header paints above the rail`                                   | `resolve(css, '.site-header', 'z-index', 1280)`                       | `'calc(var(--z-sticky) + 2)'`                                     |
| `the rail docks under the header`                                    | `resolve(css, '.desktop-catalog', 'inset', 1280)`                     | `'var(--header) auto 0 0'`                                        |
| `the header is not a containing block for fixed children`            | `resolve(css, '.site-header', p, w)` for p ∈ transform/filter/backdrop-filter/will-change, w ∈ 1440/1280/900/704/390 | `undefined` for every pair                 |
| `the hamburger is in flow`                                           | `resolve(css, '.drawer-trigger', 'position', w)` for the same widths  | never `'fixed'`                                                   |
| `the header reserves no room for a floating hamburger`               | `resolve(css, '.site-header', 'padding-left', w)` for the same widths | `undefined` (no `8.8rem` / `7.8rem` reservation left)             |
| `the navigation island renders inside the header, after the brand`   | `BaseLayout.astro` source indexes                                     | `indexOf('<header class="site-header"')` < `indexOf('<Navigation')` and `indexOf('class="compact-brand"')` < `indexOf('<Navigation')` < `indexOf('<nav class="utility-nav"')` |
| `the content column still clears the rail`                           | `resolve(css, 'main', 'margin-left', 1280)` and at 390                | `'var(--sidebar)'` at 1280, `'0'` at 390                          |
| `brand holds the left edge` (header-brand.test.ts, edited)           | children `['.compact-brand', '.drawer-trigger', '.utility-nav']` and `['.compact-brand', '.drawer-trigger', '.breadcrumb', '.utility-nav']`, widths 1440/1280/900/704/390 | `true` for every width |
| e2e `header owns the top row and the rail docks beneath it`          | viewport 1400×900, `/`                                                | header box `x === 0` and `width === 1400`; rail box `y >= header.y + header.height - 1`; brand box `x < 40` |

## Impl steps

- [ ] 1. Preflight — run `cd website && npm run ci` and confirm it is green
      before touching anything. If it is red, stop and report.
- [ ] 2. Preflight — run `cd website && npx playwright test --list`. If it fails
      with a missing-browser error, run
      `cd website && npx playwright install chromium firefox webkit`
      (add `--with-deps` only if the run asks for system packages; that needs
      `sudo` → `TODO(user)`).
- [ ] 3. In `website/tests/unit/header-priority.test.ts` (new file), import
      `readFileSync`, `fileURLToPath`, `describe/expect/it` from `vitest` and
      `resolve` from `../support/css`, read `../../src/styles/global.css` and
      `../../src/layouts/BaseLayout.astro`, and write the eight unit rows of the
      test plan above (all rows except the two `header-brand.test.ts` edits in
      step 4) with `const WIDTHS = [1440, 1280, 900, 704, 390];`.
- [ ] 4. In `website/tests/unit/header-brand.test.ts`, change the array in
      `it('the brand holds the left edge on the home page, at every width')` to
      `['.compact-brand', '.drawer-trigger', '.utility-nav']` and the array in
      `it('the brand holds the left edge on a page with a breadcrumb')` to
      `['.compact-brand', '.drawer-trigger', '.breadcrumb', '.utility-nav']`.
- [ ] 5. Run the two test files; confirm red.
- [ ] 6. In `website/src/layouts/BaseLayout.astro`, cut the whole
      `<Navigation client:load … />` element (currently between the skip link and
      `<header class="site-header">`) and paste it inside `<header
      class="site-header">`, immediately after the closing `</a>` of
      `<a class="compact-brand" …>` and before `{breadcrumb && <Breadcrumb …>}`.
- [ ] 7. Above the pasted element add the comment:
      `{/* The hamburger is a header item, not a floating button: the brand must own the top-left corner at every width. Astro's astro-island is display:contents, so the island is transparent to this flex row. */}`
      (Astro comment syntax: `<!-- … -->` at the top level of the template.)
- [ ] 8. In `website/src/styles/global.css`, in the `.site-header` block
      (`@layer layout`), delete `margin-left: var(--sidebar);` and
      `transition: margin-left 220ms var(--ease-out);`, and change
      `z-index: var(--z-sticky);` to `z-index: calc(var(--z-sticky) + 2);`.
      Add above the block the comment
      `/* Full-width menubar: it outranks the rail, so no transform/filter/will-change may be added here — the fixed rail is nested inside it. */`
- [ ] 9. In the `.desktop-catalog` block, change `inset: 0 auto 0 0;` to
      `inset: var(--header) auto 0 0;`.
- [ ] 10. Add a base `.drawer-trigger` block in `@layer components`, replacing
      the current `.drawer-trigger { display: none; }`:
      ```css
      .drawer-trigger {
        display: none;
        align-items: center;
        gap: 0.4rem;
        min-height: 2.75rem;
        border: 1px solid var(--ruleline);
        border-radius: var(--radius-sm);
        background: transparent;
        color: inherit;
        padding: 0.5rem 0.8rem;
      }
      ```
- [ ] 11. In `@media (max-width: 64rem)`, replace the `.drawer-trigger { … }`
      block with `.drawer-trigger { display: inline-flex; }` (drop
      `position`, `z-index`, `top`, `left`, `gap`).
- [ ] 12. In the same media block, change
      `.site-header, main, .site-footer { margin-left: 0; }` to
      `main, .site-footer { margin-left: 0; }`, and delete the
      `.site-header { padding-left: 8.8rem; }` block together with the two
      comment lines above it that explain the old `justify-content` override.
- [ ] 13. In `@media (max-width: 44rem)` (the block near line 1087 that also sets
      `.compact-brand img`), delete `.site-header { padding-left: 7.8rem; }`.
- [ ] 14. Run `cd website && npx vitest run tests/unit/header-priority.test.ts tests/unit/header-brand.test.ts`; confirm green.
- [ ] 15. Append to `website/tests/e2e/showcase.spec.ts`:
      ```ts
      test('header owns the top row and the rail docks beneath it', async ({ page }) => {
        await page.setViewportSize({ width: 1400, height: 900 });
        await page.goto(urlFor('/'));
        const header = (await page.locator('.site-header').boundingBox())!;
        const rail = (await page.locator('.desktop-catalog').boundingBox())!;
        const brand = (await page.locator('.compact-brand').boundingBox())!;
        expect(header.x).toBe(0);
        expect(header.width).toBe(1400);
        expect(rail.y).toBeGreaterThanOrEqual(header.y + header.height - 1);
        expect(brand.x).toBeLessThan(40);
      });
      ```
- [ ] 16. Run `cd website && npx playwright test tests/e2e/showcase.spec.ts --project=chromium`; confirm green.
- [ ] 17. In `website/DESIGN.md`, under the paragraph that begins
      `**The One Home Rule.**`, append the sentence: `The header is the full
      width of the viewport and paints above the rail; the rail starts at the
      header's bottom border.`
- [ ] 18. Run `cd website && npm run format && npm run ci`.
- [ ] 19. Run `graphify update .` from the repo root.

## Outputs

- Files touched: `website/src/layouts/BaseLayout.astro`,
  `website/src/styles/global.css`, `website/DESIGN.md`,
  `website/tests/unit/header-brand.test.ts`,
  `website/tests/unit/header-priority.test.ts` (new),
  `website/tests/e2e/showcase.spec.ts`.
- Behaviour change: header is full-width and above the rail; rail top is
  `var(--header)`; the hamburger is an in-flow header button below 64rem.
- Contract for later tickets: `<Navigation>` now renders **inside**
  `<header class="site-header">`, directly after `.compact-brand`. The header's
  laid-out children, in order, are `.compact-brand`, `.drawer-trigger`
  (≤64rem only), `.breadcrumb` (optional), `.utility-nav`, `.search-trigger`.
- No migration, no config change.

## Validation

- [ ] `cd website && npx vitest run tests/unit/header-priority.test.ts tests/unit/header-brand.test.ts` passes
- [ ] `cd website && npm run ci` passes (`check-chrome.mjs` still finds the
      utility nav, the rail state and the rail toggle in every built page)
- [ ] `cd website && npx playwright test tests/e2e/showcase.spec.ts` passes on all three projects
- [ ] manual: `cd website && npm run dev`, open `http://localhost:4321/`, confirm
      the wordmark is flush to the top-left, the rail begins under the header
      line, and at 900px the hamburger sits immediately right of the wordmark
- [ ] app functional — every route renders, no console error
- [ ] commit msg draft: `fix(website): give the header the whole top row above the rail`

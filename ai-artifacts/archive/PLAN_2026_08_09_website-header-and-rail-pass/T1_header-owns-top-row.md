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

### Environment — verified by the parent, do not rediscover

- **Playwright cannot launch natively on this host.** It is NixOS; the
  downloaded chromium/firefox/webkit binaries fail on missing
  `libglib-2.0.so.0` / `libgtk-3.so.0`, and `playwright install-deps` needs
  sudo, which is blocked. Run e2e through Docker instead:

  ```bash
  docker pull mcr.microsoft.com/playwright:v1.61.1-noble   # once, separately
  cd /home/aron/projects/essentia/website && docker run --rm --ipc=host \
    -v /home/aron/projects/essentia:/work -w /work/website \
    mcr.microsoft.com/playwright:v1.61.1-noble \
    bash -c "npm ci --no-audit --no-fund && npx playwright test tests/e2e/showcase.spec.ts"
  ```

  The in-container `npm ci` is required and must run first, in the same
  `bash -c`. `playwright.config.ts` starts its own web server
  (`npm run build && node scripts/serve-dist.mjs`) inside the container. After
  the container exits, run `npm run format && npm run ci` on the host, then
  `find /home/aron/projects/essentia/website -not -user aron` and confirm it is
  empty (no root-owned files left by the bind mount).

- **One e2e row already fails on `main`, unrelated to this ticket.**
  `empty publication home is English and accessible`
  (`website/tests/e2e/showcase.spec.ts:7`) asserts the heading
  `No release packages published yet.`, which `website/src/pages/index.astro:142`
  renders only when no sections are published. Sections *are* published in this
  checkout, so the assertion is stale. It is out of this plan's scope — **do not
  fix it, do not touch `index.astro`**. Treat the e2e gate as green when that
  single row is the only failure.

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
| e2e `header owns the top row and the rail docks beneath it`          | viewport 1400×900, `/`                                                | header box `x === 0` and `width === 1400`; rail box `y >= header.y + header.height - 1`; brand box `x <= 48` |

## Impl steps

- [x] 1. Preflight — run `cd website && npm run ci` and confirm it is green
      before touching anything. If it is red, stop and report.
- [x] 2. Preflight — run `cd website && npx playwright test --list`. If it fails
      with a missing-browser error, run
      `cd website && npx playwright install chromium firefox webkit`
      (add `--with-deps` only if the run asks for system packages; that needs
      `sudo` → `TODO(user)`).
- [x] 3. In `website/tests/unit/header-priority.test.ts` (new file), import
      `readFileSync`, `fileURLToPath`, `describe/expect/it` from `vitest` and
      `resolve` from `../support/css`, read `../../src/styles/global.css` and
      `../../src/layouts/BaseLayout.astro`, and write the eight unit rows of the
      test plan above (all rows except the two `header-brand.test.ts` edits in
      step 4) with `const WIDTHS = [1440, 1280, 900, 704, 390];`.
- [x] 4. In `website/tests/unit/header-brand.test.ts`, change the array in
      `it('the brand holds the left edge on the home page, at every width')` to
      `['.compact-brand', '.drawer-trigger', '.utility-nav']` and the array in
      `it('the brand holds the left edge on a page with a breadcrumb')` to
      `['.compact-brand', '.drawer-trigger', '.breadcrumb', '.utility-nav']`.
- [x] 5. Run the two test files; confirm red.
- [x] 6. In `website/src/layouts/BaseLayout.astro`, cut the whole
      `<Navigation client:load … />` element (currently between the skip link and
      `<header class="site-header">`) and paste it inside `<header
      class="site-header">`, immediately after the closing `</a>` of
      `<a class="compact-brand" …>` and before `{breadcrumb && <Breadcrumb …>}`.
- [x] 7. Above the pasted element add the comment:
      `{/* The hamburger is a header item, not a floating button: the brand must own the top-left corner at every width. Astro's astro-island is display:contents, so the island is transparent to this flex row. */}`
      (Astro comment syntax: `<!-- … -->` at the top level of the template.)
- [x] 8. In `website/src/styles/global.css`, in the `.site-header` block
      (`@layer layout`), delete `margin-left: var(--sidebar);` and
      `transition: margin-left 220ms var(--ease-out);`, and change
      `z-index: var(--z-sticky);` to `z-index: calc(var(--z-sticky) + 2);`.
      Add above the block the comment
      `/* Full-width menubar: it outranks the rail, so no transform/filter/will-change may be added here — the fixed rail is nested inside it. */`
- [x] 9. In the `.desktop-catalog` block, change `inset: 0 auto 0 0;` to
      `inset: var(--header) auto 0 0;`.
- [x] 10. Add a base `.drawer-trigger` block in `@layer components`, replacing
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
- [x] 11. In `@media (max-width: 64rem)`, replace the `.drawer-trigger { … }`
      block with `.drawer-trigger { display: inline-flex; }` (drop
      `position`, `z-index`, `top`, `left`, `gap`).
- [x] 12. In the same media block, change
      `.site-header, main, .site-footer { margin-left: 0; }` to
      `main, .site-footer { margin-left: 0; }`, and delete the
      `.site-header { padding-left: 8.8rem; }` block together with the two
      comment lines above it that explain the old `justify-content` override.
- [x] 13. In `@media (max-width: 44rem)` (the block near line 1087 that also sets
      `.compact-brand img`), delete `.site-header { padding-left: 7.8rem; }`.
- [x] 14. Run `cd website && npx vitest run tests/unit/header-priority.test.ts tests/unit/header-brand.test.ts`; confirm green.
- [x] 15. Append to `website/tests/e2e/showcase.spec.ts`:
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
        // 48px is the ceiling of the header's own `clamp(1rem, 3vw, 3rem)`
        // horizontal padding, so the brand sits at the header's content edge.
        // The pre-change layout put it at ~141px (an 8.8rem padding reservation
        // for the floating hamburger), so this still discriminates.
        expect(brand.x).toBeLessThanOrEqual(48);
      });
      ```
      Re-verified against the amended ticket: the appended block in
      `website/tests/e2e/showcase.spec.ts` now ends with the three comment lines
      and `expect(brand.x).toBeLessThanOrEqual(48);` (the earlier
      `toBeLessThan(40)` is gone). Prettier reflowed only the `async ({ page })`
      signature; `npm run format` is a no-op on the file.
- [x] 16. Run the e2e file through the Docker runbook in Context (Playwright
      cannot launch natively on this host). Confirm the only failing row is the
      known pre-existing `empty publication home is English and accessible`;
      `header owns the top row and the rail docks beneath it` must be green on
      chromium, firefox and webkit.
      Evidence — Docker run of `npx playwright test tests/e2e/showcase.spec.ts`
      in `mcr.microsoft.com/playwright:v1.61.1-noble`: `31 passed (47.3s)`,
      `2 skipped`, `3 failed` — all three failures are
      `showcase.spec.ts:7:1 › empty publication home is English and accessible`
      (chromium/firefox/webkit), the known pre-existing row. The new row passed
      everywhere:
      `✓ 34 [chromium] › showcase.spec.ts:246:1 › header owns the top row and the rail docks beneath it (232ms)`,
      `✓ 35 [webkit] … (617ms)`, `✓ 36 [firefox] … (454ms)`.
- [x] 17. In `website/DESIGN.md`, under the paragraph that begins
      `**The One Home Rule.**`, append the sentence: `The header is the full
      width of the viewport and paints above the rail; the rail starts at the
      header's bottom border.`
- [x] 18. Run `cd website && npm run format && npm run ci`.
- [x] 19. Run `graphify update .` from the repo root.

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

- [x] `cd website && npx vitest run tests/unit/header-priority.test.ts tests/unit/header-brand.test.ts` passes
- [x] `cd website && npm run ci` passes (`check-chrome.mjs` still finds the
      utility nav, the rail state and the rail toggle in every built page)
      — re-run after the Docker e2e: `CI_EXIT=0`,
      `Test Files 53 passed (53)`, `Tests 578 passed (578)`,
      `csp: hashed inline content in 152 HTML files`, `dist scan: clean`,
      `404: redirects to site root`, `chrome: 152 pages carry the site header`.
      `find website -not -user aron` → 0 entries (no root-owned bind-mount
      residue).
- [x] `showcase.spec.ts` passes on chromium, firefox and webkit through the
      Docker runbook in Context, with the single known pre-existing
      `empty publication home is English and accessible` row excluded
      — `31 passed, 2 skipped, 3 failed`; the 3 failures are that one row on the
      3 browsers. `header owns the top row and the rail docks beneath it` green
      on chromium, firefox and webkit.
- [x] manual: `cd website && npm run dev`, open `http://localhost:4321/`, confirm
      the wordmark is flush to the top-left, the rail begins under the header
      line, and at 900px the hamburger sits immediately right of the wordmark
      — no browser can run natively on this host, so this was verified with a
      throwaway Playwright spec driven through the same Docker runbook (the spec
      was deleted afterwards; it is not part of the diff). Measured boxes:
      at 1400×900 `header={x:0,y:0,width:1400,height:72.55}`,
      `brand={x:42,y:17.27,width:160,height:37}`,
      `rail={x:0,y:72,width:272,height:828}` — the wordmark is flush to the
      header's content edge and the rail starts at the header's bottom border.
      At 900×900 `header={x:0,width:900}`, `brand={x:27,width:115.4}`,
      `trigger={x:158.4,width:102.7}` — the hamburger begins 16px right of the
      wordmark's right edge, immediately after it, with nothing in between.
      Human re-confirmation is queued in `ai-artifacts/manual_test_checklist.md`.
- [x] app functional — every route renders, no console error
      — crawled all 110 `sitemap.xml` routes in Chromium with `console`/
      `pageerror` listeners attached: every route returned a status < 400, every
      HTML route carried exactly one `.site-header`, and zero console errors or
      page errors were emitted. The single reported exception was
      `/feed.xml has 0 .site-header (ct=application/xml; charset=utf-8)`, which
      is the RSS feed and carries no shell by design.
- [x] commit msg draft: `fix(website): give the header the whole top row above the rail`

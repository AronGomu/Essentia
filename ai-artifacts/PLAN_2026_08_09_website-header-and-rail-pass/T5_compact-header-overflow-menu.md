# T5: Compact header + ⋯ menu

**Plan:** `./ai-artifacts/PLAN_2026_08_09_website-header-and-rail-pass.md`
**Depends:** T1
**Commit outcome:** At phone widths the header shows brand + three icon buttons:
the three section links fold into a `⋯` popover, "Learn about Essentia" shortens
to "Learn", and the Catalog and Find buttons drop their text labels.

## Context (self-contained)

- Goal: rework the Essentia website shell — full-width header menubar, rail
  docked beneath it, flat colour-coded rail, compact phone header, tighter
  archetype hero. This ticket compacts the header.
- This slice: fifth of seven. It is the last ticket that changes header markup;
  T6 only measures what this ticket produces.
- Out of scope here: the rail's contents or tints (T3/T4 — independent branch),
  the 400px guard itself (T6), the catalog hero (T7). Do not touch
  `website/scripts/content/`, `cards_mse/`, or any Python.
- Assumptions in force: "mobile size" = the existing phone breakpoint
  `@media (max-width: 44rem)` (704px). The overflow menu is the native HTML
  `popover` attribute — no JS, no new island, and it needs no CSP change
  (`script-src 'self' 'unsafe-inline'` is untouched).

What T1 left behind (do not re-do, do not undo):

- `<Navigation client:load … />` renders **inside** `<header class="site-header">`
  in `website/src/layouts/BaseLayout.astro`, directly after
  `<a class="compact-brand" href={base}>…</a>`, before
  `{breadcrumb && <Breadcrumb items={breadcrumb} />}`.
- `.drawer-trigger` is an in-flow flex item: base block declares
  `display: none; align-items: center; gap: 0.4rem; min-height: 2.75rem; border: 1px solid var(--ruleline); border-radius: var(--radius-sm); background: transparent; color: inherit; padding: 0.5rem 0.8rem;`
  and `@media (max-width: 64rem)` flips it to `display: inline-flex`.
- The header's laid-out children, in order: `.compact-brand`, `.drawer-trigger`
  (≤64rem), `.breadcrumb` (optional), `.utility-nav`, `.search-trigger`.

Current markup, verbatim:

- `BaseLayout.astro`:
  ```astro
  <nav class="utility-nav" aria-label="Sections">
    <a href={`${base}docs/`} aria-current={section === 'docs/' ? 'page' : undefined}>Learn about Essentia</a>
    <a href={`${base}blog/`} aria-current={section === 'blog/' ? 'page' : undefined}>Blog</a>
    <a href={`${base}decks/`} aria-current={section === 'decks/' ? 'page' : undefined}>Decks</a>
  </nav>
  ```
- `FindPalette.svelte` trigger body:
  `<span aria-hidden="true">⌕</span><span>Find</span><kbd>⌘ K</kbd>`
- `Navigation.svelte` drawer trigger body:
  `<span aria-hidden="true">☰</span>` then `{drawerLabel}` as a bare text node
  (`drawerLabel` is `'Catalog'`, or `'Docs & blog'` in reading mode).

Build gates that must keep passing — `website/scripts/check-chrome.mjs` scans
every built page and fails the build when:

- the `<nav class="utility-nav">…</nav>` block does not contain
  `href="{base}docs/"` **and** the literal `>Learn about Essentia<`; same for
  `>Blog<` / `blog/` and `>Decks<` / `decks/`;
- the page has no `class="search-trigger"` or no `>Find</span>`.

Both survive the markup below because the full strings stay in the DOM inside
`<span class="label-full">`; CSS, not markup, hides them.

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

1. The three section links live inside `<div class="utility-menu" id="utility-menu" popover>`,
   itself inside `<nav class="utility-nav" aria-label="Sections">`, preceded by
   `<button class="utility-more" popovertarget="utility-menu" aria-label="More sections">`.
2. Above 44rem: `.utility-more` is hidden, `.utility-menu` lays its three links
   out inline exactly as today (the popover UA `display: none` is overridden).
3. At ≤44rem: `.utility-more` shows as a square icon button; `.utility-menu` is
   hidden until opened, then anchors below the header at the right edge.
4. The docs link renders
   `<span class="label-full">Learn about Essentia</span><span class="label-short">Learn</span>`
   and carries `aria-label="Learn about Essentia"` so its accessible name never
   changes with the viewport.
5. `.label-full` is `display: none` at ≤44rem; `.label-short` is `display: none`
   above 44rem. Exactly one is in the accessibility tree at any width.
6. The Find trigger's "Find" text and the Catalog trigger's label are wrapped in
   `<span class="label-full">`, and both controls carry an `aria-label` so their
   accessible names survive the text being hidden.
7. `npm run build` (which runs `check-chrome.mjs`) stays green.

## Inputs

- `website/src/layouts/BaseLayout.astro`
- `website/src/components/FindPalette.svelte`
- `website/src/components/Navigation.svelte`
- `website/src/styles/global.css`
- `website/scripts/check-chrome.mjs` (read only — it is the contract above)
- `website/tests/support/css.ts` — `resolve(css, selector, property, widthPx)`
- **From T1:** `<Navigation>` sits inside `.site-header`; `.drawer-trigger` is an
  in-flow button; `.site-header` has no `padding-left` reservation.

## TDD

1. **Red** — add `website/tests/unit/compact-header.test.ts` per the table below
   and run `cd website && npx vitest run tests/unit/compact-header.test.ts`;
   confirm failures.
2. **Green** — apply the impl steps.
3. **Refactor** — none. Keep green.

## Test plan

| Test                                            | Input                                                                  | Expect                                                    |
| ----------------------------------------------- | ---------------------------------------------------------------------- | ----------------------------------------------------------- |
| `the overflow trigger hides on desktop`         | `resolve(css, '.utility-more', 'display', 900)`                          | `'none'`                                                    |
| `the overflow trigger shows on phones`          | `resolve(css, '.utility-more', 'display', 390)`                          | `'inline-flex'`                                             |
| `the menu is a plain row on desktop`            | `resolve(css, '.utility-menu', 'display', 900)`                          | `'flex'`                                                    |
| `the menu is closed on phones`                  | `resolve(css, '.utility-menu', 'display', 390)`                          | `'none'`                                                    |
| `the open menu is a panel`                      | `global.css`                                                             | matches `/\.utility-menu:popover-open\s*\{[^}]*display:\s*grid/` |
| `full labels hide on phones`                    | `resolve(css, '.label-full', 'display', 390)` / at 900                    | `'none'` / `undefined` or not `'none'`                      |
| `short labels hide on desktop`                  | `resolve(css, '.label-short', 'display', 900)` / at 390                   | `'none'` / `undefined` or not `'none'`                      |
| `the popover is wired`                          | `BaseLayout.astro`                                                       | contains `popovertarget="utility-menu"`, `id="utility-menu"` and ` popover` |
| `the docs link keeps a stable accessible name`  | `BaseLayout.astro`                                                       | contains `aria-label="Learn about Essentia"`                |
| `check-chrome's literals survive`               | `BaseLayout.astro`                                                       | contains `>Learn about Essentia</span>`, `>Blog</span>`, `>Decks</span>` |
| `Find keeps its label element and a name`       | `FindPalette.svelte`                                                     | contains `<span class="label-full">Find</span>` and `aria-label="Find"` |
| `Catalog keeps its label element and a name`    | `Navigation.svelte`                                                      | contains `class="label-full"` inside `.drawer-trigger` and `aria-label={drawerLabel}` |
| `the utility nav still holds the right edge`    | `resolve(css, '.utility-nav', 'margin-left', w)` for 1440/1280/900/704/390 | `'auto'` at every width                                     |
| e2e `header compacts to icons and a ⋯ menu`     | viewport 400×800, `/`                                                    | `.utility-menu` hidden; `Learn about Essentia` link hidden; click `More sections` → the three links visible; axe reports no violations |

## Impl steps

- [x] 1. Create `website/tests/unit/compact-header.test.ts` with the thirteen
      unit rows above (read `global.css`, `BaseLayout.astro`,
      `FindPalette.svelte`, `Navigation.svelte`).
- [x] 2. Run `cd website && npx vitest run tests/unit/compact-header.test.ts`;
      confirm red.
- [x] 3. In `website/src/layouts/BaseLayout.astro`, replace the whole
      `<nav class="utility-nav" …>…</nav>` element with:
      ```astro
      <nav class="utility-nav" aria-label="Sections">
        <!-- Native popover: no island, no script, and it survives the page CSP.
             Above 44rem the author `display` on `.utility-menu` beats the UA
             `[popover]:not(:popover-open) { display: none }`, so the three
             links simply lay out inline and the ⋯ trigger is hidden. -->
        <button
          class="utility-more"
          popovertarget="utility-menu"
          aria-label="More sections"><span aria-hidden="true">⋯</span></button
        >
        <div class="utility-menu" id="utility-menu" popover>
          <a
            href={`${base}docs/`}
            aria-label="Learn about Essentia"
            aria-current={section === 'docs/' ? 'page' : undefined}
            ><span class="label-full">Learn about Essentia</span><span
              class="label-short">Learn</span
            ></a
          >
          <a
            href={`${base}blog/`}
            aria-current={section === 'blog/' ? 'page' : undefined}
            ><span class="label-full">Blog</span><span class="label-short"
              >Blog</span
            ></a
          >
          <a
            href={`${base}decks/`}
            aria-current={section === 'decks/' ? 'page' : undefined}
            ><span class="label-full">Decks</span><span class="label-short"
              >Decks</span
            ></a
          >
        </div>
      </nav>
      ```
- [x] 4. In `website/src/components/FindPalette.svelte`, change the trigger body
      to `<span aria-hidden="true">⌕</span><span class="label-full">Find</span><kbd>⌘ K</kbd>`
      and add `aria-label="Find"` to that `<button class="search-trigger" …>`.
- [x] 5. In `website/src/components/Navigation.svelte`, change the drawer
      trigger to:
      ```svelte
      <button
        class="drawer-trigger"
        bind:this={opener}
        on:click={openDrawer}
        aria-haspopup="dialog"
        aria-label={drawerLabel}
      >
        <span aria-hidden="true">☰</span>
        <span class="label-full">{drawerLabel}</span>
      </button>
      ```
- [x] 6. In `website/src/styles/global.css`, in `@layer layout`, rename the
      selector `.utility-nav a` to `.utility-menu a` in **both** rules (the base
      one and the `:hover, [aria-current='page']` one). Leave `.utility-nav`
      itself (`display: flex; align-items: center; gap: 0.35rem; margin-left: auto;`)
      untouched.
- [x] 7. Immediately after the `.utility-nav { … }` block add:
      ```css
      /* Author `display` beats the UA's `[popover]:not(:popover-open)` rule, so
         above the phone breakpoint the menu is just a flex row of links and the
         popover machinery is inert. */
      .utility-menu {
        display: flex;
        align-items: center;
        gap: 0.35rem;
        position: static;
        inset: auto;
        width: auto;
        max-width: none;
        height: auto;
        max-height: none;
        margin: 0;
        border: 0;
        padding: 0;
        overflow: visible;
        background: none;
        color: inherit;
      }
      .utility-more {
        display: none;
        align-items: center;
        justify-content: center;
        width: 2.45rem;
        height: 2.45rem;
        border: 1px solid var(--ruleline);
        border-radius: var(--radius-sm);
        background: transparent;
        color: inherit;
      }
      .label-short {
        display: none;
      }
      ```
- [x] 8. In `@media (max-width: 44rem)` — the block near line 1620 that already
      holds `.site-header { flex-wrap: wrap; … }` and `.utility-nav { gap: 0.25rem; }`
      — add:
      ```css
      .label-full {
        display: none;
      }
      .label-short {
        display: inline;
      }
      .utility-more {
        display: inline-flex;
      }
      .utility-menu {
        display: none;
        position: fixed;
        inset: auto;
        top: var(--header);
        right: 0.5rem;
        left: auto;
        border: 1px solid var(--ruleline);
        border-radius: var(--radius-sm);
        background: var(--blackfoil-raised);
        padding: 0.4rem;
      }
      .utility-menu:popover-open {
        display: grid;
        gap: 0.25rem;
      }
      .drawer-trigger {
        padding: 0.5rem;
      }
      ```
- [x] 9. Run `cd website && npx vitest run tests/unit/compact-header.test.ts`;
      confirm green.
- [x] 10. Append to `website/tests/e2e/showcase.spec.ts`:
      ```ts
      test('header compacts to icons and a ⋯ menu at 400px', async ({ page }) => {
        await page.setViewportSize({ width: 400, height: 800 });
        await page.goto(urlFor('/'));

        const docs = page.getByRole('link', { name: 'Learn about Essentia' });
        await expect(docs).toBeHidden();
        await expect(page.locator('.utility-menu')).toBeHidden();

        await page.getByRole('button', { name: 'More sections' }).click();
        await expect(docs).toBeVisible();
        await expect(page.getByRole('link', { name: 'Blog' })).toBeVisible();
        await expect(page.getByRole('link', { name: 'Decks' })).toBeVisible();

        const results = await new AxeBuilder({ page }).analyze();
        expect(results.violations).toEqual([]);
      });
      ```
- [x] 11. Run `cd website && npx playwright test tests/e2e/showcase.spec.ts --project=chromium`; confirm green.
- [x] 12. Run `cd website && npm run build` on its own and read the output:
      `check-chrome.mjs` must report nothing. If it reports a missing utility
      link, the `>Label</span>` literals were altered — restore them.
- [x] 13. In `website/DESIGN.md`, under the `**The One Home Rule.**` paragraph,
      append: `Below 44rem the header keeps only the mark and three icon
      controls — Catalog, ⋯ sections, Find — with every label hidden by CSS and
      preserved as an `aria-label`.`
- [x] 14. Run `cd website && npm run format && npm run ci`.
- [x] 15. Run `graphify update .` from the repo root.

## Outputs

- Files touched: `website/src/layouts/BaseLayout.astro`,
  `website/src/components/FindPalette.svelte`,
  `website/src/components/Navigation.svelte`,
  `website/src/styles/global.css`, `website/DESIGN.md`,
  `website/tests/unit/compact-header.test.ts` (new),
  `website/tests/e2e/showcase.spec.ts`.
- Behaviour change: below 44rem the header is brand + `☰` + `⋯` + `⌕`; the
  section links live in a native popover.
- Contract for T6: at ≤44rem the header's laid-out children are exactly
  `.compact-brand` (32px letter mark), `.drawer-trigger` (icon-only),
  `.utility-nav` (which contains only the 2.45rem `.utility-more` button, the
  popover being out of flow), and `.search-trigger` (icon-only, `<kbd>` hidden).
- No migration, no config change.

## Validation

- [x] `cd website && npx vitest run tests/unit/compact-header.test.ts` passes
- [x] `cd website && npm run ci` passes, including `check-chrome.mjs`
- [x] `cd website && npx playwright test tests/e2e/showcase.spec.ts` passes on all three projects
- [x] manual: at 1400px the three section links read exactly as before; at 400px
      only icons remain and `⋯` opens the three links
- [x] app functional — every route renders, no console error
- [x] commit msg draft: `feat(website): fold the header into icons and a ⋯ menu on phones`

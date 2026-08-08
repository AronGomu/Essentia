# T7: Brand moves to header

**Plan:** `./ai-artifacts/PLAN_2026_08_08_website-feedback-pass-2.md`
**Depends:** T1
**Commit outcome:** The Essentia wordmark sits at the top-left of the site header at every viewport width, the catalog nav no longer carries a text brand, and collapsing the rail can never hide the brand.

## Context (self-contained)

- Goal: website feedback pass 2. This ticket delivers feedback items **"Nav 1"**
  ("Replace the `Essentia` brand text by the wordmark logo") and **"Nav 3"** ("When
  the nav is collapsed the brand should still be visible. Best is probably to give
  the top part of the nav to the header and integrate the brand directly into the
  header").
- This slice: delete the nav's text brand, promote the header's existing
  `.compact-brand` wordmark from a narrow-viewport-only element to the permanent
  header brand, and put it first in the header.
- Out of scope here: the rail toggle buttons (T8), the docs/blog reading rail (T10),
  keyword rulings, MSE card data, hero art, section intros.
- Assumptions in force: `graphify` is not installed — do not run it. The header
  already ships the correct assets (`brand/wordmark-320.png`, and
  `brand/mark-64.png` swapped in under 44rem); no new image is produced here.

## Requirements

- `website/src/components/Navigation.svelte` no longer renders
  `<a class="brand" …>Essentia</a>`.
- `website/src/layouts/BaseLayout.astro` renders `<a class="compact-brand" …>` as the
  **first** child of `<header class="site-header">`, before `<Breadcrumb …>`.
- `.compact-brand` is `display: block` at all widths; the
  `@media (max-width: 64rem) { .compact-brand { display: block; } }` override is
  deleted (it becomes redundant).
- Exactly two `.compact-brand img` rules survive (desktop wordmark ≥160px wide,
  narrow letter mark 2rem × 2rem) — `website/tests/unit/brand-assets.test.ts` asserts
  this and must stay green.
- `.desktop-catalog` gains no brand and its first item is no longer offset by the
  removed `.brand` bottom border — add `padding-top` compensation only if the visual
  check demands it.
- The `.brand` CSS rule is deleted from `website/src/styles/global.css`.
- No page in `dist/` contains `class="brand"`.

## Inputs

- `website/src/components/Navigation.svelte` line 106:
  ```svelte
  <a class="brand" href={href('/')} aria-label="Essentia home">Essentia</a>
  ```
  It is the first child of `<nav id="desktop-catalog" class="desktop-catalog" aria-label="Catalog">`.
- `website/src/layouts/BaseLayout.astro` lines 138–172 — header order today is
  `{breadcrumb && <Breadcrumb …>}`, then `<a class="compact-brand" href={base}>`
  with `<picture><source media="(max-width: 44rem)" srcset={\`${base}brand/mark-64.png\`} /><img src={\`${base}brand/wordmark-320.png\`} alt="Essentia" width="320" height="74" … /></picture></a>`,
  then `<nav class="utility-nav" …>`, then `<FindPalette …>`.
- `website/src/styles/global.css`:
  - `.site-header` line 214 — `display: flex; align-items: center; justify-content: flex-end; gap: var(--space-3); margin-left: var(--sidebar);`
  - `.compact-brand` line 229 — `display: none; font-family: var(--font-display); font-weight: 700; text-decoration: none;`
  - `.compact-brand img` line 239 — `display: block; width: 160px; height: auto;`
  - `.breadcrumb` line 263 — `margin-right: auto;`
  - `.brand` line 362 — the nav text brand rule, to delete.
  - `@media (max-width: 64rem)` line 1053 — `.compact-brand { display: block; }`, to delete.
  - `@media (max-width: 44rem)` line 1069 — `.compact-brand img { height: 2rem; width: 2rem; }`, keep.
- `website/tests/unit/brand-assets.test.ts` — asserts the header brand has
  `alt="Essentia"`, that there are exactly **2** `.compact-brand img` rules, and the
  `<source media="(max-width: 44rem)">` points at `mark-`.
- `website/tests/e2e/showcase.spec.ts` lines 10–11:
  ```ts
  await expect(page.locator('.brand')).toHaveText('Essentia');
  await expect(page.locator('.compact-brand')).toHaveText('Essentia');
  ```
  Both are wrong after this ticket: `.brand` disappears and `.compact-brand` holds an
  image, not text.
- **From Depends (T1):** baseline green.

## TDD

1. **Red** — add `website/tests/unit/header-brand.test.ts` with the rows below, and
   rewrite the two e2e assertions; they fail.
2. **Green** — move the brand and apply the CSS edits.
3. **Refactor** — delete the `.brand` rule and the redundant media override; keep green.

## Test plan

Unit: `cd website && npm run test`. E2E: `cd website && npm run test:e2e`.

| Test | Input | Expect |
| ---- | ----- | ------ |
| `header-brand.test.ts` › `the nav carries no text brand` | source of `src/components/Navigation.svelte` | does not match `/class="brand"/` |
| `header-brand.test.ts` › `the brand is the first header child` | source of `src/layouts/BaseLayout.astro` | index of `class="compact-brand"` is **less than** index of `<Breadcrumb` |
| `header-brand.test.ts` › `the brand shows at every width` | `.compact-brand {` block in `global.css` | matches `/display:\s*block/`, not `/display:\s*none/` |
| `header-brand.test.ts` › `the nav brand rule is gone` | `global.css` | does not match `/^\s*\.brand\s*\{/m` |
| `brand-assets.test.ts` (existing) | unchanged | still green, still exactly 2 `.compact-brand img` rules |
| `showcase.spec.ts` › `empty publication home is English and accessible` | `/` | `page.locator('.compact-brand img')` has attribute `alt` = `Essentia`; `page.locator('.brand')` has count `0`; axe violations `[]` |

## Impl steps

- [ ] 1. In `website/src/components/Navigation.svelte`, delete line 106 (the
      `<a class="brand" …>Essentia</a>` element). Leave the `href()` helper — the
      section links still use it.
- [ ] 2. In `website/src/layouts/BaseLayout.astro`, move the whole
      `<a class="compact-brand" href={base}> … </a>` block so it is the first child of
      `<header class="site-header">`, immediately before
      `{breadcrumb && <Breadcrumb items={breadcrumb} />}`. Do not change its inner
      markup.
- [ ] 3. In `website/src/styles/global.css`, in `.compact-brand`, change
      `display: none;` to `display: block;`.
- [ ] 4. Delete the whole `.brand { … }` rule (line ~362).
- [ ] 5. In the `@media (max-width: 64rem)` block, delete the
      `.compact-brand { display: block; }` rule.
- [ ] 6. In `.desktop-catalog`, change `padding: 1.2rem 1rem;` to
      `padding: 1rem;` so the first nav item does not float where the deleted brand
      used to sit.
- [ ] 7. Add `website/tests/unit/header-brand.test.ts` with the four unit rows.
- [ ] 8. Update `website/tests/e2e/showcase.spec.ts` lines 10–11 to:
      ```ts
      await expect(page.locator('.compact-brand img')).toHaveAttribute(
        'alt',
        'Essentia',
      );
      await expect(page.locator('.brand')).toHaveCount(0);
      ```
- [ ] 9. `cd website && npm run format && npm run test` → exit 0.
- [ ] 10. `cd website && npm run build` → exit 0.
- [ ] 11. `grep -r 'class="brand"' website/dist | wc -l` → `0`.
- [ ] 12. `cd website && npm run test:e2e` → exit 0.

## Outputs

- Files touched: `website/src/components/Navigation.svelte`,
  `website/src/layouts/BaseLayout.astro`, `website/src/styles/global.css`,
  new `website/tests/unit/header-brand.test.ts`,
  `website/tests/e2e/showcase.spec.ts`.
- Public API / behaviour change: the brand is a header element on every width; the
  nav has none.
- Migrate / config: none.

## Validation

- [ ] tests pass: `cd website && npm run ci`; `cd website && npm run test:e2e`
- [ ] manual check: at 1400 px the wordmark sits top-left in the header, left of the
      breadcrumb, and stays visible while toggling the catalog rail
- [ ] manual check: at 390 px the square letter mark shows and the header does not overflow
- [ ] app functional — `cd website && npm run build` exits 0
- [ ] commit msg draft: `feat(website): move the Essentia wordmark into the site header`

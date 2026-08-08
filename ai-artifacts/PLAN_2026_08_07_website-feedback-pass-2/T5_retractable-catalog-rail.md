# T5: Retractable catalog rail

**Plan:** `./ai-artifacts/PLAN_2026_08_07_website-feedback-pass-2.md`
**Depends:** none
**Commit outcome:** The left catalog panel collapses and expands from a button, the page reflows to full width, and the choice survives navigation.

## Context (self-contained)

- Goal: ship feedback batch 2 on the Astro site under `website/`.
- This slice: the feedback line *"Make left side panel retractable."*
- Out of scope here: the mobile drawer's behaviour (it already opens as a `<dialog>` below
  64rem), the docs rail (T9), the search palette (T10), the rail's contents or ordering.
- Assumptions in force: none specific.

## Current implementation

- `website/src/components/Navigation.svelte` renders a `<button class="drawer-trigger">`
  (mobile), a `<nav class="desktop-catalog">` and a `<dialog class="mobile-drawer">`. It is
  mounted once from `website/src/layouts/BaseLayout.astro` line 80 with `client:load`.
- `website/src/styles/global.css`:
  - line 32: `--sidebar: 17rem;` in `:root` inside `@layer tokens`.
  - line 205: `.site-header { margin-left: var(--sidebar); }`
  - line 257-260: `main, .site-footer { margin-left: var(--sidebar); }`
  - line 327-336: `.desktop-catalog { position: fixed; inset: 0 auto 0 0; width: var(--sidebar); … }`
  - line 963-993: `@media (max-width: 64rem)` hides `.desktop-catalog`, shows
    `.drawer-trigger`, and zeroes the three `margin-left`s.
- CSP: the built pages carry a strict `Content-Security-Policy` meta;
  `website/scripts/harden-csp.mjs` replaces `'unsafe-inline'` with a sha256 hash of every
  inline `<script>` and `<style>`, so an inline boot script in `<head>` is allowed as long
  as it is literally identical on every page.

## Requirements

- A persistent toggle button collapses the rail. When collapsed:
  `--sidebar` resolves to `0rem`, `.desktop-catalog` slides out
  (`transform: translateX(-100%)`) and is removed from the tab order
  (`visibility: hidden`), and `main` / `.site-header` / `.site-footer` reclaim the width.
- The state lives on the root element as `data-catalog="collapsed" | "expanded"` so it is
  pure CSS from there.
- The choice persists in `localStorage` under the project's existing key convention:
  `essentia.v1.catalog-rail` with the raw value `collapsed` or `expanded`.
- No flash of the wrong state on first paint: a tiny inline `<head>` script applies the
  stored value before the body renders.
- Toggle is reachable by keyboard and announces state via `aria-expanded`, and remains
  visible when the rail is collapsed (it must not disappear with the panel).
- Below `64rem` the toggle is hidden and the existing drawer behaviour is unchanged.

## Inputs

- `website/src/components/Navigation.svelte`, `website/src/layouts/BaseLayout.astro`,
  `website/src/styles/global.css`, `website/src/lib/storage.ts` (existing
  `readStored`/`writeStored` helpers with the `essentia.v1.` prefix — read them, but this
  ticket stores a bare string, not a versioned JSON blob, so use `localStorage` directly).
- `website/scripts/harden-csp.mjs`, `website/scripts/check-chrome.mjs`.
- **From Depends:** none.

## New pure module

Create `website/src/lib/catalog-rail.ts`:

```ts
export const RAIL_STORAGE_KEY = 'essentia.v1.catalog-rail';
export type RailState = 'collapsed' | 'expanded';
/** Anything that is not the literal 'collapsed' means expanded. */
export function normalizeRailState(value: string | null): RailState;
export function toggleRailState(value: RailState): RailState;
```

## Check plan

| Test                                   | Input                | Expect        |
| -------------------------------------- | -------------------- | ------------- |
| `defaults to expanded when unset`      | `null`               | `'expanded'`  |
| `defaults to expanded on garbage`      | `'yes'`              | `'expanded'`  |
| `reads the collapsed marker`           | `'collapsed'`        | `'collapsed'` |
| `toggles expanded to collapsed`        | `'expanded'`         | `'collapsed'` |
| `toggles collapsed to expanded`        | `'collapsed'`        | `'expanded'`  |
| `exports the prefixed storage key`     | `RAIL_STORAGE_KEY`   | `'essentia.v1.catalog-rail'` |

Plus a build-gate assertion in `website/scripts/check-chrome.mjs`:
`every non-404 page contains 'data-catalog="expanded"' or 'data-catalog="collapsed"' on <html>`
and `every non-404 page contains 'class="rail-toggle"'`.

## TDD

1. **Red** — write `website/tests/unit/catalog-rail.test.ts` (6 rows) and extend
   `website/tests/unit/chrome.test.ts` with a case feeding `chromeIssues` an HTML string
   whose `<html>` has no `data-catalog` attribute, expecting a problem string
   `` `${file}: page is missing the catalog rail state` ``. Run
   `cd website && npx vitest run tests/unit/catalog-rail.test.ts tests/unit/chrome.test.ts` — red.
2. **Green** — add the module, the markup, the CSS and the gate.
3. **Refactor** — none expected.

## Impl steps

- [x] 1. Create `website/src/lib/catalog-rail.ts` per the contract above.
- [x] 2. Create `website/tests/unit/catalog-rail.test.ts` with the 6 rows.
- [x] 3. Add the missing-`data-catalog` case to `website/tests/unit/chrome.test.ts`; run both — red.
- [x] 4. In `website/src/layouts/BaseLayout.astro`, give `<html>` a default state:
      `<html lang="en" data-accent={accent} data-theme={theme} data-catalog="expanded">`.
- [x] 5. In the same file, add as the **last** child of `<head>` (after `<Seo …/>`):
      ```astro
      <script is:inline>
        try {
          if (localStorage.getItem('essentia.v1.catalog-rail') === 'collapsed')
            document.documentElement.dataset.catalog = 'collapsed';
        } catch {}
      </script>
      ```
      It must be byte-identical on every page so `harden-csp.mjs` emits one hash.
- [x] 6. In `website/src/components/Navigation.svelte`, add above `<nav class="desktop-catalog">`:
      ```svelte
      <button
        class="rail-toggle"
        aria-expanded={railState === 'expanded'}
        aria-controls="desktop-catalog"
        on:click={toggleRail}
      >
        <span aria-hidden="true">{railState === 'expanded' ? '⟨' : '⟩'}</span>
        <span class="sr-only">{railState === 'expanded' ? 'Collapse catalog' : 'Expand catalog'}</span>
      </button>
      ```
      and give the `<nav>` `id="desktop-catalog"`.
- [x] 7. In the same component's `<script lang="ts">`, add:
      ```ts
      import { RAIL_STORAGE_KEY, normalizeRailState, toggleRailState, type RailState } from '../lib/catalog-rail';
      let railState: RailState = 'expanded';
      onMount(() => {
        railState = normalizeRailState(localStorage.getItem(RAIL_STORAGE_KEY));
        document.documentElement.dataset.catalog = railState;
      });
      function toggleRail() {
        railState = toggleRailState(railState);
        document.documentElement.dataset.catalog = railState;
        try { localStorage.setItem(RAIL_STORAGE_KEY, railState); } catch {}
      }
      ```
      Import `onMount` from `'svelte'`.
- [x] 8. Append to `website/src/styles/global.css`, after the `@media (max-width: 44rem)`
      block that ends at line 1024:
      ```css
      html[data-catalog='collapsed'] {
        --sidebar: 0rem;
      }
      html[data-catalog='collapsed'] .desktop-catalog {
        transform: translateX(-100%);
        visibility: hidden;
      }
      .desktop-catalog {
        transition:
          transform 220ms var(--ease-out),
          visibility 0s linear 220ms;
      }
      html[data-catalog='expanded'] .desktop-catalog {
        transition:
          transform 220ms var(--ease-out),
          visibility 0s;
      }
      .rail-toggle {
        position: fixed;
        z-index: calc(var(--z-sticky) + 1);
        top: 0.9rem;
        left: calc(var(--sidebar) + 0.5rem);
        min-height: 2.25rem;
        padding: 0.35rem 0.6rem;
        transition: left 220ms var(--ease-out);
      }
      @media (max-width: 64rem) {
        .rail-toggle {
          display: none;
        }
      }
      @media (prefers-reduced-motion: reduce) {
        .desktop-catalog,
        .rail-toggle {
          transition: none;
        }
      }
      ```
- [x] 9. Add `transition: margin-left 220ms var(--ease-out);` to the existing
      `main, .site-footer` rule (line 257) and to `.site-header` (line 200).
- [x] 10. In `website/scripts/check-chrome.mjs::chromeIssues`, after the breadcrumb check, add:
      ```js
      if (file !== '404.html' && !/<html[^>]*\sdata-catalog="(?:expanded|collapsed)"/.test(html))
        problems.push(`${file}: page is missing the catalog rail state`);
      if (file !== '404.html' && !html.includes('class="rail-toggle"'))
        problems.push(`${file}: page is missing the catalog rail toggle`);
      ```
- [x] 11. Run `cd website && npx vitest run tests/unit/catalog-rail.test.ts tests/unit/chrome.test.ts` — green.
- [x] 12. Run `cd website && npm run format && npm run ci`. If `harden-csp.mjs` throws
      `CSP hardening incomplete`, the inline script differs between pages — make it literal.

## Outputs

- Touched: `website/src/lib/catalog-rail.ts` (new),
  `website/tests/unit/catalog-rail.test.ts` (new), `website/tests/unit/chrome.test.ts`,
  `website/src/layouts/BaseLayout.astro`, `website/src/components/Navigation.svelte`,
  `website/src/styles/global.css`, `website/scripts/check-chrome.mjs`.
- Behaviour: new `data-catalog` attribute on `<html>`; new `localStorage` key
  `essentia.v1.catalog-rail`; new build gate.

## Validation

- [x] `cd website && npx vitest run tests/unit/catalog-rail.test.ts tests/unit/chrome.test.ts` — passed
- [x] `cd website && npm run ci` — exit 0, `csp: hashed inline content in N HTML files`
- [ ] manual: `npm run dev` at ≥1200px — click the toggle, rail slides away and content
      widens; reload, rail stays collapsed; Tab does not reach collapsed rail links;
      resize below 1024px — toggle hidden, `☰ Catalog` drawer still works
- [ ] app functional — `npm run test:e2e` passes
- [ ] commit msg draft: `feat(website): make the catalog rail retractable`

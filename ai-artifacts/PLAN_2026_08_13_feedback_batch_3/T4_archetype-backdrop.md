# T4: Archetype backdrop on the content column

**Plan:** `./ai-artifacts/PLAN_2026_08_13_feedback_batch_3.md`
**Depends:** none
**Commit outcome:** An archetype page paints its background photo inside `<main>` only —
dimmed 60 %, blurred 2 px, scrolling with the content — and the gradient theme that used to
cover the whole viewport is gone from those pages.

## Context (self-contained)

- Goal: archetype pages currently wear an opaque generated gradient (`--page-atmosphere`)
  plus an optional pattern (`--page-pattern`), painted on `body::before` / `body::after`
  with `position: fixed; inset: 0`, so the theme covers the header and the left rail too.
  The owner wants the photo backdrop instead, contained to the content area.
- This slice: remove the atmosphere and pattern **on archetype pages only**, and repaint the
  photo on `<main>`.
- Out of scope here: every other theme (`home`, `creatures`, `fusions`, `synchro`, `xyz`,
  `link`, `non-creature`) keeps its current look; generating new background art; the
  archetype hero panel.
- Assumptions in force: an archetype with no background file renders flat black, and that is
  intended. Only `burning-abyss` and `nekroz` have art, and both are live, so nothing goes
  black today. Shaddoll and Spellbook have no cards and therefore no page.
- CSP constraint: `website/scripts/harden-csp.mjs` throws on `'unsafe-inline'` /
  `'unsafe-hashes'`, and `dist/` contains zero `style="` attributes. The photo URL must
  continue to arrive through the hashed `<style>` block that `BaseLayout.astro` already
  emits, never through an inline attribute.

## Requirements

- `html[data-page='archetype']` suppresses `body::before`'s atmosphere and `body::after`'s
  pattern entirely.
- `main` on an archetype page paints, in one pseudo-element: the photo, covered by a 60 %
  black veil, blurred by 2 px, scaled just enough that the blur leaves no transparent edge.
- The backdrop is clipped to `main` — the header, the left rail and the footer never show it.
- The backdrop scrolls with the content (it is absolutely positioned inside `main`, not
  fixed).
- Page text and card tiles stay above it.
- Themes other than archetype pages are untouched.

## Inputs

- `website/src/styles/global.css`:
  - `@layer base` block at lines ~100-144 defines `body`, `body::before` (opacity `0.82`,
    `background: var(--page-atmosphere, …), linear-gradient(oklch(0.08 0 0 / 0.72), …), var(--page-photo, none)`)
    and `body::after` (`opacity: 0; background: var(--page-pattern, none)`).
  - `html[data-theme='burning-abyss']` ~line 1402 and `html[data-theme='nekroz']` ~line 1421
    define `--page-atmosphere` / `--page-pattern`.
  - `html[data-theme='xyz'] body::after, … html[data-theme='nekroz'] body::after,
    html[data-theme='shaddoll'] body::after { opacity: 1; }` at ~line 1499.
- `website/src/layouts/BaseLayout.astro` — takes `background?: string | undefined` and emits
  `<style set:html={\`html[data-page='archetype'] body { --page-photo: url('${withBase(base, background)}'); }\`} />`
  inside `<head>`; also sets `data-page={page}` and `data-theme={theme}` on `<html>`.
- `website/src/pages/archetypes/[slug].astro` — passes `page="archetype"`,
  `theme={section.slug}` and
  `background = BACKGROUND_SLUGS.has(section.slug) ? \`backgrounds/${section.slug}.webp\` : undefined`
  with `const BACKGROUND_SLUGS = new Set(['burning-abyss', 'nekroz']);`.
- `website/public/backgrounds/` — `burning-abyss.webp`, `nekroz.webp`.
- `website/tests/e2e/archetype-background.spec.ts` — three tests, all reading
  `getComputedStyle(document.body, '::before')`.

## TDD

1. **Red** — rewrite `archetype-background.spec.ts` to assert on `main::before` and on the
   absence of the atmosphere; run `npm run build && npm run test:e2e` and watch it fail.
2. **Green** — change the CSS and the style injection.
3. **Refactor** — only if needed. Keep green.

## Test plan

File: `website/tests/e2e/archetype-background.spec.ts`

| Test                                                    | Input                                | Expect                                                                                     |
| ------------------------------------------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------ |
| `archetype page paints the photo inside main`           | `/archetypes/nekroz/`                | `getComputedStyle(main, '::before').backgroundImage` contains `backgrounds/nekroz`          |
| `the photo is blurred and dimmed`                       | `/archetypes/nekroz/`                | that pseudo-element's `filter` contains `blur(2px)`; its `backgroundImage` also contains a `linear-gradient` layer |
| `body carries no atmosphere on an archetype page`       | `/archetypes/burning-abyss/`         | `getComputedStyle(document.body, '::before').backgroundImage` is `none` or contains no `backgrounds/`             |
| `the backdrop covers main and is clipped to it`         | `/archetypes/nekroz/`                | the `::before` box height equals `main`'s `scrollHeight` (±2 px) and its top is not above `main`'s top            |
| `card page of the same theme has no photo backdrop`     | `/cards/nekroz-trishula/`            | neither `body::before` nor `main::before` contains `backgrounds/`                            |

File: `website/tests/unit/archetype.test.ts` (already exists) — add:

| Test                                                | Input               | Expect                                                             |
| --------------------------------------------------- | ------------------- | ------------------------------------------------------------------ |
| `every live archetype section has a background file` | catalog sections    | for each `kind === 'archetype'` section, `public/backgrounds/{slug}.webp` exists **or** the slug is absent from `BACKGROUND_SLUGS` without failing — assert only that `BACKGROUND_SLUGS` contains no slug lacking a file |

Run: `cd website && npx vitest run tests/unit/archetype.test.ts` then
`cd website && npm run build && npx playwright test tests/e2e/archetype-background.spec.ts`.

## Impl steps

- [ ] 1. In `website/src/styles/global.css`, inside `@layer base`, add
      `main { position: relative; isolation: isolate; }`.
- [ ] 2. Add a new rule outside `@layer base`:
      `html[data-page='archetype'] main::before { content: ''; position: absolute; inset: 0; z-index: -1; overflow: hidden; background: linear-gradient(oklch(0.08 0 0 / 0.6), oklch(0.08 0 0 / 0.6)), var(--page-photo, none); background-position: 50% 50%; background-repeat: no-repeat; background-size: cover; filter: blur(2px); transform: scale(1.01); pointer-events: none; }`
- [ ] 3. Add `html[data-page='archetype'] main { overflow: hidden; }` **only if** step 2's
      `transform: scale(1.01)` produces a horizontal scrollbar; verify at 400 px width first.
- [ ] 4. Add `html[data-page='archetype'] body::before { background: none; opacity: 1; }` and
      `html[data-page='archetype'] body::after { background: none; opacity: 0; }` so the
      atmosphere and pattern are suppressed regardless of `data-theme`.
- [ ] 5. In `website/src/layouts/BaseLayout.astro`, change the injected style text from
      `html[data-page='archetype'] body { --page-photo: … }` to
      `html[data-page='archetype'] main { --page-photo: url('…') }`.
- [ ] 6. Leave `website/src/pages/archetypes/[slug].astro` and `BACKGROUND_SLUGS` as they
      are — an archetype with no entry simply gets no `--page-photo` and renders flat black.
- [ ] 7. Rewrite `website/tests/e2e/archetype-background.spec.ts` per the test plan.
- [ ] 8. Add the `BACKGROUND_SLUGS` consistency test to
      `website/tests/unit/archetype.test.ts`, exporting `BACKGROUND_SLUGS` from
      `website/src/pages/archetypes/[slug].astro` if it is not importable — if it is not,
      move the set into `website/src/lib/catalog.ts` as
      `export const ARCHETYPE_BACKGROUND_SLUGS` and import it in the page.
- [ ] 9. Run `npm run build` and confirm `scripts/harden-csp.mjs` still exits 0 — the style
      block is still a hashable `<style>` element, not an attribute.

## Outputs

- Touched: `website/src/styles/global.css`, `website/src/layouts/BaseLayout.astro`,
  `website/tests/e2e/archetype-background.spec.ts`,
  `website/tests/unit/archetype.test.ts`, possibly
  `website/src/pages/archetypes/[slug].astro` and `website/src/lib/catalog.ts` (step 8).
- Visual change: archetype pages lose the full-viewport gradient; the header and rail sit on
  the site's own black.

## Validation

- [ ] `cd website && npx vitest run tests/unit/archetype.test.ts` — green
- [ ] `cd website && npm run build` — exits 0, CSP hardening included
- [ ] `cd website && npx playwright test tests/e2e/archetype-background.spec.ts` — 5 passed
- [ ] `cd website && npm run test:e2e` — the full e2e suite still green
- [ ] manual check at 1440 px and at 400 px on `/archetypes/nekroz/`: the photo starts at the
      top edge of the content column, never behind the header or the rail, and scrolls away
      with the page; no horizontal scrollbar
- [ ] manual check on `/archetypes/burning-abyss/`: same, with its own photo
- [ ] commit msg draft: `feat(website): scope the archetype backdrop to the content column`

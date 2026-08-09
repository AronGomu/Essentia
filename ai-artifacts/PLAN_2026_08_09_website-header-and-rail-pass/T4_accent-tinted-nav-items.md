# T4: Accent-tinted nav items

**Plan:** `./ai-artifacts/PLAN_2026_08_09_website-header-and-rail-pass.md`
**Depends:** T3
**Commit outcome:** Every archetype entry in the rail and drawer carries a faint
wash of its own archetype colour that intensifies on hover, focus, and current
page; non-archetype stays on the rail's black.

## Context (self-contained)

- Goal: rework the Essentia website shell — full-width header menubar, rail
  docked beneath it, flat colour-coded rail, compact phone header, tighter
  archetype hero. This ticket colours the rail items.
- This slice: fourth of seven. It threads the already-authored `accent` field
  through to the nav and turns it into a background tint.
- Out of scope here: authoring new colour tokens (`--ember`, `--ice`, `--shadow`,
  `--aether`, `--gold`, `--relic` stay exactly as they are), the header's
  phone-width compaction (T5), the 400px guard (T6), the catalog hero (T7),
  `website/scripts/content/`, `cards_mse/`, Python.
- Assumptions in force: `non-archetype` gets **no** tint. Its authored
  `accent: relic` is deliberately ignored for the rail, per feedback line 6
  ("non-archetype = no color attributed so keep black").

Facts this ticket depends on:

- `website/content/sections.json` already assigns `burning-abyss → ember`,
  `shaddoll → shadow`, `nekroz → ice`, `spellbook → aether`,
  `non-archetype → relic` (with `kind: 'non-archetype'`).
- `website/src/styles/global.css` `:root` already defines
  `--ember: oklch(0.68 0.18 32)` (orange), `--ice: oklch(0.78 0.13 218)` (blue),
  `--shadow`, `--aether`, `--gold`, `--relic`. The feedback's
  "Burning abyss = orange, nekroz = blue" is therefore already satisfied by the
  existing tokens — no colour is re-authored.
- `website/src/lib/catalog.ts` `interface CatalogSection` already has
  `accent: string` and `kind: 'non-archetype' | 'archetype'`.
- `website/src/layouts/BaseLayout.astro` narrows sections before passing them
  down:
  ```ts
  const navSections = catalog.sections.map(({ slug, label, kind, route, count }) => ({
    slug, label, kind, route, count,
  }));
  ```
  `accent` is dropped here — that is the gap this ticket closes.
- `website/src/components/Navigation.svelte` declares
  ```ts
  type NavSection = Pick<CatalogSection, 'slug' | 'label' | 'kind' | 'route' | 'count'>;
  ```
- Current backgrounds in `global.css`:
  ```css
  .desktop-catalog li a,
  .mobile-drawer li a { … color: var(--silver-ink); padding: 0.55rem 0.65rem; … }
  .desktop-catalog li a:hover,
  .desktop-catalog li a[aria-current='page'],
  .mobile-drawer li a:hover { background: var(--sleeve); color: var(--cardstock); }
  ```
  The resting state declares no background at all.

What T1–T3 left behind (do not re-do, do not undo):

- `<Navigation>` renders inside `<header class="site-header">`.
- The rail has one square toggle at its bottom-right.
- Both catalog lists are a single `{#each sections as section (section.slug)}`;
  the desktop one is `<ul id="desktop-catalog-sections">`. Each `<li>` holds one
  `<a href={href(section.route)} aria-current={current(section.route)}>`.

## Requirements

1. `BaseLayout.astro` forwards `accent` in `navSections`.
2. `NavSection` in `Navigation.svelte` includes `'accent'`.
3. Each catalog `<li>` — desktop **and** drawer — gets
   `style={tintStyle(section)}`, where `tintStyle` returns
   `` `--nav-tint: var(--${section.accent})` `` for `kind === 'archetype'` and
   `null` otherwise.
4. Resting background of a nav link:
   `color-mix(in oklch, var(--nav-tint, transparent) 14%, transparent)`.
5. Hover / `:focus-visible` / `aria-current="page"` background:
   `color-mix(in oklch, var(--nav-tint, var(--sleeve)) 32%, var(--sleeve))` —
   strictly more intense than resting, and identical to today's `var(--sleeve)`
   when no tint is set.
6. No tint reaches the reading-mode lists (they render `readingGroups`, which
   never sets `--nav-tint`).

## Inputs

- `website/src/layouts/BaseLayout.astro`
- `website/src/components/Navigation.svelte`
- `website/src/styles/global.css`
- `website/content/sections.json` (read only)
- **From T3:** both catalog lists are one `{#each sections as section (section.slug)}`
  loop with a single `<a>` per `<li>`; `.nav-group` no longer exists in the CSS.

## TDD

1. **Red** — add `website/tests/unit/nav-accent.test.ts` per the table below and
   run `cd website && npx vitest run tests/unit/nav-accent.test.ts`; confirm
   failures.
2. **Green** — apply the impl steps.
3. **Refactor** — none. Keep green.

## Test plan

| Test                                                | Input                                                                  | Expect                                                       |
| --------------------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------- |
| `the layout forwards the accent`                    | `BaseLayout.astro`                                                      | matches `/\{\s*slug,\s*label,\s*kind,\s*accent,\s*route,\s*count\s*\}/` |
| `the nav type carries the accent`                   | `Navigation.svelte`                                                     | matches `/'accent'/` inside the `NavSection` `Pick<…>`         |
| `archetypes get a tint, non-archetypes do not`      | `Navigation.svelte`                                                     | matches `/kind === 'archetype'/` in the same statement as `--nav-tint`, and the fallback branch returns `null` |
| `both catalog lists bind the tint`                  | `Navigation.svelte` match count of `/style=\{tintStyle\(section\)\}/g`   | `2`                                                            |
| `nav links rest on a faint tint`                    | `global.css`                                                            | matches `/color-mix\(in oklch, var\(--nav-tint, transparent\) 14%, transparent\)/` |
| `hover is more intense than rest`                   | parse both `color-mix` percentages out of `global.css`                  | hover percentage (`32`) > resting percentage (`14`)            |
| `hover keeps today's look when there is no tint`    | `global.css` hover rule                                                  | matches `/var\(--nav-tint, var\(--sleeve\)\)/` and `/, var\(--sleeve\)\)/` |
| `focus-visible is tinted too`                       | `global.css`                                                            | the hover selector list includes `.desktop-catalog li a:focus-visible` and `.mobile-drawer li a:focus-visible` |
| `Burning Abyss is orange and Nekroz is blue`        | `content/sections.json` + `global.css` `:root`                          | `burning-abyss.accent === 'ember'`, `nekroz.accent === 'ice'`, `--ember` hue is `32`, `--ice` hue is `218` |
| `non-archetype is not an archetype`                 | `content/sections.json`                                                 | the `non-archetype` entry has `kind: 'non-archetype'`          |
| e2e `rail items carry their archetype colour`       | viewport 1400×900, `/`                                                  | Burning Abyss link `background-color` ≠ `rgba(0, 0, 0, 0)`; Non-archetype link `background-color` === `rgba(0, 0, 0, 0)`; hovering Burning Abyss changes its `background-color` |

## Impl steps

- [ ] 1. Create `website/tests/unit/nav-accent.test.ts` with the ten unit rows
      above. For the percentage comparison, extract with
      `/var\(--nav-tint, transparent\)\s*(\d+)%/` and
      `/var\(--nav-tint, var\(--sleeve\)\)\s*(\d+)%/` and compare as numbers.
- [ ] 2. Run `cd website && npx vitest run tests/unit/nav-accent.test.ts`;
      confirm red.
- [ ] 3. In `website/src/layouts/BaseLayout.astro`, change the `navSections` map
      to:
      ```ts
      const navSections = catalog.sections.map(
        ({ slug, label, kind, accent, route, count }) => ({
          slug,
          label,
          kind,
          accent,
          route,
          count,
        }),
      );
      ```
- [ ] 4. In `website/src/components/Navigation.svelte`, change the type to:
      ```ts
      type NavSection = Pick<
        CatalogSection,
        'slug' | 'label' | 'kind' | 'accent' | 'route' | 'count'
      >;
      ```
- [ ] 5. In the same script block, directly under `const current = …`, add:
      ```ts
      /**
       * The rail wears each archetype's own colour. `non-archetype` is not an
       * archetype and has no colour of its own — its authored `relic` accent is
       * the page accent, not a section identity — so it rests on the rail's own
       * black and only lifts on hover.
       */
      const tintStyle = (section: NavSection) =>
        section.kind === 'archetype' ? `--nav-tint: var(--${section.accent})` : null;
      ```
- [ ] 6. In the desktop catalog list, change the `<li>` opening tag to
      `<li style={tintStyle(section)}>`.
- [ ] 7. In the mobile-drawer catalog list, change its `<li>` opening tag to
      `<li style={tintStyle(section)}>` as well.
- [ ] 8. In `website/src/styles/global.css`, in the
      `.desktop-catalog li a, .mobile-drawer li a { … }` block, add as the first
      declaration:
      ```css
      background: color-mix(in oklch, var(--nav-tint, transparent) 14%, transparent);
      ```
      and add above the block the comment
      `/* --nav-tint is set per <li> by Navigation.svelte for archetype sections only; unset it falls back to transparent (rest) and --sleeve (hover), which is exactly the pre-tint look. */`
- [ ] 9. Replace the hover/current rule with:
      ```css
      .desktop-catalog li a:hover,
      .desktop-catalog li a:focus-visible,
      .desktop-catalog li a[aria-current='page'],
      .mobile-drawer li a:hover,
      .mobile-drawer li a:focus-visible,
      .mobile-drawer li a[aria-current='page'] {
        background: color-mix(in oklch, var(--nav-tint, var(--sleeve)) 32%, var(--sleeve));
        color: var(--cardstock);
      }
      ```
- [ ] 10. Run `cd website && npx vitest run tests/unit/nav-accent.test.ts`;
      confirm green.
- [ ] 11. Append to `website/tests/e2e/showcase.spec.ts`:
      ```ts
      test('rail items carry their archetype colour', async ({ page }) => {
        await page.setViewportSize({ width: 1400, height: 900 });
        await page.goto(urlFor('/'));
        const rail = page.getByRole('navigation', { name: 'Catalog' });
        const abyss = rail.getByRole('link', { name: /^Burning Abyss/ });
        const plain = rail.getByRole('link', { name: /^Non-archetype/ });
        const bg = (locator: typeof abyss) =>
          locator.evaluate((el) => getComputedStyle(el).backgroundColor);

        const abyssRest = await bg(abyss);
        expect(abyssRest).not.toBe('rgba(0, 0, 0, 0)');
        expect(await bg(plain)).toBe('rgba(0, 0, 0, 0)');

        await abyss.hover();
        await expect.poll(() => bg(abyss)).not.toBe(abyssRest);
      });
      ```
- [ ] 12. Run `cd website && npx playwright test tests/e2e/showcase.spec.ts --project=chromium`; confirm green.
- [ ] 13. In `website/DESIGN.md`, after the paragraph beginning
      `**The One Rail Rule.**`, add a new paragraph:
      `**Rail tint.** Each archetype entry in the rail wears a 14% wash of its own accent, lifting to 32% over `--sleeve` on hover, focus and current page. Non-archetype has no section colour and stays on the rail's black.`
- [ ] 14. Run `cd website && npm run format && npm run ci`.
- [ ] 15. Run `graphify update .` from the repo root.

## Outputs

- Files touched: `website/src/layouts/BaseLayout.astro`,
  `website/src/components/Navigation.svelte`,
  `website/src/styles/global.css`, `website/DESIGN.md`,
  `website/tests/unit/nav-accent.test.ts` (new),
  `website/tests/e2e/showcase.spec.ts`.
- Public API change: the `sections` prop of `Navigation.svelte` now requires
  `accent: string`.
- No migration, no config change.

## Validation

- [ ] `cd website && npx vitest run tests/unit/nav-accent.test.ts` passes
- [ ] `cd website && npm run ci` passes (`astro check` proves the widened
      `NavSection` type still matches what `BaseLayout` passes)
- [ ] `cd website && npx playwright test tests/e2e/showcase.spec.ts` passes on all three projects
- [ ] manual: at 1400px, Burning Abyss reads orange-washed, Nekroz blue-washed,
      Non-archetype black; hovering any of them deepens the wash
- [ ] app functional — every route renders, no console error
- [ ] commit msg draft: `feat(website): tint rail items with their archetype colour`

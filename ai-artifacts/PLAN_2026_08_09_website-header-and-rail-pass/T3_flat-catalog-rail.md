# T3: Flat catalog rail

**Plan:** `./ai-artifacts/PLAN_2026_08_09_website-header-and-rail-pass.md`
**Depends:** T2
**Commit outcome:** The catalog rail and the mobile drawer each render one flat
list of every section — no "Non-Archetype" collapsible group, no "Archetypes"
heading.

## Context (self-contained)

- Goal: rework the Essentia website shell — full-width header menubar, rail
  docked beneath it, flat colour-coded rail, compact phone header, tighter
  archetype hero. This ticket flattens the rail's list.
- This slice: third of seven. It changes only the **catalog** branch of
  `Navigation.svelte` (`mode === 'catalog'`). The **reading** branch
  (`mode === 'reading'`, docs/blog) keeps its `.reading-switch` and its
  `.nav-label` group headings — `website/scripts/check-chrome.mjs` fails the
  build without them.
- Out of scope here: nav item tints (T4), the header's phone-width compaction
  (T5), the 400px guard (T6), the catalog hero (T7). Do not touch
  `website/scripts/content/`, `cards_mse/`, or any Python.
- Assumptions in force: feedback line 5 says "nav drawer", and the mobile
  `<dialog class="mobile-drawer">` is the only navigation below 64rem, so it is
  flattened identically.

What T1 and T2 left behind (do not re-do, do not undo):

- `<Navigation client:load … />` renders **inside** `<header class="site-header">`
  in `website/src/layouts/BaseLayout.astro`, after `<a class="compact-brand">`.
- `nav#desktop-catalog` has exactly one toggle: the final
  `<button class="rail-toggle rail-toggle--bottom">`, a 2.25rem square with
  `align-self: flex-end`.
- `.desktop-catalog` is `inset: var(--header) auto 0 0`.

Current state of the catalog branch, verbatim, in
`website/src/components/Navigation.svelte`:

- Script block declares `let nonArchetypeOpen = true;` and
  ```ts
  const nonArchetype = sections.filter((section) => section.kind === 'non-archetype');
  const archetypes = sections.filter((section) => section.kind === 'archetype');
  ```
- Desktop, under `{#if mode === 'catalog'}`: a
  `<button class="nav-group" aria-expanded={nonArchetypeOpen} aria-controls="desktop-non-archetype">Non-Archetype …</button>`,
  a conditional `<ul id="desktop-non-archetype">` of `nonArchetype`, a
  `<p class="nav-label">Archetypes</p>`, and a `<ul>` of `archetypes`.
- Mobile drawer, under `{#if mode === 'catalog'}`: a `<details open>` with
  `<summary>Non-Archetype</summary>` wrapping a `<ul>` of `nonArchetype`, then
  `<p class="nav-label">Archetypes</p>` and a `<ul>` of `archetypes`.
- Each `<li>` is
  `<a href={href(section.route)} aria-current={current(section.route)}>{section.label}<small>{section.count}</small></a>`
  (the drawer variant has a space before `<small>`).
- `sections` arrives already ordered — `website/content/sections.json` lists
  `non-archetype` (order 0) then `burning-abyss`, `shaddoll`, `nekroz`,
  `spellbook` (orders 1–4). Rendering `sections` as-is preserves that order and
  keeps Non-archetype first.
- `website/src/styles/global.css` declares `.nav-group { … }` near line 403; it
  is used by nothing else.
- `website/scripts/check-chrome.mjs` `mobileReadingNavIssues()` only runs on
  `docs/` and `blog/` pages and only inspects the **reading** markup, so
  flattening the catalog branch cannot trip it.

## Requirements

1. `mode === 'catalog'` renders exactly one `<ul>` in the desktop rail and one
   `<ul>` in the mobile drawer, each iterating `sections` in the order received.
2. No "Non-Archetype" group button, no `<details>`/`<summary>`, no "Archetypes"
   `.nav-label` in the catalog branch.
3. The `nonArchetypeOpen` state, the `nonArchetype` filter and the `archetypes`
   filter are deleted from the component script.
4. Each item keeps its label, its `<small>` count, its `href` and its
   `aria-current`.
5. The reading branch is byte-identical to before.
6. `.nav-group` is removed from `global.css`; `.nav-label` stays (reading mode).

## Inputs

- `website/src/components/Navigation.svelte`
- `website/src/styles/global.css`
- `website/content/sections.json` (read only — confirms the order)
- `website/tests/e2e/showcase.spec.ts`, test
  `blog pages swap the catalog for the blog list` — currently asserts
  `rail.getByRole('button', { name: /Non-Archetype/ })` has count 0, which
  becomes vacuous and must be replaced.
- **From T2:** the rail ends with one `<button class="rail-toggle rail-toggle--bottom">`;
  keep it as the last child of `nav#desktop-catalog`.

## TDD

1. **Red** — add `website/tests/unit/catalog-nav-flat.test.ts` per the table
   below, run `cd website && npx vitest run tests/unit/catalog-nav-flat.test.ts`,
   confirm failures.
2. **Green** — apply the impl steps.
3. **Refactor** — none. Keep green.

## Test plan

| Test                                             | Input                                                                 | Expect                                                     |
| ------------------------------------------------ | --------------------------------------------------------------------- | ----------------------------------------------------------- |
| `the catalog rail has no group toggle`           | `Navigation.svelte`                                                    | does not match `/class="nav-group"/`                        |
| `the catalog rail has no Non-Archetype heading`  | `Navigation.svelte`                                                    | does not match `/Non-Archetype/`                            |
| `the drawer has no disclosure`                   | `Navigation.svelte`                                                    | does not match `/<details/` and not `/<summary/`            |
| `the archetype heading is gone`                  | `Navigation.svelte`                                                    | does not match `/>Archetypes</`                             |
| `both catalog lists iterate every section`       | `Navigation.svelte` match count of `/#each sections as section/g`      | `2`                                                         |
| `the split filters are gone`                     | `Navigation.svelte`                                                    | does not match `/const nonArchetype =/` nor `/const archetypes =/` nor `/nonArchetypeOpen/` |
| `the reading branch keeps its group headings`    | `Navigation.svelte`                                                    | still matches `/#each readingGroups as group/` and `/class="nav-label"/` twice |
| `the group button style is gone`                 | `global.css`                                                           | does not match `/^\s*\.nav-group\s*\{/m`                    |
| `the section order still leads with non-archetype` | `website/content/sections.json`                                      | `sections[0].slug === 'non-archetype'` and `sections` is sorted ascending by `order` |
| e2e `the catalog rail lists every section flat`  | viewport 1400×900, `/`                                                 | nav named `Catalog` has 5 links (`Non-archetype`, `Burning Abyss`, `Shaddoll`, `Nekroz`, `Spellbook`) and exactly 1 button (the rail toggle) |
| e2e `blog pages swap the catalog for the blog list` (edited) | viewport 1400×900, `/blog/`                              | nav named `Documentation and blog` has 0 links named `Nekroz`   |

## Impl steps

- [ ] 1. Create `website/tests/unit/catalog-nav-flat.test.ts` reading
      `../../src/components/Navigation.svelte`, `../../src/styles/global.css`
      and `../../content/sections.json`, with the nine unit rows above.
- [ ] 2. Run `cd website && npx vitest run tests/unit/catalog-nav-flat.test.ts`;
      confirm red.
- [ ] 3. In `website/src/components/Navigation.svelte`, delete
      `let nonArchetypeOpen = true;` from the script block.
- [ ] 4. Delete the `const nonArchetype = …` and `const archetypes = …`
      declarations. Keep `href()` and `current()`.
- [ ] 5. Replace the whole desktop catalog branch — from
      `<button class="nav-group"` through the closing `</ul>` that follows
      `<p class="nav-label">Archetypes</p>` — with:
      ```svelte
      <!-- One flat list. Sections arrive pre-ordered from
           website/content/sections.json (non-archetype first), so grouping
           them again only added a heading and a disclosure to click through. -->
      <ul id="desktop-catalog-sections">
        {#each sections as section (section.slug)}
          <li>
            <a href={href(section.route)} aria-current={current(section.route)}
              >{section.label}<small>{section.count}</small></a
            >
          </li>
        {/each}
      </ul>
      ```
- [ ] 6. Replace the whole mobile-drawer catalog branch — from `<details open>`
      through the closing `</ul>` that follows
      `<p class="nav-label">Archetypes</p>` — with:
      ```svelte
      <ul>
        {#each sections as section (section.slug)}<li>
            <a href={href(section.route)} aria-current={current(section.route)}
              >{section.label} <small>{section.count}</small></a
            >
          </li>{/each}
      </ul>
      ```
- [ ] 7. In `website/src/styles/global.css`, delete the whole `.nav-group { … }`
      block. Leave `.nav-label { … }` untouched.
- [ ] 8. Run `cd website && npx vitest run tests/unit/catalog-nav-flat.test.ts`;
      confirm green.
- [ ] 9. In `website/tests/e2e/showcase.spec.ts`, inside
      `test('blog pages swap the catalog for the blog list')`, replace
      ```ts
      await expect(rail.getByRole('button', { name: /Non-Archetype/ })).toHaveCount(0);
      ```
      with
      ```ts
      // The card catalog is not rendered here — none of its sections appear.
      await expect(rail.getByRole('link', { name: /Nekroz/ })).toHaveCount(0);
      ```
- [ ] 10. Append to `website/tests/e2e/showcase.spec.ts`:
      ```ts
      test('the catalog rail lists every section flat', async ({ page }) => {
        await page.setViewportSize({ width: 1400, height: 900 });
        await page.goto(urlFor('/'));
        const rail = page.getByRole('navigation', { name: 'Catalog' });
        for (const label of ['Non-archetype', 'Burning Abyss', 'Shaddoll', 'Nekroz', 'Spellbook']) {
          await expect(rail.getByRole('link', { name: new RegExp(`^${label}`) })).toHaveCount(1);
        }
        // The only button left in the rail is the collapse square.
        await expect(rail.getByRole('button')).toHaveCount(1);
      });
      ```
- [ ] 11. Run `cd website && npx playwright test tests/e2e/showcase.spec.ts --project=chromium`; confirm green.
- [ ] 12. Run `cd website && npm run format && npm run ci`.
- [ ] 13. Run `graphify update .` from the repo root.

## Outputs

- Files touched: `website/src/components/Navigation.svelte`,
  `website/src/styles/global.css`,
  `website/tests/unit/catalog-nav-flat.test.ts` (new),
  `website/tests/e2e/showcase.spec.ts`.
- Behaviour change: the catalog rail and drawer show one flat, pre-ordered list.
- Contract for later tickets: both catalog lists are
  `{#each sections as section (section.slug)}` over the full `sections` array;
  the desktop list carries `id="desktop-catalog-sections"`; each `<li>` holds
  exactly one `<a>`.
- No migration, no config change.

## Validation

- [ ] `cd website && npx vitest run tests/unit/catalog-nav-flat.test.ts` passes
- [ ] `cd website && npm run ci` passes (docs/blog pages keep their switcher and
      reading groups — `check-chrome.mjs` proves it)
- [ ] `cd website && npx playwright test tests/e2e/showcase.spec.ts` passes on all three projects
- [ ] manual: at 1400px the rail shows five links and no heading; at 500px the
      hamburger opens a drawer showing the same five links
- [ ] app functional — every route renders, no console error
- [ ] commit msg draft: `feat(website): flatten the catalog rail into one list`

# T7: Archetype hero panel

**Plan:** `./ai-artifacts/PLAN_2026_08_10_feedback_batch.md`
**Depends:** none
**Commit outcome:** on every `/archetypes/{slug}` page, the archetype title, intro
and stats sit on a translucent bordered panel that lifts them off the background.

## Context (self-contained)

- Goal: `feedback.md` item 1 — archetype title and description must pop out.
- This slice: the archetype page hero only.
- Out of scope here: the homepage archetype tiles, the non-archetype section page
  (`src/pages/sections/non-archetype/[slug].astro`), the card gallery below the hero.
- Assumptions in force: the panel wraps title + intro + stats as one block, not three.

## Requirements

- New wrapper element with class `catalog-hero-panel` around the existing left column
  (`<h1>`, `<Markdown class="catalog-hero-intro">`, `<div class="catalog-stats">`).
- Panel styling, in `global.css` next to `.catalog-hero`:
  ```css
  .catalog-hero-panel {
    background: color-mix(in oklab, var(--blackfoil) 68%, transparent);
    border: 1px solid var(--ruleline);
    border-radius: var(--radius);
    padding: var(--space-4);
  }
  ```
- Panel background must be translucent — its computed `background-color` alpha is
  strictly below 1, which the e2e test asserts.
- Layout must not shift: `.catalog-hero` keeps
  `grid-template-columns: minmax(0, 1.25fr) minmax(18rem, 0.75fr)`; the panel is the
  first grid child, exactly where the old `<div>` was.
- No change to `catalog-hero-art`, the hover zoom, or the stats markup.

## Inputs

- `website/src/pages/archetypes/[slug].astro` lines 33-52: the `<section class="catalog-hero">`
  with an unclassed `<div>` holding `<h1>{section.label}</h1>`,
  `<Markdown value={section.introMarkdown} class="catalog-hero-intro" />` and
  `<div class="catalog-stats">`.
- `website/src/styles/global.css`: `.catalog-hero` line 844, `.catalog-hero-intro` line 859,
  `.catalog-hero-art` line 870, `.catalog-stats` line 899. Tokens available:
  `--blackfoil`, `--ruleline`, `--radius`, `--space-4`.
- Sections rendered by this template: `burning-abyss`, `nekroz` (and `shaddoll`,
  `spellbook` when they publish) — `kind === 'archetype'` only.
- **From Depends:** none.

## TDD

1. **Red** — write `website/tests/unit/catalog-hero-panel.test.ts` and
   `website/tests/e2e/archetype-hero-panel.spec.ts` first.
2. **Green** — add the wrapper and the CSS rule.
3. **Refactor** — none.

## Test plan

| Test | Input | Expect |
| --- | --- | --- |
| `catalog-hero-panel.test.ts` › `declares a translucent background and a border` | `global.css` rule for `.catalog-hero-panel` | matches `/background:\s*color-mix\(/` and `/border:\s*1px solid var\(--ruleline\)/` |
| `catalog-hero-panel.test.ts` › `wraps the title, intro and stats` | `archetypes/[slug].astro` source | `catalog-hero-panel` appears exactly once and before `catalog-hero-art` |
| `archetype-hero-panel.spec.ts` › `panel exists on an archetype page` | `/archetypes/burning-abyss/` | `.catalog-hero-panel` visible, contains `h1` and `.catalog-stats` |
| `archetype-hero-panel.spec.ts` › `panel background is translucent` | same | computed `background-color` parses to `rgba(...)` with alpha `< 1` |
| `archetype-hero-panel.spec.ts` › `panel has a visible border` | same | computed `border-top-width` `=== '1px'` and `border-top-style === 'solid'` |
| `archetype-hero-panel.spec.ts` › `non-archetype section is untouched` | `/sections/non-archetype/<slug>/` | `.catalog-hero-panel` count `=== 0` |

## Impl steps

- [x] 1. In `website/src/pages/archetypes/[slug].astro`, change the first grid child from
      `<div>` to `<div class="catalog-hero-panel">`. Nothing inside it moves.
- [x] 2. In `global.css`, add the `.catalog-hero-panel` rule immediately after
      `.catalog-hero { … }` so the cascade order reads top-down.
- [x] 3. Add `@media (max-width: 48rem) { .catalog-hero-panel { padding: var(--space-3); } }`
      so the panel does not squeeze the intro on a phone.
- [x] 4. Create `website/tests/unit/catalog-hero-panel.test.ts`, reusing the comment-stripping
      `ruleFor` idiom from `tests/unit/new-card-grid.test.ts`.
- [x] 5. Create `website/tests/e2e/archetype-hero-panel.spec.ts`. Read the non-archetype
      route from the built site: it is `/sections/non-archetype/<slug>/`; resolve the slug by
      visiting `/` and following the first non-archetype tile, or hardcode the known slug
      `non-archetype` after checking `website/content/sections.json`.

## Outputs

- `website/src/pages/archetypes/[slug].astro`, `website/src/styles/global.css`,
  `website/tests/unit/catalog-hero-panel.test.ts`,
  `website/tests/e2e/archetype-hero-panel.spec.ts`.
- Behaviour change: archetype hero text sits on a panel.

## Validation

- [x] `cd website && npx vitest run tests/unit/catalog-hero-panel.test.ts` → pass
- [x] `cd website && npx playwright test tests/e2e/archetype-hero-panel.spec.ts` → pass × 2 browsers (chromium, webkit); firefox cannot launch in this env, pre-existing/unrelated per repo notes
- [x] `cd website && npx vitest run tests/unit/catalog-hero-layout.test.ts` → still pass
- [x] manual check: `/archetypes/burning-abyss/` — title and intro on a bordered panel
- [x] `cd website && npm run ci` → pass
- [ ] commit msg draft: `feat(website): lift the archetype hero text onto a translucent panel`

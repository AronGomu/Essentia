# T14: Home archetype tiles

**Plan:** `./ai-artifacts/PLAN_2026_08_07_website-feedback-pass.md`
**Depends:** T11, T13
**Commit outcome:** the home page's section grid is titled "Archetypes", uses the committed hero art, lights up a border on hover and focus, and shows a NEW badge on any archetype that gained a card in the newest release.

## Context (self-contained)

- Goal: ship the UX feedback backlog in `.dev/feedback.md`. This ticket lands **Home #9** (drop "Published sections / Current card versions selected from lifecycle metadata.", use "Archetypes"), **#10** (tile art = HD upscale of the section's iconic card), **#11** (border hover effect), **#12** (NEW badge top-right for archetypes that gained cards).
- This slice: the last section of `src/pages/index.astro` plus its CSS.
- Out of scope here: the hero (T12) and the new-cards grid (T13) above it. The archetype detail page is T16.
- Assumptions in force: the non-archetype section keeps its tile in this grid — feedback #10 names it as one of the tiles ("non-archetype = ash blossom").

## Requirements

- The section heading is exactly `Archetypes`; the descriptive paragraph under it is deleted.
- Each tile's `<img src>` is `section.heroImage`.
- Hover and keyboard focus draw a visible border in the section accent colour; the existing image scale/saturate effect stays.
- A tile shows `<span class="tile-badge">New</span>` positioned top-right when at least one of the section's cards came from the newest release.
- `prefers-reduced-motion` and `forced-colors` behaviour stays intact.

## Inputs

- `website/src/pages/index.astro` — lines 93–120 hold `<section aria-labelledby="catalog-heading">` with `.page-shell.section-heading` (h2 `Published sections`, p `Current card versions selected from lifecycle metadata.`) and `.section-menu` containing one `<a class="section-tile" href={withBase(base, section.route)}>` per `catalog.sections`, each with an `<img src={withBase(base, section.image)} width="1200" height="800" loading="lazy">` and a `<div><h3>{section.label}</h3><p>{section.count} published cards · Updated {formatDate(section.latestModified)}</p></div>`.
- `website/src/styles/global.css` — `.section-tile` at line ~540 (`position: relative; min-height: 24rem; display: flex; align-items: flex-end; overflow: hidden; background: var(--blackfoil);`), `.section-tile img` (absolute, `object-fit: cover`, transition on transform/filter), `.section-tile::after` (gradient scrim), `.section-tile div`, `.section-tile h3`, `.section-tile p`, `.section-tile:hover img, .section-tile:focus-visible img` (scale + saturate). The reduced-motion block near line 834 and the forced-colors block at the end both name `.section-tile`.
- `website/src/lib/catalog.ts` — `catalog.sections`, `cardsById`, `withBase`, `formatDate`.
- `website/scripts/check-chrome.mjs`, `website/tests/unit/chrome.test.ts` — the dist gate; extend both.
- **From Depends (T11):** every `catalog.sections[]` entry has `heroImage: string` = `/art/<slug>-hero.webp`, a committed 624×624 webp converted with `sharp` from the section's original iconic card illustration (`original_images/<type>/<Card Name>.jpg`). No generative service was used. The owner may later overwrite that file with a higher-resolution upscale of the same square crop; nothing validates its dimensions, so treat the `width`/`height` attributes as an aspect-ratio hint, not a hard size.
- **From Depends (T13):** `website/src/lib/catalog.ts` exports `latestRelease: ReleasePackage | null` and `isLatestRelease(card: { packageId: string }): boolean`, true when the card's current version came from `catalog.releases[0]`.

## TDD

1. **Red** — add the tile cases to `website/tests/unit/chrome.test.ts`; write `website/tests/unit/section-badges.test.ts` against a new helper `sectionHasNewCards`. Both fail.
2. **Green** — add the helper, rewrite the section, add the CSS, add the gate rules.
3. **Refactor** — none.

Exact helper in `website/src/lib/catalog.ts`:

```ts
/** True when any card currently in this section came from the newest release package. */
export function sectionHasNewCards(section: { cardIds: string[] }): boolean {
  return section.cardIds.some((id) => {
    const card = cardsById.get(id);
    return card ? isLatestRelease(card) : false;
  });
}
```

Gate rules added to `chromeIssues(file, html, base)` for `file === 'index.html'`:

- `index.html: section grid must be titled "Archetypes"` unless the html contains `<h2 id="catalog-heading">Archetypes</h2>`
- `index.html: the "Published sections" copy must be gone` when the html contains `Published sections` or `Current card versions selected from lifecycle metadata.`
- `index.html: section tiles must use the hero art` when any `class="section-tile"` block contains an `<img src="…">` that does not match `/^<base>art\/[a-z0-9-]+-hero\.webp$/`

## Test plan

| Test | Input | Expect |
| ---- | ----- | ------ |
| `flags a section holding a newest-release card` | real `catalog.sections[0]` on the current single-package catalog | `true` |
| `is false for an empty section` | `{ cardIds: [] }` | `false` |
| `is false for unknown ids` | `{ cardIds: ['does-not-exist'] }` | `false` |
| `accepts the new heading` | html containing `<h2 id="catalog-heading">Archetypes</h2>` and hero-art tiles | `[]` |
| `flags the old heading` | html containing `Published sections` | contains `the "Published sections" copy must be gone` |
| `flags a thumb-tier tile image` | tile img `src="/generated/releases/…-thumb.webp"` | contains `section tiles must use the hero art` |

Run: `cd website && npx vitest run tests/unit/section-badges.test.ts tests/unit/chrome.test.ts`

## Impl steps

- [x] 1. Add the six cases above to the two test files.
- [x] 2. Add `sectionHasNewCards` to `website/src/lib/catalog.ts`.
- [x] 3. Add the three gate rules to `website/scripts/check-chrome.mjs`.
- [x] 4. In `website/src/pages/index.astro`, change the `<h2 id="catalog-heading">` text to `Archetypes` and delete the sibling `<p>Current card versions selected from lifecycle metadata.</p>`.
- [x] 5. Change the tile `<img>` to `src={withBase(base, section.heroImage)}` and set `width="624" height="624"` (the committed asset is square); keep `loading="lazy"` and `alt=""`.
- [x] 6. Inside each `<a class="section-tile">`, before the `<img>`, add `{sectionHasNewCards(section) && <span class="tile-badge">New</span>}`.
- [x] 7. Add to `website/src/styles/global.css` beside the existing `.section-tile` rules:
      `.section-tile { border: 1px solid transparent; transition: border-color 220ms var(--ease-out); }`
      `.section-tile:hover, .section-tile:focus-visible { border-color: var(--accent); }`
      `.tile-badge { position: absolute; top: 0.9rem; right: 0.9rem; z-index: 2; background: var(--accent); color: var(--blackfoil); font-size: 0.72rem; letter-spacing: 0.08em; text-transform: uppercase; padding: 0.2rem 0.5rem; border-radius: 999px; }`
- [x] 8. Add `.section-tile:hover, .section-tile:focus-visible { border-color: Highlight; }` inside the existing `@media (forced-colors: active)` block so the affordance survives forced colours.
- [x] 9. Add `.section-tile { transition: none; }` to the existing `@media (prefers-reduced-motion: reduce)` block alongside the other `.section-tile` overrides — the border still changes colour, just instantly.
- [x] 10. Run `npm run build`, `npm run budgets:check`, `npm run format`, `npm run lint`, `npm run check`.

## Outputs

- Files touched: `website/src/lib/catalog.ts`, `website/src/pages/index.astro`, `website/src/styles/global.css`, `website/scripts/check-chrome.mjs`, `website/tests/unit/section-badges.test.ts` (new), `website/tests/unit/chrome.test.ts`.
- Public API: `sectionHasNewCards` — reused by T16.
- No migration.

## Validation

- [x] `cd website && npx vitest run tests/unit/section-badges.test.ts tests/unit/chrome.test.ts` — all pass
- [x] `cd website && npm run build && npm run budgets:check` — exit 0
- [x] manual check: `node scripts/serve-dist.mjs`, open `/` — the grid is headed `Archetypes`, each tile shows the full original illustration rather than the soft 240 px thumb, hovering draws an accent border, and every section with cards from LOTA-0001 shows a `New` badge in its top-right corner — SUBSTITUTED (no browser/e2e harness on this host): inspected `dist/index.html` directly. Confirms `<h2 id="catalog-heading" data-astro-cid-lcdefpme>Archetypes</h2>`; all 3 tiles use `/art/<slug>-hero.webp` (624x624) not `/generated/...thumb.webp`; all 3 tiles carry `<span class="tile-badge">New</span>` (single-package catalog, so every section currently has LOTA-0001 cards). Compiled `dist/_astro/*.css` confirms `.section-tile:hover,.section-tile:focus-visible{border-color:var(--accent)}`.
- [x] manual check: tab to a tile with the keyboard — the border appears on focus — SUBSTITUTED (no browser/e2e harness on this host): compiled CSS rule `.section-tile:hover,.section-tile:focus-visible{border-color:var(--accent)}` applies identically to `:focus-visible` as `:hover`, and `dist/index.html` tiles are plain `<a>` elements (natively keyboard-focusable, no tabindex override), so keyboard focus triggers the same rule as mouse hover.
- [x] `cd website && npm run ci` — exit 0
- [x] app functional — every tile still links to its section route — verified in `dist/index.html`: tiles link to `/sections/non-archetype/non-archetype/`, `/archetypes/burning-abyss/`, `/archetypes/nekroz/` (each `<a class="section-tile" href={withBase(base, section.route)}>` unchanged from before this ticket)
- [x] commit msg draft: `feat(website): restyle the home archetype tiles with hero art, hover border and new badge`

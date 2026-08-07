# T17: Remove card zoom

**Plan:** `./ai_artefacts/PLAN_2026_08_07_website-feedback-pass.md`
**Depends:** T1
**Commit outcome:** the "view full size" control is gone from every card page, the `ImageZoom` island no longer ships, and the build stops producing the 1500 px `zoom` tier nothing renders any more.

## Context (self-contained)

- Goal: ship the UX feedback backlog in `.dev/feedback.md`. Feedback **Cards #1**: "Remove view full size card button and feature."
- This slice: the card detail page, the card version page, the component, the image tier, and the catalog type.
- Out of scope here: the hover preview (T20), the keyword rulings (T19), and the related-cards list (T21) on the same page. The `print` tier stays — it feeds proxy printing, not the website UI.
- Assumptions in force: with the viewer gone the `zoom` tier has no consumer, so it is removed rather than shipped unused. `display` (750 px) remains the largest tier the site renders.

## Requirements

- `website/src/components/ImageZoom.svelte` is deleted.
- No page imports or renders it.
- `TIERS` in `website/scripts/content/images.mjs` no longer contains `zoom`; `CardImages` no longer declares it.
- No `*-zoom.webp` file is produced in `website/public/generated/`.
- Total shipped JS drops (one fewer island).

## Inputs

- `website/src/pages/cards/[id].astro` — line 4 `import ImageZoom from '../../components/ImageZoom.svelte';`, line 35 `const zoomImage = withBase(base, card.images.zoom.webp);`, lines 60–66 the `<ImageZoom client:load src={zoomImage} alt={...} width={card.width} height={card.height} />` inside `.render-column`.
- `website/src/pages/cards/[id]/versions/[package].astro` — line 22 `const zoomImage = withBase(base, card.images.zoom.webp);` and line 42 the `<ImageZoom …>` usage. Same removal.
- `website/src/components/ImageZoom.svelte` — the component to delete. It owns `.zoom-trigger` and `.zoom-dialog` styles inline, so no `global.css` cleanup is needed unless a grep finds stragglers.
- `website/scripts/content/images.mjs` — `export const TIERS = [{ name: 'thumb', width: 240, formats: ['avif','webp'] }, { name: 'display', width: 750, formats: ['avif','webp'] }, { name: 'zoom', width: 1500, formats: ['webp'] }]`. `buildCardImages` loops `TIERS` and then writes the separate `print` PNG — leave the print block untouched.
- `website/src/lib/catalog.ts` — `export interface CardImages { thumb: ImageTier; display: ImageTier; zoom: ImageTier; print: PrintImage; width: number; height: number }`.
- `website/src/components/CardQualityUpgrade.astro` and `website/src/components/CardPicture.astro` — both deal with `thumb` → `display` upgrades only; confirm with a grep that neither references `zoom`.
- `website/scripts/check-budgets.mjs` — image totals will drop; nothing to change.
- **From Depends (T1):** `npm run preflight` passes. Nothing else consumed.

## TDD

1. **Red** — add a case to `website/tests/unit/catalog.test.ts` asserting no published card exposes a `zoom` tier, and a case to `website/tests/unit/chrome.test.ts` asserting no built page contains `zoom-trigger`. Both fail.
2. **Green** — delete the component and its usages, drop the tier, drop the type field.
3. **Refactor** — none.

Gate rule added to `chromeIssues(file, html, base)`, all files:

- `${file}: the full-size card viewer must be gone` when the html contains `zoom-trigger` or `zoom-dialog`

## Test plan

| Test | Input | Expect |
| ---- | ----- | ------ |
| `catalog exposes no zoom tier` | `catalog.cards.every((card) => !('zoom' in card.images))` | `true` |
| `catalog still exposes thumb, display and print` | first card's `images` keys | contains `thumb`, `display`, `print`, `width`, `height` |
| `flags a leftover zoom trigger` | `chromeIssues('cards/x/index.html', '<button class="zoom-trigger">', '/')` | contains `the full-size card viewer must be gone` |
| `accepts a card page without it` | card html with no zoom markup | no zoom complaint |

Run: `cd website && npx vitest run tests/unit/catalog.test.ts tests/unit/chrome.test.ts`

## Impl steps

- [ ] 1. Add the four cases above to the two test files.
- [ ] 2. Add the gate rule to `website/scripts/check-chrome.mjs`.
- [ ] 3. In `website/src/pages/cards/[id].astro`, delete the `ImageZoom` import, the `zoomImage` constant, and the `<ImageZoom …>` element. `.render-column` keeps only `<CardPicture card={card} tier="display" eager alt={…} />`.
- [ ] 4. Apply the same three deletions to `website/src/pages/cards/[id]/versions/[package].astro`.
- [ ] 5. `git rm website/src/components/ImageZoom.svelte`.
- [ ] 6. Remove the `zoom` entry from `TIERS` in `website/scripts/content/images.mjs`.
- [ ] 7. Remove `zoom: ImageTier;` from `CardImages` in `website/src/lib/catalog.ts`.
- [ ] 8. `grep -rn "zoom" website/src website/scripts website/tests --include='*.astro' --include='*.ts' --include='*.mjs' --include='*.svelte'` and clear every remaining hit outside `src/generated/` (which the build regenerates).
- [ ] 9. Delete `website/public/generated/` and rebuild so no stale `*-zoom.webp` survives: `rm -rf public/generated && npm run build`.
- [ ] 10. Run `npm run budgets:check`, `npm run format`, `npm run lint`, `npm run check`.

## Outputs

- Files touched: `website/src/pages/cards/[id].astro`, `website/src/pages/cards/[id]/versions/[package].astro`, `website/src/components/ImageZoom.svelte` (deleted), `website/scripts/content/images.mjs`, `website/src/lib/catalog.ts`, `website/scripts/check-chrome.mjs`, `website/tests/unit/catalog.test.ts`, `website/tests/unit/chrome.test.ts`.
- Behaviour: no full-size viewer; smaller JS bundle; 50 fewer generated images.
- Migration: `CardImages.zoom` removed — a type-level breaking change with no external consumer.

## Validation

- [ ] `cd website && npx vitest run` — full suite green
- [ ] `cd website && npm run build` — chrome gate reports no viewer complaint; `find public/generated -name '*-zoom.webp'` returns nothing
- [ ] `cd website && npm run budgets:check` — exit 0; JS total lower than before this commit
- [ ] manual check: `node scripts/serve-dist.mjs`, open `/cards/nekroz-trishula/` — the card render shows with no zoom button, and clicking the image does nothing
- [ ] manual check: `/cards/nekroz-trishula/versions/alpha-LOTA-0001-Alpha-0-1/` behaves the same
- [ ] `cd website && npm run ci` — exit 0
- [ ] app functional — card pages otherwise unchanged
- [ ] commit msg draft: `feat(website): drop the full-size card viewer and its image tier`

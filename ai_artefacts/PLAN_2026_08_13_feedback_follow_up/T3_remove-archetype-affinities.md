# T3: Remove four archetype affinities

**Plan:** `./ai_artefacts/PLAN_2026_08_13_feedback_follow_up.md`
**Depends:** T2
**Commit outcome:** Tour Guide, Preparation of Rites, Manju, Senju remain published staples under non-archetype with zero Burning Abyss/Nekroz affinity.

## Context (self-contained)

- Goal: Remove Tour Guide From the Underworld from Burning Abyss; remove Preparation of Rites, Manju of the Ten Thousand Hands, Senju of the Thousand Hands from Nekroz.
- This slice: User confirmed **all affinity removal**, not gallery-only removal. Galleries already exclude these unlinked support cards; real delta is identity + Same archetype relation.
- Out of scope here: deleting cards, moving MSE files, changing MSE fields/renders, decklists, package contents, generic support/link rules, other support cards.
- Assumptions in force: exact four stable IDs below; identity-only metadata edit; cards stay `sectionSlug: 'non-archetype'`; source arrays/history stay unchanged.
- Worktree rule: planning docs are expected outputs; never edit/stage unrelated files.

## Requirements

- Exact stable IDs:
  - `tour-guide-from-the-underworld`
  - `preparation-of-rites`
  - `manju-of-the-ten-thousand-hands`
  - `senju-of-the-thousand-hands`
- Each `website/content/identities.json` record becomes `archetype: null`, `role: "staple"`.
- Preserve `stableId`, `sources`, `routeAliases`, `retired`, `withdrawn`; keep `linked` absent.
- Generated current cards: `archetype === null`, `archetypeRole === 'staple'`, `support === false`, `sectionSlug === 'non-archetype'`, `related.archetype === []`.
- Every published `catalog.cardVersions` entry for these IDs also has null/staple/false + non-archetype placement.
- All four routes/renders remain published.
- Named Burning Abyss/Nekroz members retain existing membership + related lists. Their `related.archetype` arrays already contain printed-name members only; these four unlinked supports were never entries, so member arrays do not change.
- Generic unlinked/linked support behavior stays valid; tests use a non-target fixture, not Tour Guide.
- T2 catalog schema 12 + blog heading metadata survive regeneration.

## Inputs

- `website/content/identities.json` — only card-affinity source.
- `website/scripts/content/identity.mjs::{assertMembership,resolveSection}` — `archetype: null` requires `role: staple`.
- `website/scripts/content/related.mjs::buildRelatedGraph()` — skips Same archetype when card `archetype` is null.
- `website/scripts/content/packages.mjs` — copies `identity.archetype` + `identity.role` to catalog.
- `website/tests/unit/archetype.test.ts`, `related-cards.test.ts`.
- `website/tests/e2e/related-cards.spec.ts`.
- `docs/ADR/proposed/{0016-archetype-sections-hold-members-only,0036-related-interaction-excludes-archetype,0040-quoted-name-relations}.md` — proposed target/history docs; this ticket owns their affinity amendments in implementation diff. Identity file remains exact value source.
- **From Depends:** T2 commit `e1c661af0d192e3244bfbb21b377723b53c4439d` makes generated `website/src/generated/catalog.ts` schema 12; every `CatalogPost` has `headings`; both blog routes render `ChapterSummary`; focused Vitest 63/63, Chromium 7/7, full CI 783/783; commit pushed. `npm run content` here must preserve all T2 output. Generated catalog is ignored + historically untracked; regenerate + inspect, never force-add/stage.

## TDD

1. **Red** — write behavior tests first:
   - `authored archetype registry > selected generic cards carry no archetype affinity`: map identities by ID; each exact record contains `archetype: null`, `role: 'staple'`; `linked` absent.
   - Replace target-specific generic fixtures: use name `Beatrice, Lady of the Eternal` in `accepts an unnamed card authored as support`; use stable ID `beatrice-lady-of-the-eternal` in `moves an unlinked support card out` + `keeps an explicitly linked support card`.
   - `related cards data (catalog field) > selected generic staples have no Same archetype relation`: current card fields exactly null/staple/`support: false`/non-archetype; `related` exactly `{ archetype: [], references: [], referencedBy: [] }`; routes exist. Loop matching `catalog.cardVersions` too; assert null/staple/false/non-archetype for every version.
   - E2E `selected generic staples render no Same archetype section`: loop all four routes; `#related-archetype` count = 0.
   - Keep positive e2e: Burning Abyss member still renders linked Same archetype gallery.
2. **Green** — change only 8 JSON values; regenerate catalog.
3. **Refactor** — no schema/rule refactor. Remove only target-specific stale test examples.

## Test plan

| Test | Input | Expect |
| --- | --- | --- |
| Identity exactness | four stable IDs | null/staple; no `linked`; other fields unchanged |
| Publication | current cards + every cardVersion | routes exist; null/staple/false; non-archetype section |
| Relation output | generated `related.archetype` | `[]` for each target |
| Browser target pages | four `/cards/{id}/` | no `#related-archetype` |
| Positive control | `/cards/burning-abyss-graff/` | Same archetype gallery remains |
| Generation preservation | T2-generated catalog | schema 12 + post headings remain |
| MSE fence | git diff | no `cards_mse/**`, renders, decklists changed |

## Impl steps

- [x] 1. Add Red exact identity/catalog/e2e tests; replace target-specific generic support fixtures with Beatrice. Run focused unit tests; confirm 4 current support affinities fail.
- [x] 2. In `identities.json`, edit only `archetype` + `role` for exact four stable IDs: null + staple.
- [x] 3. Run `cd website && npm run content`; never hand-edit `src/generated/catalog.ts`.
- [x] 4. Inspect generated diff for each target current card + cardVersion: `archetype: null`, `archetypeRole: staple`, `support: false`, non-archetype placement; current card Same archetype relation empty. Confirm schema 12/post headings remain.
- [x] 5. Preserve planning amendments in ADR 0016 + ADR 0040. Mark ADR 0036 superseded by ADR 0040; remove stale target-card affinity claim while retaining historical decision evidence. Update `docs/related-cards-derivation.html`: Same archetype uses optional non-null authored affinity; null staples get no block.
- [x] 6. Run focused unit/e2e tests, `content:check`, then `npm run ci`.
- [x] 7. Run `git diff --name-only`; fail slice if `cards_mse/` (recursively covers package manifests/renders), `original_*`, or `docs/rules/DECKLISTS_ALPHA_0.1.md` changed.

## Outputs

- Touched: `website/content/identities.json`, generated catalog, `archetype.test.ts`, `related-cards.test.ts`, `related-cards.spec.ts`, ADR 0016/0036/0040, `docs/related-cards-derivation.html`.
- Public behavior: four cards lose all archetype labels + Same archetype tiles; routes remain.
- Public API: no shape change; 4 value changes.
- Migration/config: content regeneration only. No MSE/package migration.

## Validation

- [x] `cd website && npx vitest run tests/unit/archetype.test.ts tests/unit/related-cards.test.ts tests/unit/catalog.test.ts` → exit 0.
- [x] `cd website && npm run content && npm run content:check` → exit 0; generated catalog current.
- [x] `cd website && npx playwright test tests/e2e/related-cards.spec.ts --project=chromium` → exit 0; four target pages have no Same archetype section.
- [x] `cd website && npm run ci` → exit 0.
- [x] `git diff --name-only -- cards_mse original_cards original_images original_images_hd docs/rules/DECKLISTS_ALPHA_0.1.md` → no output.
- [x] Manual: open four card pages; card remains visible, section = Non-archetype, no Burning Abyss/Nekroz relation.
- [x] App functional: archetype member galleries + related lists unchanged; non-archetype section still includes targets.
- [x] Commit msg draft: `fix(identity): remove selected support archetype affinities`

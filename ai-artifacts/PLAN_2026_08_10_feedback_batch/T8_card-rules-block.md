# T8: Card page rules block

**Plan:** `./ai-artifacts/PLAN_2026_08_10_feedback_batch.md`
**Depends:** none
**Commit outcome:** a card page prints its rule text exactly as the MSE render
does, and lists every previewed keyword's ruling in its own `Rules` block below.

## Context (self-contained)

- Goal: `feedback.md` item 7 — the card page must show the printed effect text first,
  unchanged, then a rules section carrying the keyword rulings, from the same source of
  truth the hover preview uses.
- This slice: `/cards/{id}` only.
- Out of scope here: `/cards/{id}/versions/{package}` (keeps inline reminders), the
  gallery hover box, keyword ruling text itself, the related-cards block (T9, T10).
- Assumptions in force: the Rules block lists `preview: true` keywords only, in the
  order `previewKeywordsFor` returns (printed order), and sits after the card facts,
  before `Design notes`.

## Requirements

- `/cards/{id}` renders rule text through `<RichText value={card.ruleText} class="rules-text" />`
  with **no** `definitions` prop — so `appendReminders` never runs and no `(ruling)`
  parentheses appear.
- New block, after `<div class="card-facts">` and before the `Design notes` section:
  ```astro
  {rules.length > 0 && (
    <section>
      <h2>Rules</h2>
      <dl class="keyword-rules">
        {rules.map((rule) => (
          <><dt>{rule.term}</dt><dd>{rule.definition}</dd></>
        ))}
      </dl>
    </section>
  )}
  ```
  with `const rules = previewKeywordsFor(card);`.
- `previewKeywordsFor` is imported already for the related block; reuse it, add no new
  map. `reminderDefinitions` import is removed from this file if nothing else uses it.
- The version route `/cards/{id}/versions/{package}` is untouched and keeps inline
  reminders. This divergence is deliberate and recorded in
  `docs/ADR/proposed/0031-card-page-prints-mse-text.md`.
- `.keyword-rules` styling in `global.css`: `dt` bold on its own line, `dd` indented,
  `margin-inline-start: 0`, rows separated by `var(--space-2)`.

## Inputs

- `website/src/pages/cards/[id].astro`:
  - line 15 imports `reminderDefinitions`, line 36 `const ruleDefinitions = reminderDefinitions();`
  - the rule-text render: `<RichText value={card.ruleText} class="rules-text" definitions={ruleDefinitions} />`
  - `<div class="card-facts">` block, then `<section><h2>Release history</h2>`, then
    `<nav class="card-pager">`, then the related block.
  - `previewKeywordsFor` is already imported for the related links.
- `website/src/lib/catalog.ts`: `previewKeywordsFor(card)` returns
  `Array<{ term: string; definition: string }>` filtered to `preview: true`, in the card's
  printed keyword order.
- `website/src/lib/mse-markup.ts`: `renderMseMarkup(value, options)` only appends reminders
  when `options.definitions` is supplied.
- `website/tests/unit/keyword-rulings.test.ts` lines 11-15 define
  `CARD_ROUTES = ['../../src/pages/cards/[id].astro', '../../src/pages/cards/[id]/versions/[package].astro']`
  and lines 92-113 assert **both** routes call `reminderDefinitions()` and pass
  `definitions={ruleDefinitions}`. Those three `it.each` blocks must be rewritten here.
- Reference card: `burning-abyss-graff`, keywords `['Abyssal Curse','Descent','Hard','Linked','On Send Grave','Static','Summon','Triggered']`
  — all `preview: true`, so its Rules block has 8 rows.
- **From Depends:** none.

## TDD

1. **Red** — rewrite the `keyword-rulings.test.ts` route block and add
   `website/tests/e2e/card-rules-block.spec.ts`. Both fail against today's build.
2. **Green** — edit `[id].astro` and `global.css`.
3. **Refactor** — remove the now-unused import; run `npm run lint`.

## Test plan

| Test | Input | Expect |
| --- | --- | --- |
| `keyword-rulings.test.ts` › `the version route still resolves reminders` | version route source | contains `const ruleDefinitions = reminderDefinitions();` and `definitions={ruleDefinitions}` |
| `keyword-rulings.test.ts` › `the card route prints MSE text verbatim` | `[id].astro` source | does **not** match `/definitions=\{ruleDefinitions\}/` and does not import `reminderDefinitions` |
| `keyword-rulings.test.ts` › `neither route builds a map of its own` | both sources | no `new Map(catalog.keywords` (existing assertion, keep) |
| `card-rules-block.spec.ts` › `rule text carries no reminder parentheses` | `/cards/burning-abyss-graff/` | `.rules-text` text has no `(` that is not part of the printed ability prefix `(1 - …)`; assert `textContent` equals the card's `ruleTextPlain` after whitespace collapse |
| `card-rules-block.spec.ts` › `the Rules block lists every previewed keyword` | same page | `.keyword-rules dt` texts `=== ['Abyssal Curse','Descent','Hard','Linked','On Send Grave','Static','Summon','Triggered']` |
| `card-rules-block.spec.ts` › `each ruling matches the hover island` | same page | for each `dt`, its `dd` text equals `JSON.parse(#keyword-rulings)[term]` |
| `card-rules-block.spec.ts` › `the version route still shows reminders` | `/cards/burning-abyss-graff/versions/<pkg>/` | `.rules-text .reminder` count `> 0` |

## Impl steps

- [x] 1. In `[id].astro`, delete `reminderDefinitions` from the import list and delete
      `const ruleDefinitions = reminderDefinitions();`.
- [x] 2. Remove `definitions={ruleDefinitions}` from the `<RichText …class="rules-text">` call.
- [x] 3. Add `const rules = previewKeywordsFor(card);` beside the existing `const related = …`.
- [x] 4. Insert the `Rules` `<section>` after `<div class="card-facts">` and before the
      `Release history` section, exactly as in Requirements.
- [x] 5. In `global.css`, add next to the existing `.rules-text` rules:
      ```css
      .keyword-rules {
        display: grid;
        gap: var(--space-2);
        margin: 0;
      }
      .keyword-rules dt {
        font-weight: 700;
      }
      .keyword-rules dd {
        margin-inline-start: 0;
        color: var(--silver-ink);
      }
      ```
- [x] 6. Rewrite `tests/unit/keyword-rulings.test.ts` lines 92-113: split `CARD_ROUTES` into
      `VERSION_ROUTE` (keeps reminders) and `CARD_ROUTE` (must not), per the test plan, and
      write a comment pointing at ADR 0031 for why the two routes now differ.
- [x] 7. Create `website/tests/e2e/card-rules-block.spec.ts`. Resolve the version route by
      reading the first link in the page's `Release history` list.
- [x] 8. Add `docs/ADR/proposed/0031-card-page-prints-mse-text.md` (content specified in the
      plan index) and link it from `docs/ADR/README.md` under `## Proposed`. (already present in
      workspace prior to this ticket's start; verified content matches this ticket's Requirements
      and README already links it under `## Proposed`.)

## Outputs

- `website/src/pages/cards/[id].astro`, `website/src/styles/global.css`,
  `website/tests/unit/keyword-rulings.test.ts`, `website/tests/e2e/card-rules-block.spec.ts`,
  `docs/ADR/proposed/0031-card-page-prints-mse-text.md`, `docs/ADR/README.md`.
- Behaviour change: card page rule text loses inline rulings, gains a Rules block.

## Validation

- [x] `cd website && npx vitest run tests/unit/keyword-rulings.test.ts` → pass
- [x] `cd website && npx vitest run` → 0 failures
- [x] `cd website && npx playwright test tests/e2e/card-rules-block.spec.ts` → pass × 2 browsers
      (chromium, webkit; firefox cannot launch in this environment — pre-existing,
      unrelated, per repo notes)
- [x] `cd website && npx playwright test tests/e2e/ruling-keywords.spec.ts` → still pass (hover box untouched)
- [x] manual check: `/cards/burning-abyss-graff/` — text matches the render, Rules block below
- [x] `cd website && npm run ci` → pass
- [x] commit msg draft: `feat(website): print card text verbatim and move rulings into a Rules block`

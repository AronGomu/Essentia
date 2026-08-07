# T19: Card text keyword rulings

**Plan:** `./ai_artefacts/PLAN_2026_08_07_website-feedback-pass.md`
**Depends:** T18
**Commit outcome:** on a card page, every bold keyword inside the rules text is immediately followed by its ruling in parentheses, styled as reminder text, without changing the card text anywhere else on the site.

## Context (self-contained)

- Goal: ship the UX feedback backlog in `.dev/feedback.md`. Feedback **Cards #2**: "For card effect: after keyword, add (rule text of keyword from rules)".
- This slice: the MSE-markup renderer gains an opt-in reminder pass, used only by the card detail page and the card version page.
- Out of scope here: the hover preview (T20), the related-cards list (T21), the full-size viewer (T17). Galleries, search results, and the home page keep bare card text.
- Assumptions in force: the ruling is rendered inline as parenthesised reminder text, matching how Magic prints reminder text. Keyword resolution reuses the build-time normalisation so `Detach 2` resolves to `Detach N` and `Negate & Destroy` resolves to two keywords.

## Requirements

- Shared normalisation moves to `website/shared/keywords.mjs` so both the build scripts and the site runtime use one implementation.
- `renderMseMarkup(value, options?)` gains an optional second argument; with `options.definitions` supplied it appends `<span class="reminder">(…)</span>` after each `<strong>` whose content resolves to a keyword.
- A bold phrase that resolves to two keywords (`Negate & Destroy`) renders both rulings in one parenthesis, separated by ` `.
- A bold phrase that resolves to nothing is left untouched — no throw, no marker.
- Duplicate keywords in the same text each get their reminder (no de-duplication).
- Only the card detail page and the card version page pass `definitions`.

## Inputs

- `website/src/lib/mse-markup.ts` — `renderMseMarkup(value: string): string`. It validates tags against `ALLOWED_MSE_TAGS` from `../../shared/mse-tags.mjs`, escapes, converts `&lt;b&gt;` → `<strong>` and `&lt;/b&gt;` → `</strong>`, `<i…>` → `<em>`, `sym-auto` → `<span class="mana-symbol">`, and strips `STRIPPED_MSE_TAGS`. The bold conversion is a plain `String.replace` — the reminder pass must run **after** it, over the produced HTML, matching `/<strong>([\s\S]*?)<\/strong>/g`.
- `website/shared/mse-tags.mjs` — the existing shared-module pattern (plain `.mjs`, imported from both `src/` TypeScript and `scripts/` build code). Mirror it for keywords.
- `website/scripts/content/keywords.mjs` — currently owns `normalizeQuotes`, `normalizeKeyword(phrase)`, `splitComposite(phrase)`. Move all three to `website/shared/keywords.mjs` and re-export them from `keywords.mjs` so no build-script import breaks.
- `website/src/components/RichText.astro` — `interface Props { value: string; class?: string }`, calls `renderMseMarkup(value)` and emits `<div class={className} set:html={html} />`. Add an optional `definitions` prop.
- `website/src/pages/cards/[id].astro` — line 81 `<RichText value={card.ruleText} class="rules-text" />`. This is the only call that gets definitions. The flavour-text call on line 84 must not.
- `website/src/pages/cards/[id]/versions/[package].astro` — the equivalent rules-text call; give it the same treatment.
- `website/tests/unit/mse-markup.test.ts` — existing suite; extend it.
- `website/src/styles/global.css` — `.rules-text` and `.mana-symbol` live here; add `.reminder`.
- **From Depends (T18):** `catalog.keywords` entries are `{ id, term, category, archetype, definition, origin, doc }` with `definition` a plain-text 20–400 character string; `website/src/lib/catalog.ts` exports `keywordsByTerm: Map<string, CatalogKeyword>` (all 73) and `essentiaKeywordsByTerm` (the 51 with `origin === 'essentia'`). The registry is `schemaVersion: 2`.

## TDD

1. **Red** — add the cases below to `website/tests/unit/mse-markup.test.ts` and create `website/tests/unit/shared-keywords.test.ts`. Both fail.
2. **Green** — extract the shared module, add the reminder pass, thread the prop.
3. **Refactor** — none.

Exact signatures:

```js
// website/shared/keywords.mjs
export function normalizeQuotes(value)
export function normalizeKeyword(phrase)
export function splitComposite(phrase)
```

```ts
// website/src/lib/mse-markup.ts
export interface MseMarkupOptions { definitions?: Map<string, string> }   // key: normalized term
export function renderMseMarkup(value: string, options?: MseMarkupOptions): string
```

Reminder pass rules:

- For each `<strong>INNER</strong>`, strip tags from `INNER`, collapse whitespace, `splitComposite`, `normalizeKeyword` each part, look each up in `options.definitions`.
- Zero hits → leave the `<strong>` untouched.
- One or more hits → append `<span class="reminder">(<definitions joined by a single space>)</span>` directly after the closing `</strong>`.
- Definitions are inserted with the same `escapeHtml` treatment as the rest of the text.

Call site in `cards/[id].astro`:

```astro
const ruleDefinitions = new Map(catalog.keywords.map((keyword) => [keyword.term, keyword.definition]));
…
<RichText value={card.ruleText} class="rules-text" definitions={ruleDefinitions} />
```

## Test plan

| Test | Input | Expect |
| ---- | ----- | ------ |
| `renders text unchanged without definitions` | `renderMseMarkup('<b>Draw</b> 1')` | `<strong>Draw</strong> 1`, no `reminder` span |
| `appends a ruling after a keyword` | `renderMseMarkup('<b>Bounce</b> it', { definitions: new Map([['Bounce', "Return the indicated permanent to its owner's Hand."]]) })` | contains `<strong>Bounce</strong><span class="reminder">(Return the indicated permanent to its owner&#39;s Hand.)</span>` |
| `normalises a numeric parameter` | `<b>Detach 2</b>` with a `Detach N` definition | the `Detach N` ruling is appended |
| `splits a composite keyword` | `<b>Negate & Destroy</b>` with `Negate` and `Destroy` definitions | one `reminder` span containing both rulings separated by a space |
| `leaves an unknown bold phrase alone` | `<b>Some Title</b>` with an empty map | no `reminder` span, no throw |
| `repeats the ruling for a repeated keyword` | text with two `<b>Draw</b>` | two `reminder` spans |
| `still rejects an unknown MSE tag` | `renderMseMarkup('<blink>x</blink>')` | throws `Unknown MSE tag: blink` |
| `shared normalizeKeyword folds X` | `normalizeKeyword('Detach X')` | `Detach N` |
| `shared splitComposite splits on and` | `splitComposite('Detach 1 and Mill 3')` | `['Detach 1', 'Mill 3']` |
| `build and runtime agree` | for every `catalog.keywords` term, `normalizeKeyword(term) === term` | `true` |

Run: `cd website && npx vitest run tests/unit/mse-markup.test.ts tests/unit/shared-keywords.test.ts`

## Impl steps

- [x] 1. Add the cases above to `website/tests/unit/mse-markup.test.ts` and create `website/tests/unit/shared-keywords.test.ts`.
- [x] 2. Create `website/shared/keywords.mjs` holding `normalizeQuotes`, `normalizeKeyword`, `splitComposite` moved verbatim from `website/scripts/content/keywords.mjs`.
- [x] 3. In `website/scripts/content/keywords.mjs`, import the three functions from `../../shared/keywords.mjs` and re-export them so `extractKeywords` and the existing tests keep working unchanged.
- [x] 4. Add `MseMarkupOptions` and the reminder pass to `website/src/lib/mse-markup.ts`, running it as the final step of `renderMseMarkup`.
- [x] 5. Add `definitions?: Map<string, string>` to `RichText.astro`'s `Props` and forward it: `renderMseMarkup(value, definitions ? { definitions } : undefined)`.
- [x] 6. Build `ruleDefinitions` in `website/src/pages/cards/[id].astro` and pass it to the rules-text `RichText` only.
- [x] 7. Apply the same change to `website/src/pages/cards/[id]/versions/[package].astro`.
- [x] 8. Add to `website/src/styles/global.css`: `.reminder { display: inline; font-style: italic; font-size: 0.88em; color: var(--silver-ink); margin-left: 0.25rem; }` and `@media (forced-colors: active) { .reminder { color: GrayText; } }`.
- [x] 9. Run `npm run build`, `npm run format`, `npm run lint`, `npm run check`.

## Outputs

- Files touched: `website/shared/keywords.mjs` (new), `website/scripts/content/keywords.mjs`, `website/src/lib/mse-markup.ts`, `website/src/components/RichText.astro`, `website/src/pages/cards/[id].astro`, `website/src/pages/cards/[id]/versions/[package].astro`, `website/src/styles/global.css`, `website/tests/unit/mse-markup.test.ts`, `website/tests/unit/shared-keywords.test.ts` (new).
- Public API: `renderMseMarkup(value, options?)`, `MseMarkupOptions`, `RichText`'s `definitions` prop, `website/shared/keywords.mjs`.
- No migration.

## Validation

- [x] `cd website && npx vitest run tests/unit/mse-markup.test.ts tests/unit/shared-keywords.test.ts tests/unit/keywords.test.ts` — all pass (34 tests passed)
- [x] `cd website && npm run build` — exit 0; `dist/cards/*/index.html` HTML stays under the 500 KiB per-page budget (`npm run budgets:check`) — 151 pages built, `budgets: 9 JS, 151 HTML, 205 images, 50 print masters (16 MiB) within limits`
- [x] manual check: `node scripts/serve-dist.mjs`, open `/cards/nekroz-trishula/` — each bold keyword in the rules text is followed by an italic parenthesised ruling; the flavour text has none. **Substitution (no browser/e2e harness on this host):** inspected built `dist/**/index.html` statically instead. `dist/cards/nekroz-trishula/index.html` has no bold keywords in its rules text (empty in this card's case), so verified instead on `dist/cards/ash-blossom-and-joyous-spring/index.html`, which shows `<strong>Discard</strong><span class="reminder">(Put the indicated card from your Hand into the Grave.)</span>` etc.; that card has no flavour text so absence-of-leak was confirmed structurally (flavour-text call site unchanged, code review of `cards/[id].astro` line 84) and by `grep -c reminder` on flavor-text divs across the dist tree returning 0.
- [x] manual check: open a gallery and the home page — card names and captions are unchanged, no reminder text leaks there. **Substitution:** `grep -c reminder dist/index.html dist/sections/non-archetype/non-archetype/index.html` → 0 matches in both.
- [x] `cd website && npm run ci` — exit 0 (confirmed via `echo $?` → 0)
- [x] app functional — every card page renders; no `Unknown MSE tag` regression — build log shows `151 page(s) built` and `chrome: 151 pages carry the site header`, no thrown errors
- [ ] commit msg draft: `feat(website): print keyword rulings inline in card rules text`

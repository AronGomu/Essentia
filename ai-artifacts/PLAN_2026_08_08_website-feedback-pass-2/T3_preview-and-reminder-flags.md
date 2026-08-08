# T3: Preview and reminder flags

**Plan:** `./ai-artifacts/PLAN_2026_08_08_website-feedback-pass-2.md`
**Depends:** T2
**Commit outcome:** Each keyword file declares `preview` and `reminder`; `Mill N` now appears in every gallery hover ruling box and `Counter` no longer prints its explanation inside card rule text.

## Context (self-contained)

- Goal: website feedback pass 2. This ticket delivers feedback items
  **"/sections/non-archetype/ 2"** ("Ash Blossom & Joyous Spring miss `Mill N` card
  preview hover ruling. Apply to all pages where an Ash Blossom `gallery-card`
  appears and all other `gallery-card` that have Mill X.") and **"Cards Page 1"**
  ("`Counter(Cancel a spell or ability on the Stack; …)` — Counter is a native MTG
  keyword and does not need explanation text. Remove and update tests accordingly.").
- This slice: replaces two derived rules with two explicit per-keyword booleans, so
  which keywords surface where becomes editable data instead of code.
- Out of scope here: changing any ruling wording, changing MSE card text (T4),
  section intros, hero art, nav, docs/blog rails.
- Assumptions in force: `graphify` is not installed — do not run it. Only two flag
  values differ from today's behaviour: `mill-n.preview = true` and
  `counter.reminder = false`. `Draw` keeps `reminder: true`.

## Requirements

- Every `docs/keywords/{id}.md` front matter gains two required booleans,
  `preview: true|false` and `reminder: true|false`.
- Migration values: `preview` = `true` for the 51 entries whose `origin` is
  `essentia`, `false` for the 22 whose `origin` is `magic` — **then** set
  `docs/keywords/mill-n.md` to `preview: true`. `reminder` = `true` everywhere —
  **then** set `docs/keywords/counter.md` to `reminder: false`.
- Build-time invariant: `preview && !reminder` fails the build. Reason: the
  published-HTML gate `reminderIssues()` in `website/scripts/check-chrome.mjs`
  requires that any bold phrase resolving against the page's `#keyword-rulings`
  map (the *preview* map) is followed by a `<span class="reminder">`.
- The hover ruling box is driven by `preview`, not by `origin === 'essentia'`.
- Card rule-text reminders are driven by `reminder`, not by "every keyword".
- `catalog.keywords[]` entries carry `preview` and `reminder`;
  `CATALOG_SCHEMA_VERSION` goes `7 → 8`.

## Inputs

- `docs/keywords/{id}.md` — 73 files created by T2, front matter keys
  `term`, `category`, `origin`, `doc`, and `archetype` on the 4 archetype entries;
  body = the ruling.
- `website/scripts/content/keyword-file.mjs` — `parseKeywordFile(text, id)` with
  `ALLOWED_KEYS = new Set(['term','category','origin','doc','archetype'])`.
- `website/scripts/content/keywords.mjs` — `loadKeywordRegistry(directory = KEYWORDS_DIR)`
  returning `Map<term, { id, term, category, archetype?, origin, doc, definition }>`.
- `website/scripts/content/orchestrator.mjs` — `CATALOG_SCHEMA_VERSION = 7`;
  lines 197–205 map registry entries into `catalog.keywords`.
- `website/src/layouts/BaseLayout.astro` lines 74–78:
  ```ts
  const keywordRulings = Object.fromEntries(
    catalog.keywords
      .filter((keyword) => keyword.origin === 'essentia')
      .map((keyword) => [keyword.term, keyword.definition]),
  );
  ```
- `website/src/lib/catalog.ts` — `keywordsByTerm`, `essentiaKeywordsByTerm`
  (filtered on `origin === 'essentia'`), and
  `essentiaKeywordsFor(card): Array<{term, definition}>`.
- `website/src/components/CardGallery.astro` line 27 and
  `website/src/pages/cards/[id].astro` line 152 both call `essentiaKeywordsFor(...)`
  to fill `data-card-keywords`.
- `website/src/pages/cards/[id].astro` lines 36–38:
  ```ts
  const ruleDefinitions = new Map(
    catalog.keywords.map((keyword) => [keyword.term, keyword.definition]),
  );
  ```
- `website/src/lib/mse-markup.ts` — `appendReminders()` appends
  `<span class="reminder">(…)</span>` for any bold phrase found in `definitions`.
- `website/src/components/CardHoverPreview.astro` reads the JSON in
  `#keyword-rulings` and renders one `<p class="keyword-ruling">` per term listed in
  `data-card-keywords`.
- **From Depends (T2):** rulings load from `docs/keywords/{id}.md`;
  `website/content/keywords.json` no longer exists; registry size is 73.

## TDD

1. **Red** — add the tests below (`preview`/`reminder` on the catalog, `Mill N` in
   the hover set, `Counter` absent from the reminder map, the `preview && !reminder`
   guard); they fail.
2. **Green** — add the flags to the 73 files, the loader, the catalog, the layout
   and the card page.
3. **Refactor** — rename `essentiaKeywordsFor` → `previewKeywordsFor` and
   `essentiaKeywordsByTerm` → `previewKeywordsByTerm` across all call sites; keep green.

## Test plan

Run with `cd website && npm run test`.

| Test | Input | Expect |
| ---- | ----- | ------ |
| `keywords.test.ts` › `requires preview` | fixture without `preview:` | rejects `/missing required key preview/` |
| `keywords.test.ts` › `requires reminder` | fixture without `reminder:` | rejects `/missing required key reminder/` |
| `keywords.test.ts` › `rejects a non-boolean flag` | fixture `preview: yes` | rejects `/preview must be true or false/` |
| `keywords.test.ts` › `rejects preview without reminder` | fixture `preview: true`, `reminder: false` | rejects `/preview requires reminder/` |
| `keywords.test.ts` › `counts the preview keywords` | `catalog.keywords.filter(k => k.preview)` | length `52` |
| `keywords.test.ts` › `counts the reminder keywords` | `catalog.keywords.filter(k => k.reminder)` | length `72` |
| `hover-keywords.test.ts` › `shows Mill N in the hover box` | `previewKeywordsFor({ keywords: ['Mill N'] })` | one entry, `term === 'Mill N'` |
| `hover-keywords.test.ts` › `drops Magic evergreens` | `previewKeywordsFor({ keywords: ['Flying','Trample'] })` | `[]` |
| `hover-keywords.test.ts` › `keeps Counter out of the hover box` | `previewKeywordsFor({ keywords: ['Counter'] })` | `[]` |
| `keyword-rulings.test.ts` › `Counter prints no card-text reminder` | `reminderDefinitions()` (new export from `src/lib/catalog.ts`) | `.has('Counter') === false` |
| `keyword-rulings.test.ts` › `Mill N still prints a card-text reminder` | `reminderDefinitions()` | `.has('Mill N') === true` |
| `mse-markup.test.ts` › `appends no reminder for an excluded keyword` | `renderMseMarkup('<b>Counter</b> it.', { definitions: reminderDefinitions() })` | result contains no `class="reminder"` |
| `chrome.test.ts` › existing reminder rules | unchanged fixtures | still green |

## Impl steps

- [ ] 1. In `website/scripts/content/keyword-file.mjs`, extend `ALLOWED_KEYS` to
      `new Set(['term','category','origin','doc','archetype','preview','reminder'])`.
- [ ] 2. In `website/scripts/content/keywords.mjs`, add a helper
      ```js
      function booleanField(id, key, raw) {
        if (raw === 'true') return true;
        if (raw === 'false') return false;
        fail(`keyword ${id}: ${key} must be true or false`);
      }
      ```
- [ ] 3. Add `'preview'` and `'reminder'` to the required-key list (message stays
      `keyword ${id}: missing required key ${key}`), parse both with `booleanField`.
- [ ] 4. After parsing, add the invariant:
      ```js
      if (preview && !reminder)
        fail(`keyword ${id}: preview requires reminder — the published-HTML gate demands a reminder for any previewed term`);
      ```
- [ ] 5. Include `preview` and `reminder` in the returned entry object.
- [ ] 6. Write the one-shot flag migration `website/scripts/migrate-keyword-flags.mjs`:
      for every `docs/keywords/*.md` matching `/^[a-z0-9]+(?:-[a-z0-9]+)*\.md$/`,
      insert `preview: <origin === 'essentia'>` and `reminder: true` as the last two
      front-matter lines (after `doc:`). Run it, then `rm` it.
- [ ] 7. By hand: set `preview: true` in `docs/keywords/mill-n.md`.
- [ ] 8. By hand: set `reminder: false` in `docs/keywords/counter.md`.
- [ ] 9. In `website/scripts/content/orchestrator.mjs` bump
      `export const CATALOG_SCHEMA_VERSION = 8;` and add
      `preview: entry.preview, reminder: entry.reminder,` to the `keywords` map at
      lines 197–205.
- [ ] 10. In `website/src/lib/catalog.ts`, add to `CatalogKeyword`:
      `/** Show this ruling in the gallery hover box. */ preview: boolean;` and
      `/** Append this ruling as (reminder) text after the bold phrase in card rule text. */ reminder: boolean;`
- [ ] 11. In `website/src/lib/catalog.ts`, rename `essentiaKeywordsByTerm` →
      `previewKeywordsByTerm` and change its filter to `(keyword) => keyword.preview`.
- [ ] 12. Rename `essentiaKeywordsFor` → `previewKeywordsFor`, keeping the signature
      `({ keywords: string[] }) => Array<{ term: string; definition: string }>` and
      the printed-order behaviour; update its doc comment to
      `/** The card's keywords that the hover box previews, in printed order, each with its ruling. */`.
- [ ] 13. Add to `website/src/lib/catalog.ts`:
      ```ts
      /** Terms whose ruling is printed as (reminder) text inside card rule text. */
      export function reminderDefinitions(): Map<string, string> {
        return new Map(
          catalog.keywords
            .filter((keyword) => keyword.reminder)
            .map((keyword) => [keyword.term, keyword.definition]),
        );
      }
      ```
- [ ] 14. Update the two call sites of the old name:
      `website/src/components/CardGallery.astro` line 27 and
      `website/src/pages/cards/[id].astro` line 152 → `previewKeywordsFor`.
- [ ] 15. In `website/src/pages/cards/[id].astro`, replace lines 36–38 with
      `const ruleDefinitions = reminderDefinitions();` and import it from
      `../../lib/catalog`.
- [ ] 16. In `website/src/layouts/BaseLayout.astro` lines 74–78, change the filter to
      `.filter((keyword) => keyword.preview)`.
- [ ] 17. Update `website/tests/unit/hover-keywords.test.ts` and
      `website/tests/unit/keyword-rulings.test.ts` to the new names and add the rows
      from the test plan. In `keyword-rulings.test.ts`, the existing
      `serialises the updated Bounce ruling` test must call `previewKeywordsFor`.
- [ ] 18. Update `website/tests/unit/keywords.test.ts` fixture helper to emit
      `preview:` and `reminder:` lines, and add the new rejection tests.
- [ ] 19. Add the `mse-markup.test.ts` row using an explicit inline map, e.g.
      `new Map([['Mill N','…']])`, so the test does not depend on the catalog.
- [ ] 20. `cd website && npm run content && npm run build` — expect exit 0 (the
      `check-chrome.mjs` gate runs inside `build` and must stay silent).
- [ ] 21. Manual: open `dist/cards/ash-blossom-and-joyous-spring/index.html` and
      confirm `Counter` has **no** following `<span class="reminder">` while
      `Mill X` still has one.

## Outputs

- Files touched: `docs/keywords/*.md` (all 73), `website/scripts/content/keyword-file.mjs`,
  `website/scripts/content/keywords.mjs`, `website/scripts/content/orchestrator.mjs`,
  `website/src/lib/catalog.ts`, `website/src/layouts/BaseLayout.astro`,
  `website/src/components/CardGallery.astro`, `website/src/pages/cards/[id].astro`,
  `website/tests/unit/{keywords,hover-keywords,keyword-rulings,mse-markup}.test.ts`.
- Public API / behaviour change: `essentiaKeywordsFor` → `previewKeywordsFor`;
  new `reminderDefinitions()`; catalog schema 8.
- Migrate / config: two new required front-matter keys in every keyword file.

## Validation

- [ ] tests pass: `cd website && npm run test` and `cd website && npm run ci`
- [ ] manual check: `/sections/non-archetype/non-archetype/` — hovering the Ash
      Blossom `gallery-card` shows a **Mill N** ruling paragraph
- [ ] manual check: `/cards/ash-blossom-and-joyous-spring/` — no
      `Counter(Cancel a spell or ability …)` reminder in the rules text
- [ ] app functional — `cd website && npm run build` exits 0
- [ ] commit msg draft: `feat(website): drive hover and reminder rulings from per-keyword flags`

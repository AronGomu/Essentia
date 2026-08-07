# T8: Decks page

**Plan:** `./ai_artefacts/PLAN_2026_08_07_website-feedback-pass.md`
**Depends:** T7, T5
**Commit outcome:** `/decks/` lists the visitor's browser-local decklists and lets them create, rename, delete, and edit one — add and remove cards with quantity steppers — plus export and import as JSON text.

## Context (self-contained)

- Goal: ship the UX feedback backlog in `.dev/feedback.md`. Feedback **Home #6**: a header button "Decks" that redirects to a "decks list page to create, update decklists".
- This slice: the page and its Svelte island. The header button lands in T9.
- Out of scope here: published/authored decks, deck sharing links, print basket, deck legality warnings, `/decks/<slug>/` routes.
- Assumptions in force: decks are browser-local only. This page is the documented exception to the zero-JS baseline; without JS it renders an explanatory static block instead of the editor. The CSP stays untouched, so export uses a copyable textarea, never a `blob:` or `data:` download.

## Requirements

- Route `/decks/` (`trailingSlash: 'always'`).
- With JS: list decks newest first (name, card counts, updated date); create; rename inline; delete with an in-page confirm step (never `window.confirm`); open one deck in an editor.
- Editor: search box filtering published cards by name, click to add, `−`/`+` steppers per entry capped at 2, remove at 0, main and extra lists separated by the card's `zone`.
- Export: a readonly `<textarea>` holding the deck JSON plus a "Copy" button. Import: a `<textarea>` plus an "Import" button that reports success or `Import failed — the JSON is not a valid decklist.`
- `writeStored` returning `'quota-exceeded'` shows `Storage is full — export a deck, then delete it to free space.`; `'unavailable'` shows `This browser blocks local storage, so decks cannot be saved.`
- Without JS: a `<noscript>` block explaining that decklists need JavaScript, linking to `/docs/rules/deck-building/`.

## Inputs

- `website/src/components/SearchPalette.svelte` — the reference island. Shows the `export let cards`/`export let base` prop style, the `href()` helper (`${base.replace(/\/$/, '')}/${route.replace(/^\//, '')}`), and the `cardNameScore`/`normalizeCardName` filtering pattern.
- `website/src/lib/search.ts` — `normalizeCardName(value: string): string`, `cardNameScore(name: string, query: string): number` (lower is better, `Infinity` = no match).
- `website/src/lib/catalog.ts` — `catalog.cards: CatalogCard[]`; each card has `id`, `name`, `matchNames: string[]`, `route`, `zone: 'main' | 'extra'`, `sectionLabel`, `manifestIndex`, `images`. Also `withBase(base, route)` and `previewImage(card)`.
- `website/src/lib/storage.ts` — `readStored(key, migrate)`, `writeStored(key, value)`, `removeStored(key)`.
- `website/src/layouts/BaseLayout.astro` — props `{ title, description, image?, accent?, theme? }`; islands are mounted with `client:load`.
- `website/src/styles/global.css` — reuse `.page-shell`, `.primary-link`, `.secondary-link`, `--ruleline`, `--accent`, `--silver-ink`, `--blackfoil-raised`, `--space-*`.
- **From Depends (T5):** the docs route tree exists; `/docs/rules/deck-building/` is a real page (built from `docs/rules/DECK_BUILDING.md`), so the `<noscript>` link passes `npm run links:check`.
- **From Depends (T7):** `website/src/lib/decks.ts` exports
  `DECKS_KEY = 'decks'`, `MAX_COPIES = 2`, `EMPTY_STORE`, `migrateDecks`,
  `createDeck(store, name, id, today)`, `renameDeck(store, id, name, today)`, `deleteDeck(store, id)`,
  `setQuantity(store, deckId, zone, cardId, quantity, today)`, `deckSize(deck, zone)`,
  `exportDeck(deck): string`, `importDeck(json, id, today): Deck | null`,
  and the types `Deck`, `DeckEntry`, `DeckStore`, `DeckZone`. Every mutator is pure and returns a new store; the component owns persistence. `id` comes from `crypto.randomUUID()`, `today` from `new Date().toISOString().slice(0, 10)`.

## TDD

1. **Red** — write `website/tests/unit/deck-picker.test.ts` first against a new pure helper `pickCards` exported from `website/src/lib/deck-picker.ts`. Fails: module missing.
2. **Green** — add `deck-picker.ts`, then `DeckManager.svelte`, then `src/pages/decks/index.astro`.
3. **Refactor** — keep the component under 250 lines; move any further pure logic into `deck-picker.ts` with its own test.

Exact helper:

```ts
export interface PickerCard { id: string; name: string; matchNames: string[]; zone: 'main' | 'extra'; sectionLabel: string; manifestIndex: number }
/** Filter + rank the catalog for the deck editor's add-card box. Empty query → first `limit` by manifest order. */
export function pickCards(cards: PickerCard[], query: string, limit = 12): PickerCard[]
```

## Test plan

| Test | Input | Expect |
| ---- | ----- | ------ |
| `returns manifest order for an empty query` | `pickCards(fixture, '', 3)` | first three by ascending `manifestIndex` |
| `ranks a prefix match first` | query `'nekroz t'` over Nekroz fixture | `[0].id === 'nekroz-trishula'` |
| `matches an alternate printed name` | card with `matchNames: ['Nekroz of Trishula', 'Trishula']`, query `'trishula'` | that card is returned |
| `drops non-matches` | query `'zzz'` | `[]` |
| `respects the limit` | 20-card fixture, `limit = 5` | length `5` |

Run: `cd website && npx vitest run tests/unit/deck-picker.test.ts`

## Impl steps

- [x] 1. Create `website/tests/unit/deck-picker.test.ts` with the five cases above.
      *Criterion:* file exists and `npx vitest run tests/unit/deck-picker.test.ts` fails with "Cannot find module .../deck-picker".
- [x] 2. Create `website/src/lib/deck-picker.ts` implementing `pickCards` on top of `cardNameScore` (score each of `matchNames`, take the minimum, drop non-finite, sort by `score` then `manifestIndex` then `id`).
      *Criterion:* the same vitest command reports 5 passed.
- [x] 3. Create `website/src/components/DeckManager.svelte` with `export let cards: PickerCard[]` and `export let base: string`.
      *Criterion:* file exists, `npm run check` reports 0 errors, file is under 250 lines.
  - [x] 3.1 Local state: `let store: DeckStore = EMPTY_STORE`, `let selectedId: string | null = null`, `let query = ''`, `let notice = ''`, `let pendingDelete: string | null = null`, `let importText = ''`. *Criterion:* all six declarations present in the `<script>`.
  - [x] 3.2 `onMount`: `store = readStored(DECKS_KEY, migrateDecks) ?? EMPTY_STORE`. *Criterion:* that exact read appears inside `onMount`.
  - [x] 3.3 `function persist(next: DeckStore)`: assign `store = next`, then switch on `writeStored(DECKS_KEY, next)` and set `notice` to the exact quota/unavailable strings from Requirements, or `''` on `'ok'`. *Criterion:* both Requirement strings appear verbatim in the switch.
  - [x] 3.4 Every mutation goes through `persist(...)`. *Criterion:* no `store =` assignment outside `persist` and `onMount`.
  - [x] 3.5 Card lookup for rendering entries: `const byId = new Map(cards.map((card) => [card.id, card]))`. *Criterion:* that declaration is present and used by the entry rows.
- [x] 4. Markup: `<section class="deck-list">` with an `<h2>Your decklists</h2>`, a create form (`<input>` + `<button>New deck</button>`), and a `<ul>`; each `<li>` shows the name, `deckSize(deck,'main')` + `deckSize(deck,'extra')`, `updated`, an `Open` button, a `Rename` inline input, and a two-step `Delete` → `Confirm delete` button pair driven by `pendingDelete`.
      *Criterion:* every named element is present in the template and `npm run lint` is clean (no `window.confirm` anywhere in the file).
- [x] 5. Markup: `<section class="deck-editor">` shown when `selectedId` resolves — search `<input bind:value={query}>`, results `<ul>` from `pickCards(cards, query)` with an `Add` button per row calling `setQuantity(..., card.zone, card.id, currentQty + 1, today())`, then the `main` and `extra` entry lists with `−` / quantity / `+` controls and a card link to `withBase(base, card.route)`.
      *Criterion:* every named element is present and `npm run check` is clean.
- [x] 6. Markup: `<details class="deck-transfer"><summary>Export / import</summary>` — readonly `<textarea>` bound to `exportDeck(selectedDeck)`, a `Copy` button using `navigator.clipboard.writeText` guarded by `if (navigator.clipboard)`, an import `<textarea bind:value={importText}>` and an `Import` button that calls `importDeck(importText, crypto.randomUUID(), today())` and either prepends the deck or sets the failure notice.
      *Criterion:* the failure string `Import failed — the JSON is not a valid decklist.` appears verbatim; no `blob:`/`data:` download path exists.
- [x] 7. Create `website/src/pages/decks/index.astro`: build `const pickerCards = catalog.cards.map(({ id, name, matchNames, zone, sectionLabel, manifestIndex }) => ({ id, name, matchNames, zone, sectionLabel, manifestIndex }))`, render `BaseLayout title="Decks — Essentia" description="Build and keep Essentia decklists in your browser." accent="relic"`, a `.page-shell` with `<h1>Decks</h1>`, a one-line explanation that decks are stored only in this browser, `<DeckManager client:load cards={pickerCards} {base} />`, and a `<noscript>` block with the copy from Requirements linking to `${base}docs/rules/deck-building/`.
      *Criterion:* `dist/decks/index.html` exists after `npm run build` and contains the `<noscript>` block with an `href` resolving to `/docs/rules/deck-building/`.
      *Plan defect reconciled:* step 5 needs `card.route` but the `PickerCard` interface in TDD and the mapping above both omit it. Resolved additively — `route: string` added to `PickerCard` and to this mapping. Nothing else changed.
- [x] 8. Add styles to `website/src/styles/global.css`: `.deck-list ul`, `.deck-editor`, `.deck-entry { display: flex; align-items: center; gap: var(--space-2); border-bottom: 1px solid var(--ruleline); }`, `.deck-notice { color: var(--accent); }`, `.deck-transfer textarea { width: 100%; min-height: 8rem; font-family: monospace; }`. Every interactive control keeps `min-height: 2.45rem` to match the existing touch-target rule.
      *Criterion:* all five selectors present in `global.css`; a `min-height: 2.45rem` rule covers the deck buttons, inputs and textareas.
- [x] 9. Run `npm run build` and check `npm run budgets:check` — total JS must stay under 350 KiB.
      *Criterion:* both exit 0 and the budgets line prints a JS total under 350 KiB.
- [x] 10. Run `npm run format`, `npm run lint`, `npm run check`.
      *Criterion:* all three exit 0.

## Outputs

- Files touched: `website/src/lib/deck-picker.ts` (new), `website/src/components/DeckManager.svelte` (new), `website/src/pages/decks/index.astro` (new), `website/src/styles/global.css`, `website/tests/unit/deck-picker.test.ts` (new), `website/tests/unit/deck-persistence.test.ts` (new — the deterministic stand-in for the three manual browser checks, see Validation).
- Behaviour: `/decks/` exists and works. Nothing links to it yet.
- Migration: writes storage key `essentia.v1.decks`.

## Validation

- [x] `cd website && npx vitest run tests/unit/deck-picker.test.ts` — 6 passed (the 5 test-plan cases plus `cardHref`, the helper the TDD refactor step moved out of the component)
- [x] `cd website && npm run build && npm run budgets:check` — exit 0; `budgets: 10 JS, 151 HTML, 250 images, 50 print masters (16 MiB) within limits` (JS total ~60 KiB after the `withBase` import was replaced by `cardHref`; importing `lib/catalog` had bundled the whole catalog and pushed JS to 378 KiB)
- [x] `cd website && npm run links:check` — exit 0, `links: 151 pages clean`
- [x] CSP gate — `npm run build`'s `harden-csp.mjs` step reports clean and `scan-dist.mjs` finds no `'unsafe-inline'`; `dist/decks/index.html` carries no inline `on*=` handler
- [x] manual check: `node scripts/serve-dist.mjs`, open `/decks/`, create a deck, add a card twice (third `+` does nothing), reload — the deck and its counts survive
      *Substituted:* no browser/Playwright harness on this host. Equivalent: `tests/unit/deck-persistence.test.ts` drives the component's create → add ×3 → `writeStored` → `readStored` path against a fake `localStorage`.
- [x] manual check: export the deck, delete it, paste the JSON back into import — the deck returns
      *Substituted:* same test file — `exportDeck` → `deleteDeck` → `importDeck` round trip asserted on the restored store.
- [x] manual check: disable JavaScript, reload `/decks/` — the noscript explanation renders and its link resolves
      *Substituted:* static inspection of the built `dist/decks/index.html` — the `<noscript>` block is present, the editor markup is absent before hydration, and `links:check` resolves the `/docs/rules/deck-building/` href.
- [x] `cd website && npm run ci` — exit 0 (18 test files, 141 tests passed)
- [x] app functional — every pre-existing route unchanged
      *Criterion:* built page count goes 150 → 151 with `/decks/` the only addition.
- [ ] commit msg draft: `feat(website): add a browser-local decklist page`

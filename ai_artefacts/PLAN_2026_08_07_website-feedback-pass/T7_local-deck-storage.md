# T7: Local deck storage

**Plan:** `./ai_artefacts/PLAN_2026_08_07_website-feedback-pass.md`
**Depends:** T1
**Commit outcome:** a pure, fully unit-tested decklist library — create, rename, delete, set quantity, import, export — backed by the existing `essentia.v1.*` browser-storage helpers, with no UI yet.

## Context (self-contained)

- Goal: ship the UX feedback backlog in `.dev/feedback.md`. Feedback **Home #6** adds a header button "Decks" that "redirect to decks list page to create, update decklists". No such page exists.
- This slice: the state model and its reducer functions only. The page is T8.
- Out of scope here: any component, page, or style. Published/authored decks (`website/content/decks/*.json`) are not part of this plan.
- Assumptions in force: decklists live only in the visitor's browser, no accounts, no backend. The cube's two-copy limit applies.

## Requirements

- New module `website/src/lib/decks.ts`.
- Storage key `essentia.v1.decks`, value `{ schemaVersion: 1, decks: Deck[] }`.
- Every mutator is pure: it takes a store and returns a **new** store; it never touches `localStorage` itself.
- Quantity is clamped to `0..2` (cube rule, see `docs/ADR/accepted/0014-deck-copy-limits.md`); `0` removes the entry.
- A deck holds a `main` list and an `extra` list; a card belongs to one or the other, chosen by the caller.
- Import validates aggressively and returns `null` on anything malformed instead of throwing.

## Inputs

- `website/src/lib/storage.ts` — exports `STORAGE_PREFIX` (`'essentia.v1.'`), `Versioned`, `Migrate<T>`, `readStored<T>(key, migrate)`, `writeStored<T>(key, value): 'ok' | 'quota-exceeded' | 'unavailable'`, `removeStored(key)`, and the `ImageQuality` pair as a worked example of the `Migrate` pattern. Reuse all of it; do not re-implement storage access.
- `docs/ADR/accepted/0014-deck-copy-limits.md` — the two-copy rule this clamp encodes.
- `website/src/lib/catalog.ts` — `CatalogCard` has `id: string` and `zone: 'main' | 'extra'`. Deck entries store `cardId` only; card data is looked up from the catalog at render time.
- `website/tests/unit/` — existing vitest suites; follow their `describe`/`it` style.
- **From Depends (T1):** `npm run preflight` passes. Nothing else consumed.

## TDD

1. **Red** — write `website/tests/unit/decks.test.ts` first, covering every case below. Fails: module missing.
2. **Green** — implement `website/src/lib/decks.ts`.
3. **Refactor** — none.

Exact API:

```ts
export interface DeckEntry { cardId: string; quantity: number }
export interface Deck {
  id: string;
  name: string;
  created: string;   // 'YYYY-MM-DD'
  updated: string;   // 'YYYY-MM-DD'
  main: DeckEntry[];
  extra: DeckEntry[];
}
export interface DeckStore extends Versioned { schemaVersion: 1; decks: Deck[] }
export type DeckZone = 'main' | 'extra';

export const DECKS_KEY = 'decks';
export const MAX_COPIES = 2;
export const EMPTY_STORE: DeckStore;

export const migrateDecks: Migrate<DeckStore>;

export function createDeck(store: DeckStore, name: string, id: string, today: string): DeckStore;
export function renameDeck(store: DeckStore, id: string, name: string, today: string): DeckStore;
export function deleteDeck(store: DeckStore, id: string): DeckStore;
export function setQuantity(store: DeckStore, deckId: string, zone: DeckZone, cardId: string, quantity: number, today: string): DeckStore;
export function deckSize(deck: Deck, zone: DeckZone): number;
export function exportDeck(deck: Deck): string;          // pretty JSON, 2-space indent
export function importDeck(json: string, id: string, today: string): Deck | null;
```

Behaviour rules:

- `createDeck` trims `name`, falls back to `'Untitled deck'` when the trimmed name is empty, truncates to 60 chars, and prepends the new deck so the newest is first.
- `renameDeck` applies the same name normalisation and sets `updated = today`. An unknown `id` returns the store unchanged.
- `setQuantity` clamps to `Math.max(0, Math.min(MAX_COPIES, Math.trunc(quantity)))`, removes the entry at `0`, keeps entries sorted by `cardId`, and sets `updated = today`.
- `deckSize` sums quantities in the zone.
- `importDeck` accepts `{ name, main, extra }` (any extra keys are ignored), requires `main`/`extra` to be arrays of `{ cardId: string, quantity: number }` with `cardId` matching `/^[a-z0-9]+(?:-[a-z0-9]+)*$/`, clamps quantities, and returns `null` on any violation or on invalid JSON.
- `migrateDecks` returns `null` unless the parsed value is an object with `schemaVersion === 1` and a `decks` array whose every element passes the same shape check; each deck's entries are re-clamped on read.
- No `Math.random`, no `Date`: `id` and `today` are always passed in. Callers use `crypto.randomUUID()` and `new Date().toISOString().slice(0, 10)`.

## Test plan

| Test | Input | Expect |
| ---- | ----- | ------ |
| `creates a deck at the front` | `createDeck(EMPTY_STORE, 'BA build', 'id-1', '2026-08-07')` | `decks[0]` = `{ id: 'id-1', name: 'BA build', created: '2026-08-07', updated: '2026-08-07', main: [], extra: [] }` |
| `falls back to a default name` | `createDeck(EMPTY_STORE, '   ', 'id-1', '2026-08-07')` | `decks[0].name === 'Untitled deck'` |
| `truncates a long name` | 90-char name | `name.length === 60` |
| `renames and stamps` | `renameDeck(store, 'id-1', 'New', '2026-08-08')` | name `'New'`, `updated === '2026-08-08'`, `created` unchanged |
| `ignores an unknown rename` | `renameDeck(store, 'nope', 'x', '2026-08-08')` | store returned unchanged (deep equal) |
| `deletes a deck` | `deleteDeck(store, 'id-1')` | `decks.length` decreases by 1 |
| `clamps quantity to two` | `setQuantity(store, 'id-1', 'main', 'nekroz-trishula', 5, d)` | entry quantity `2` |
| `removes at zero` | `setQuantity(..., 0, d)` | entry absent from `main` |
| `keeps entries sorted by cardId` | add `nekroz-unicore` then `nekroz-brionac` | `main.map(e => e.cardId)` is `['nekroz-brionac', 'nekroz-unicore']` |
| `separates zones` | add to `extra` | `main` unaffected |
| `sums a zone` | two entries of 2 and 1 | `deckSize(deck, 'main') === 3` |
| `round-trips export/import` | `importDeck(exportDeck(deck), 'id-2', d)` | same `name`, `main`, `extra`; new `id` |
| `rejects malformed import` | `importDeck('{"main":[{"cardId":"BAD ID","quantity":1}]}', 'id', d)` | `null` |
| `rejects invalid JSON` | `importDeck('not json', 'id', d)` | `null` |
| `migrates a valid store` | `migrateDecks({ schemaVersion: 1, decks: [] })` | `{ schemaVersion: 1, decks: [] }` |
| `rejects a foreign schema` | `migrateDecks({ schemaVersion: 2, decks: [] })` | `null` |
| `re-clamps on read` | stored entry with `quantity: 7` | migrated entry quantity `2` |

Run: `cd website && npx vitest run tests/unit/decks.test.ts`

## Impl steps

- [x] 1. Create `website/tests/unit/decks.test.ts` with the seventeen cases above.
      _Criterion:_ file exists and `npx vitest run tests/unit/decks.test.ts` fails **red** with the module missing.
- [x] 2. Create `website/src/lib/decks.ts` with the types, constants, and `migrateDecks`.
      _Criterion:_ the three `migrate*` cases (`migrates a valid store`, `rejects a foreign schema`, `re-clamps on read`) pass.
- [x] 3. Implement `createDeck`, `renameDeck`, `deleteDeck`.
      _Criterion:_ the six create/rename/delete cases pass.
- [x] 4. Implement `setQuantity` and `deckSize`.
      _Criterion:_ the five quantity/zone/size cases pass.
- [x] 5. Implement `exportDeck` and `importDeck`.
      _Criterion:_ the three export/import cases pass.
- [x] 6. Add a private `normalizeName(value: string): string` used by create and rename.
      _Criterion:_ symbol present in `src/lib/decks.ts`, not exported, called by `createDeck` and `renameDeck`; `falls back to a default name` and `truncates a long name` pass.
- [x] 7. Run `npm run format`, `npm run lint`, `npm run check`.
      _Criterion:_ each command exits 0.

## Outputs

- Files touched: `website/src/lib/decks.ts` (new), `website/tests/unit/decks.test.ts` (new).
- Public API: the block above. Nothing imports it yet.
- Migration: introduces storage key `essentia.v1.decks` at `schemaVersion: 1`.

## Validation

- [x] `cd website && npx vitest run tests/unit/decks.test.ts` — 17 passed
- [x] `cd website && npm run test` — full suite green
- [x] `cd website && npm run check && npm run lint && npm run format:check` — exit 0
- [x] `cd website && npm run build` — exit 0, bundle size unchanged (no page imports the module yet)
- [x] app functional — no visible change
      _Criterion:_ no source file outside `tests/` imports `lib/decks`, proven by grep, and `npm run build` exits 0.
      _Substitution:_ no browser/Playwright harness on this host, so the "no visible change" claim is discharged by the grep + build pair and by the pure-function unit suite (storage I/O is exercised through `migrateDecks`, not a live `localStorage`).
- [x] `cd website && npm run ci` — exit 0 (parent-required gate)
- [ ] commit msg draft: `feat(website): add a browser-local decklist model`
      _Criterion:_ commit exists on `plan/website-feedback-pass` with that subject.

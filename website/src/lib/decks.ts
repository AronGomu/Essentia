/**
 * Browser-local decklists.
 *
 * Decks live only in the visitor's browser: there are no accounts and no
 * backend. This module is the state model, nothing else — every mutator is
 * pure, takes a store and returns a new store, and never touches
 * `localStorage`. Persistence is the caller's job, through the
 * `readStored`/`writeStored` helpers in `./storage` with `DECKS_KEY` and
 * `migrateDecks`.
 *
 * The two-copy clamp encodes ADR 0014 (deck copy limits).
 */
import type { Migrate, Versioned } from './storage';

export interface DeckEntry {
  cardId: string;
  quantity: number;
}

export interface Deck {
  id: string;
  name: string;
  /** `YYYY-MM-DD`. */
  created: string;
  /** `YYYY-MM-DD`. */
  updated: string;
  main: DeckEntry[];
  extra: DeckEntry[];
}

export interface DeckStore extends Versioned {
  schemaVersion: 1;
  decks: Deck[];
}

export type DeckZone = 'main' | 'extra';

/** Storage key suffix; `readStored`/`writeStored` add the `essentia.v1.` prefix. */
export const DECKS_KEY = 'decks';

/** At most two copies of a distinct card per deck — ADR 0014. */
export const MAX_COPIES = 2;

const MAX_NAME_LENGTH = 60;
const DEFAULT_NAME = 'Untitled deck';

/** Catalog card ids are lowercase, hyphen-separated slugs. */
const CARD_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const EMPTY_STORE: DeckStore = { schemaVersion: 1, decks: [] };

/** `#deck-<id>` → `<id>`; anything else → null. Shared by DeckManager and Find. */
export function deckIdFromHash(hash: string): string | null {
  return /^#deck-(.+)$/.exec(hash)?.[1] ?? null;
}

function normalizeName(value: string): string {
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, MAX_NAME_LENGTH) : DEFAULT_NAME;
}

function clampQuantity(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(MAX_COPIES, Math.trunc(value)));
}

function byCardId(a: DeckEntry, b: DeckEntry): number {
  if (a.cardId === b.cardId) return 0;
  return a.cardId < b.cardId ? -1 : 1;
}

/**
 * Validates an untrusted entry list. Returns `null` on any violation, so a
 * malformed import or a hand-edited storage value is rejected whole rather
 * than partially applied. Quantities are re-clamped and zero-quantity entries
 * drop out, which keeps the "an entry means at least one copy" invariant.
 */
function parseEntries(value: unknown): DeckEntry[] | null {
  if (!Array.isArray(value)) return null;
  const entries: DeckEntry[] = [];
  const seen = new Set<string>();
  for (const raw of value) {
    if (typeof raw !== 'object' || raw === null) return null;
    const record = raw as Record<string, unknown>;
    const { cardId, quantity } = record;
    if (typeof cardId !== 'string' || !CARD_ID.test(cardId)) return null;
    if (typeof quantity !== 'number' || !Number.isFinite(quantity)) return null;
    if (seen.has(cardId)) return null;
    seen.add(cardId);
    const clamped = clampQuantity(quantity);
    if (clamped > 0) entries.push({ cardId, quantity: clamped });
  }
  return entries.sort(byCardId);
}

function parseStoredDeck(value: unknown): Deck | null {
  if (typeof value !== 'object' || value === null) return null;
  const record = value as Record<string, unknown>;
  const { id, name, created, updated } = record;
  if (typeof id !== 'string' || id.length === 0) return null;
  if (typeof name !== 'string') return null;
  if (typeof created !== 'string' || typeof updated !== 'string') return null;
  const main = parseEntries(record.main);
  const extra = parseEntries(record.extra);
  if (!main || !extra) return null;
  return { id, name: normalizeName(name), created, updated, main, extra };
}

export const migrateDecks: Migrate<DeckStore> = (value) => {
  if (typeof value !== 'object' || value === null) return null;
  const record = value as Record<string, unknown>;
  if (record.schemaVersion !== 1) return null;
  if (!Array.isArray(record.decks)) return null;
  const decks: Deck[] = [];
  for (const raw of record.decks) {
    const deck = parseStoredDeck(raw);
    if (!deck) return null;
    decks.push(deck);
  }
  return { schemaVersion: 1, decks };
};

/** Prepends the new deck so the newest one is first. */
export function createDeck(
  store: DeckStore,
  name: string,
  id: string,
  today: string,
): DeckStore {
  const deck: Deck = {
    id,
    name: normalizeName(name),
    created: today,
    updated: today,
    main: [],
    extra: [],
  };
  return { schemaVersion: 1, decks: [deck, ...store.decks] };
}

export function renameDeck(
  store: DeckStore,
  id: string,
  name: string,
  today: string,
): DeckStore {
  if (!store.decks.some((deck) => deck.id === id)) return store;
  return {
    schemaVersion: 1,
    decks: store.decks.map((deck) =>
      deck.id === id
        ? { ...deck, name: normalizeName(name), updated: today }
        : deck,
    ),
  };
}

export function deleteDeck(store: DeckStore, id: string): DeckStore {
  if (!store.decks.some((deck) => deck.id === id)) return store;
  return {
    schemaVersion: 1,
    decks: store.decks.filter((deck) => deck.id !== id),
  };
}

/**
 * Sets the copies of `cardId` in one zone. `0` (or anything clamping to it)
 * removes the entry; entries stay sorted by `cardId`.
 */
export function setQuantity(
  store: DeckStore,
  deckId: string,
  zone: DeckZone,
  cardId: string,
  quantity: number,
  today: string,
): DeckStore {
  if (!store.decks.some((deck) => deck.id === deckId)) return store;
  const clamped = clampQuantity(quantity);
  return {
    schemaVersion: 1,
    decks: store.decks.map((deck) => {
      if (deck.id !== deckId) return deck;
      const kept = deck[zone].filter((entry) => entry.cardId !== cardId);
      const next =
        clamped > 0
          ? [...kept, { cardId, quantity: clamped }].sort(byCardId)
          : kept;
      return zone === 'main'
        ? { ...deck, main: next, updated: today }
        : { ...deck, extra: next, updated: today };
    }),
  };
}

export function deckSize(deck: Deck, zone: DeckZone): number {
  return deck[zone].reduce((total, entry) => total + entry.quantity, 0);
}

/** The portable shape: name and card lists only, no id or timestamps. */
export function exportDeck(deck: Deck): string {
  return JSON.stringify(
    { name: deck.name, main: deck.main, extra: deck.extra },
    null,
    2,
  );
}

/** Returns `null` on invalid JSON or any shape violation — never throws. */
export function importDeck(
  json: string,
  id: string,
  today: string,
): Deck | null {
  let value: unknown;
  try {
    value = JSON.parse(json);
  } catch {
    return null;
  }
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    return null;
  const record = value as Record<string, unknown>;
  if (typeof record.name !== 'string') return null;
  const main = parseEntries(record.main);
  const extra = parseEntries(record.extra);
  if (!main || !extra) return null;
  return {
    id,
    name: normalizeName(record.name),
    created: today,
    updated: today,
    main,
    extra,
  };
}

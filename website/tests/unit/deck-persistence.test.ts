/**
 * Deterministic stand-in for the two manual browser checks in ticket T8.
 *
 * There is no browser or Playwright harness on this host, so instead of
 * clicking through `/decks/` these tests drive the exact call sequence
 * `DeckManager.svelte` performs — the `readStored`/`writeStored` round trip
 * around the pure mutators in `../../src/lib/decks` — against a fake
 * `localStorage`.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  DECKS_KEY,
  EMPTY_STORE,
  createDeck,
  deckSize,
  deleteDeck,
  exportDeck,
  importDeck,
  migrateDecks,
  setQuantity,
  type Deck,
  type DeckStore,
  type DeckZone,
} from '../../src/lib/decks';
import { readStored, writeStored } from '../../src/lib/storage';

const DAY = '2026-08-07';

class FakeStorage {
  private readonly values = new Map<string, string>();
  get length(): number {
    return this.values.size;
  }
  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
  removeItem(key: string): void {
    this.values.delete(key);
  }
  clear(): void {
    this.values.clear();
  }
  key(index: number): string | null {
    return [...this.values.keys()][index] ?? null;
  }
}

beforeEach(() => {
  Object.defineProperty(globalThis, 'localStorage', {
    value: new FakeStorage(),
    configurable: true,
  });
});
afterEach(() => {
  Reflect.deleteProperty(globalThis, 'localStorage');
});

/** What the component's `persist` does, minus the notice bookkeeping. */
function persist(next: DeckStore): DeckStore {
  expect(writeStored(DECKS_KEY, next)).toBe('ok');
  return next;
}
/** What a `+` press does: read the current count, ask for one more. */
function bump(
  store: DeckStore,
  deck: Deck,
  zone: DeckZone,
  cardId: string,
): DeckStore {
  const current =
    deck[zone].find((entry) => entry.cardId === cardId)?.quantity ?? 0;
  return persist(setQuantity(store, deck.id, zone, cardId, current + 1, DAY));
}
function deckAt(store: DeckStore, index: number): Deck {
  const deck = store.decks[index];
  if (!deck) throw new Error(`no deck at ${index}`);
  return deck;
}
/** A page reload: everything comes back from storage and nothing else. */
function reload(): DeckStore {
  return readStored(DECKS_KEY, migrateDecks) ?? EMPTY_STORE;
}

describe('decks page persistence', () => {
  it('keeps a deck and its counts across a reload, capped at two copies', () => {
    let store = persist(createDeck(EMPTY_STORE, 'BA build', 'id-1', DAY));
    store = bump(store, deckAt(store, 0), 'main', 'nekroz-mirror');
    store = bump(store, deckAt(store, 0), 'main', 'nekroz-mirror');
    const capped = bump(store, deckAt(store, 0), 'main', 'nekroz-mirror');
    // The third press asks for 3 copies; the model clamps it back to 2.
    expect(deckAt(capped, 0).main).toEqual([
      { cardId: 'nekroz-mirror', quantity: 2 },
    ]);

    const reloaded = reload();
    expect(reloaded.decks).toHaveLength(1);
    expect(deckAt(reloaded, 0).name).toBe('BA build');
    expect(deckSize(deckAt(reloaded, 0), 'main')).toBe(2);
    expect(deckSize(deckAt(reloaded, 0), 'extra')).toBe(0);
  });

  it('restores an exported deck after it was deleted', () => {
    let store = persist(createDeck(EMPTY_STORE, 'BA build', 'id-1', DAY));
    store = bump(store, deckAt(store, 0), 'main', 'nekroz-mirror');
    store = bump(store, deckAt(store, 0), 'extra', 'nekroz-trishula');
    const json = exportDeck(deckAt(store, 0));

    store = persist(deleteDeck(store, 'id-1'));
    expect(reload().decks).toEqual([]);

    const restored = importDeck(json, 'id-2', DAY);
    if (!restored) throw new Error('import rejected a self-produced export');
    persist({ schemaVersion: 1, decks: [restored, ...store.decks] });

    const reloaded = reload();
    expect(reloaded.decks).toHaveLength(1);
    expect(deckAt(reloaded, 0).name).toBe('BA build');
    expect(deckAt(reloaded, 0).main).toEqual([
      { cardId: 'nekroz-mirror', quantity: 1 },
    ]);
    expect(deckAt(reloaded, 0).extra).toEqual([
      { cardId: 'nekroz-trishula', quantity: 1 },
    ]);
  });

  it('reports the failure case the page shows as a notice', () => {
    expect(importDeck('not json', 'id-3', DAY)).toBeNull();
    expect(importDeck('{"main":[],"extra":[]}', 'id-3', DAY)).toBeNull();
  });
});

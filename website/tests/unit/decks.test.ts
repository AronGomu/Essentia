import { describe, expect, it } from 'vitest';
import {
  createDeck,
  deckSize,
  deleteDeck,
  EMPTY_STORE,
  exportDeck,
  importDeck,
  migrateDecks,
  renameDeck,
  setQuantity,
  type Deck,
  type DeckStore,
} from '../../src/lib/decks';

const DAY = '2026-08-07';
const NEXT_DAY = '2026-08-08';

function oneDeck(): DeckStore {
  return createDeck(EMPTY_STORE, 'BA build', 'id-1', DAY);
}

function deckOf(store: DeckStore, id: string): Deck {
  const deck = store.decks.find((candidate) => candidate.id === id);
  if (!deck) throw new Error(`missing deck ${id}`);
  return deck;
}

describe('deck creation', () => {
  it('creates a deck at the front', () => {
    const store = createDeck(EMPTY_STORE, 'BA build', 'id-1', DAY);
    expect(store.decks[0]).toEqual({
      id: 'id-1',
      name: 'BA build',
      created: DAY,
      updated: DAY,
      main: [],
      extra: [],
    });

    const second = createDeck(store, 'Nekroz build', 'id-2', NEXT_DAY);
    expect(second.decks.map((deck) => deck.id)).toEqual(['id-2', 'id-1']);
    // Purity: the input store keeps its own decks.
    expect(store.decks.map((deck) => deck.id)).toEqual(['id-1']);
    expect(EMPTY_STORE.decks).toEqual([]);
  });

  it('falls back to a default name', () => {
    const store = createDeck(EMPTY_STORE, '   ', 'id-1', DAY);
    expect(deckOf(store, 'id-1').name).toBe('Untitled deck');
  });

  it('truncates a long name', () => {
    const store = createDeck(EMPTY_STORE, 'a'.repeat(90), 'id-1', DAY);
    expect(deckOf(store, 'id-1').name.length).toBe(60);
  });
});

describe('deck renaming and deletion', () => {
  it('renames and stamps', () => {
    const store = renameDeck(oneDeck(), 'id-1', 'New', NEXT_DAY);
    expect(deckOf(store, 'id-1').name).toBe('New');
    expect(deckOf(store, 'id-1').updated).toBe(NEXT_DAY);
    expect(deckOf(store, 'id-1').created).toBe(DAY);
  });

  it('ignores an unknown rename', () => {
    const store = oneDeck();
    expect(renameDeck(store, 'nope', 'x', NEXT_DAY)).toEqual(store);
  });

  it('deletes a deck', () => {
    const store = createDeck(oneDeck(), 'Nekroz build', 'id-2', DAY);
    expect(store.decks).toHaveLength(2);
    const pruned = deleteDeck(store, 'id-1');
    expect(pruned.decks).toHaveLength(1);
    expect(pruned.decks.map((deck) => deck.id)).toEqual(['id-2']);
  });
});

describe('deck quantities', () => {
  it('clamps quantity to two', () => {
    const store = setQuantity(
      oneDeck(),
      'id-1',
      'main',
      'nekroz-trishula',
      5,
      NEXT_DAY,
    );
    expect(deckOf(store, 'id-1').main).toEqual([
      { cardId: 'nekroz-trishula', quantity: 2 },
    ]);
    expect(deckOf(store, 'id-1').updated).toBe(NEXT_DAY);
  });

  it('removes at zero', () => {
    const added = setQuantity(
      oneDeck(),
      'id-1',
      'main',
      'nekroz-trishula',
      2,
      DAY,
    );
    const cleared = setQuantity(
      added,
      'id-1',
      'main',
      'nekroz-trishula',
      0,
      NEXT_DAY,
    );
    expect(deckOf(cleared, 'id-1').main).toEqual([]);
  });

  it('keeps entries sorted by cardId', () => {
    const first = setQuantity(
      oneDeck(),
      'id-1',
      'main',
      'nekroz-unicore',
      1,
      DAY,
    );
    const second = setQuantity(first, 'id-1', 'main', 'nekroz-brionac', 1, DAY);
    expect(deckOf(second, 'id-1').main.map((entry) => entry.cardId)).toEqual([
      'nekroz-brionac',
      'nekroz-unicore',
    ]);
  });

  it('separates zones', () => {
    const store = setQuantity(
      oneDeck(),
      'id-1',
      'extra',
      'nekroz-trishula',
      2,
      DAY,
    );
    expect(deckOf(store, 'id-1').extra).toEqual([
      { cardId: 'nekroz-trishula', quantity: 2 },
    ]);
    expect(deckOf(store, 'id-1').main).toEqual([]);
  });

  it('sums a zone', () => {
    const first = setQuantity(
      oneDeck(),
      'id-1',
      'main',
      'nekroz-brionac',
      2,
      DAY,
    );
    const second = setQuantity(first, 'id-1', 'main', 'nekroz-unicore', 1, DAY);
    expect(deckSize(deckOf(second, 'id-1'), 'main')).toBe(3);
    expect(deckSize(deckOf(second, 'id-1'), 'extra')).toBe(0);
  });
});

describe('deck export and import', () => {
  it('round-trips export/import', () => {
    const withMain = setQuantity(
      oneDeck(),
      'id-1',
      'main',
      'nekroz-brionac',
      2,
      DAY,
    );
    const source = deckOf(
      setQuantity(withMain, 'id-1', 'extra', 'nekroz-trishula', 1, DAY),
      'id-1',
    );

    const imported = importDeck(exportDeck(source), 'id-2', NEXT_DAY);
    expect(imported).not.toBeNull();
    expect(imported?.name).toBe(source.name);
    expect(imported?.main).toEqual(source.main);
    expect(imported?.extra).toEqual(source.extra);
    expect(imported?.id).toBe('id-2');
    expect(imported?.created).toBe(NEXT_DAY);
  });

  it('rejects malformed import', () => {
    expect(
      importDeck('{"main":[{"cardId":"BAD ID","quantity":1}]}', 'id', DAY),
    ).toBeNull();
    expect(
      importDeck(
        '{"name":"Bad","main":[{"cardId":"BAD ID","quantity":1}],"extra":[]}',
        'id',
        DAY,
      ),
    ).toBeNull();
  });

  it('rejects invalid JSON', () => {
    expect(importDeck('not json', 'id', DAY)).toBeNull();
  });
});

describe('deck store migration', () => {
  it('migrates a valid store', () => {
    expect(migrateDecks({ schemaVersion: 1, decks: [] })).toEqual({
      schemaVersion: 1,
      decks: [],
    });
  });

  it('rejects a foreign schema', () => {
    expect(migrateDecks({ schemaVersion: 2, decks: [] })).toBeNull();
  });

  it('re-clamps on read', () => {
    const migrated = migrateDecks({
      schemaVersion: 1,
      decks: [
        {
          id: 'id-1',
          name: 'BA build',
          created: DAY,
          updated: DAY,
          main: [{ cardId: 'nekroz-trishula', quantity: 7 }],
          extra: [],
        },
      ],
    });
    expect(migrated).not.toBeNull();
    expect(migrated?.decks[0]?.main).toEqual([
      { cardId: 'nekroz-trishula', quantity: 2 },
    ]);
  });
});

/**
 * R8 — `localStorage` content and pasted import JSON are untrusted input, and
 * every guard below survived the suite as a mutant. One test per mutant.
 */
describe('R8 untrusted deck input', () => {
  const storedDeck = (overrides: Record<string, unknown> = {}) => ({
    id: 'id-1',
    name: 'BA build',
    created: DAY,
    updated: DAY,
    main: [{ cardId: 'nekroz-trishula', quantity: 2 }],
    extra: [],
    ...overrides,
  });

  it('R8.1 rejects an import repeating one cardId in a zone', () => {
    const json = JSON.stringify({
      name: 'Doubled',
      main: [
        { cardId: 'nekroz-trishula', quantity: 2 },
        { cardId: 'nekroz-trishula', quantity: 2 },
      ],
      extra: [],
    });
    expect(importDeck(json, 'id-1', DAY)).toBeNull();
  });

  it('R8.2 rejects the whole store when one stored deck is malformed', () => {
    const migrated = migrateDecks({
      schemaVersion: 1,
      decks: [storedDeck(), storedDeck({ id: 'id-2', created: 42 })],
    });
    expect(migrated).toBeNull();
  });

  it('R8.3 drops a zero-quantity entry instead of keeping a zero-copy row', () => {
    const deck = importDeck(
      JSON.stringify({
        name: 'Zeroed',
        main: [
          { cardId: 'nekroz-trishula', quantity: 0 },
          { cardId: 'nekroz-brionac', quantity: 1 },
        ],
        extra: [],
      }),
      'id-1',
      DAY,
    );
    expect(deck?.main).toEqual([{ cardId: 'nekroz-brionac', quantity: 1 }]);
    expect(deckSize(deck!, 'main')).toBe(1);
  });

  it('R8.4 rejects a string quantity rather than concatenating deck size', () => {
    const json = JSON.stringify({
      name: 'Stringy',
      main: [{ cardId: 'nekroz-trishula', quantity: '2' }],
      extra: [],
    });
    expect(importDeck(json, 'id-1', DAY)).toBeNull();
  });

  it('R8.5 rejects a bare JSON array where an object is required', () => {
    expect(importDeck('[]', 'id-1', DAY)).toBeNull();
    expect(
      importDeck('[{"name":"A","main":[],"extra":[]}]', 'id-1', DAY),
    ).toBeNull();
    expect(migrateDecks([])).toBeNull();
    expect(migrateDecks([{ schemaVersion: 1, decks: [] }])).toBeNull();
    // The `decks` list must be an array too — without that guard a non-iterable
    // value throws out of a function documented to return `null`, never throw.
    expect(migrateDecks({ schemaVersion: 1, decks: 5 })).toBeNull();
    expect(migrateDecks({ schemaVersion: 1, decks: 'nope' })).toBeNull();
    // Same guard one level down, on an entry list.
    expect(
      migrateDecks({ schemaVersion: 1, decks: [storedDeck({ main: 5 })] }),
    ).toBeNull();
  });

  it('R8.6 exports exactly name, main and extra', () => {
    const store = setQuantity(
      oneDeck(),
      'id-1',
      'main',
      'nekroz-trishula',
      2,
      DAY,
    );
    const exported: unknown = JSON.parse(exportDeck(deckOf(store, 'id-1')));
    expect(Object.keys(exported as object)).toEqual(['name', 'main', 'extra']);
  });
});

<script lang="ts">
  /**
   * The decks page island — the site's documented exception to the zero-JS
   * baseline. It owns persistence; every state transition is a pure call into
   * `../lib/decks` followed by `persist`. Nothing is uploaded: decks live in
   * this browser's `localStorage` only, so export is a copyable textarea
   * rather than a download (the CSP forbids `blob:` and `data:` navigation).
   */
  import { onMount } from 'svelte';
  import { cardHref, pickCards, type PickerCard } from '../lib/deck-picker';
  import {
    DECKS_KEY,
    EMPTY_STORE,
    MAX_COPIES,
    createDeck,
    deckIdFromHash,
    deckSize,
    deleteDeck,
    exportDeck,
    importDeck,
    migrateDecks,
    renameDeck,
    setQuantity,
    type Deck,
    type DeckStore,
    type DeckZone,
  } from '../lib/decks';
  import { readStored, writeStored } from '../lib/storage';

  export let cards: PickerCard[];
  export let base: string;

  const QUOTA_NOTICE =
    'Storage is full — export a deck, then delete it to free space.';
  const UNAVAILABLE_NOTICE =
    'This browser blocks local storage, so decks cannot be saved.';
  const IMPORT_NOTICE = 'Import failed — the JSON is not a valid decklist.';
  const ZONES: DeckZone[] = ['main', 'extra'];

  let store: DeckStore = EMPTY_STORE;
  let selectedId: string | null = null;
  let query = '';
  let notice = '';
  let pendingDelete: string | null = null;
  let importText = '';
  let newName = '';
  let renamingId: string | null = null;
  let renameText = '';
  /** Server-rendered output stays empty so the page's <noscript> block is the
      only thing a visitor without JavaScript sees. */
  let ready = false;

  const byId = new Map(cards.map((card) => [card.id, card]));
  const href = (route: string) => cardHref(base, route);
  const today = () => new Date().toISOString().slice(0, 10);
  const zoneLabel = (zone: DeckZone) =>
    zone === 'main' ? 'Main deck' : 'Extra deck';
  const uuid = () => globalThis.crypto.randomUUID();

  /**
   * `/decks/#deck-<id>` opens that deck. A stale id — a deck deleted, or a
   * link from another browser — selects nothing, so the visitor lands on the
   * list rather than on a blank editor.
   */
  function selectFromHash() {
    const id = deckIdFromHash(globalThis.location.hash);
    selectedId = id && store.decks.some((deck) => deck.id === id) ? id : null;
  }

  onMount(() => {
    store = readStored(DECKS_KEY, migrateDecks) ?? EMPTY_STORE;
    selectFromHash();
    ready = true;
    // A Find result picked while already on /decks/ only changes the hash.
    globalThis.addEventListener('hashchange', selectFromHash);
    return () => globalThis.removeEventListener('hashchange', selectFromHash);
  });

  /** Opening a deck puts it in the URL, so the view can be shared or re-found. */
  function openDeck(deck: Deck) {
    selectedId = deck.id;
    globalThis.history.replaceState(null, '', `#deck-${deck.id}`);
  }

  function persist(next: DeckStore) {
    store = next;
    switch (writeStored(DECKS_KEY, next)) {
      case 'quota-exceeded':
        notice = QUOTA_NOTICE;
        break;
      case 'unavailable':
        notice = UNAVAILABLE_NOTICE;
        break;
      default:
        notice = '';
    }
  }

  $: selected = store.decks.find((deck) => deck.id === selectedId) ?? null;
  $: results = pickCards(cards, query);

  function quantityOf(deck: Deck, zone: DeckZone, cardId: string): number {
    return deck[zone].find((entry) => entry.cardId === cardId)?.quantity ?? 0;
  }
  function create() {
    persist(createDeck(store, newName, uuid(), today()));
    newName = '';
  }
  function startRename(deck: Deck) {
    renamingId = deck.id;
    renameText = deck.name;
  }
  function commitRename(id: string) {
    persist(renameDeck(store, id, renameText, today()));
    renamingId = null;
  }
  function confirmDelete(id: string) {
    persist(deleteDeck(store, id));
    if (selectedId === id) selectedId = null;
    pendingDelete = null;
  }
  function step(deck: Deck, zone: DeckZone, cardId: string, delta: number) {
    const next = quantityOf(deck, zone, cardId) + delta;
    persist(setQuantity(store, deck.id, zone, cardId, next, today()));
  }
  async function copyExport() {
    const deck = selected;
    const clipboard = globalThis.navigator.clipboard;
    if (!clipboard || !deck) return;
    await clipboard.writeText(exportDeck(deck));
    notice = 'Deck JSON copied to the clipboard.';
  }
  function runImport() {
    const deck = importDeck(importText, uuid(), today());
    if (!deck) {
      notice = IMPORT_NOTICE;
      return;
    }
    persist({ schemaVersion: 1, decks: [deck, ...store.decks] });
    importText = '';
  }
</script>

{#if ready}
  <div class="deck-manager">
    <p class="deck-notice" role="status">{notice}</p>

    <section class="deck-list" aria-labelledby="deck-list-title">
      <h2 id="deck-list-title">Your decklists</h2>
      <form class="deck-create" on:submit|preventDefault={create}>
        <label for="new-deck-name">New deck name</label>
        <input id="new-deck-name" bind:value={newName} autocomplete="off" />
        <button type="submit">New deck</button>
      </form>
      {#if store.decks.length === 0}
        <p>No decklists yet — name one above to start.</p>
      {:else}
        <ul>
          {#each store.decks as deck (deck.id)}
            <li>
              <p class="deck-summary">
                <strong>{deck.name}</strong>
                <span
                  >{deckSize(deck, 'main')} main · {deckSize(deck, 'extra')} extra
                  · updated {deck.updated}</span
                >
              </p>
              <div class="deck-actions">
                <button
                  on:click={() => openDeck(deck)}
                  aria-pressed={selectedId === deck.id}>Open</button
                >
                <button on:click={() => startRename(deck)}>Rename</button>
                {#if pendingDelete === deck.id}
                  <button on:click={() => confirmDelete(deck.id)}
                    >Confirm delete</button
                  >
                  <button on:click={() => (pendingDelete = null)}>Cancel</button
                  >
                {:else}
                  <button on:click={() => (pendingDelete = deck.id)}
                    >Delete</button
                  >
                {/if}
              </div>
              {#if renamingId === deck.id}
                <div class="deck-rename">
                  <label for={`rename-${deck.id}`}>Rename “{deck.name}”</label>
                  <input
                    id={`rename-${deck.id}`}
                    bind:value={renameText}
                    autocomplete="off"
                  />
                  <button on:click={() => commitRename(deck.id)}
                    >Save name</button
                  >
                </div>
              {/if}
            </li>
          {/each}
        </ul>
      {/if}
    </section>

    {#if selected}
      {@const deck = selected}
      <section class="deck-editor" aria-labelledby="deck-editor-title">
        <h2 id="deck-editor-title">Editing {deck.name}</h2>
        <label for="deck-card-search">Add a card by name</label>
        <input id="deck-card-search" bind:value={query} autocomplete="off" />
        <ul>
          {#each results as card (card.id)}
            <li class="deck-entry">
              <a href={href(card.route)}>{card.name}</a>
              <span>{card.sectionLabel} · {card.zone}</span>
              <button
                disabled={quantityOf(deck, card.zone, card.id) >= MAX_COPIES}
                on:click={() => step(deck, card.zone, card.id, 1)}>Add</button
              >
            </li>
          {/each}
        </ul>
        {#each ZONES as zone (zone)}
          <h3>{zoneLabel(zone)} — {deckSize(deck, zone)} cards</h3>
          {#if deck[zone].length === 0}
            <p>No cards in this zone yet.</p>
          {:else}
            <ul>
              {#each deck[zone] as entry (entry.cardId)}
                {@const card = byId.get(entry.cardId)}
                {@const name = card?.name ?? entry.cardId}
                <li class="deck-entry">
                  {#if card}
                    <a href={href(card.route)}>{name}</a>
                  {:else}<span>{name}</span>{/if}
                  <button
                    aria-label={`Remove one copy of ${name}`}
                    on:click={() => step(deck, zone, entry.cardId, -1)}
                    >−</button
                  >
                  <span>{entry.quantity}</span>
                  <button
                    aria-label={`Add one copy of ${name}`}
                    disabled={entry.quantity >= MAX_COPIES}
                    on:click={() => step(deck, zone, entry.cardId, 1)}>+</button
                  >
                </li>
              {/each}
            </ul>
          {/if}
        {/each}
      </section>
    {/if}

    <details class="deck-transfer">
      <summary>Export / import</summary>
      <label for="deck-export">Deck JSON — open a deck to fill this in</label>
      <textarea
        id="deck-export"
        readonly
        value={selected ? exportDeck(selected) : ''}></textarea>
      <button disabled={!selected} on:click={copyExport}>Copy</button>
      <label for="deck-import">Paste a deck JSON to import it</label>
      <textarea id="deck-import" bind:value={importText}></textarea>
      <button on:click={runImport}>Import</button>
    </details>
  </div>
{/if}

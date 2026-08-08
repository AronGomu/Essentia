<script lang="ts">
  /**
   * The header's global Find palette.
   *
   * `entries` is the build-time index: cards, docs, blog posts and published
   * decks, identical for every visitor. The visitor's own decks are read from
   * `localStorage` after mount and merged in here — they are never part of
   * `entries`, never server-rendered, and never reach a built file. The
   * `check-chrome` gate fails the build if one ever does.
   */
  import { onMount } from 'svelte';
  import { DECKS_KEY, migrateDecks } from '../lib/decks';
  import {
    FIND_KINDS,
    FIND_KIND_LABEL,
    findGroups,
    localDeckEntries,
    type FindEntry,
    type FindKind,
  } from '../lib/find';
  import { readStored } from '../lib/storage';

  export let entries: FindEntry[];
  export let base: string;

  /** Rows shown per kind while no kind filter is active. */
  const PER_KIND = 6;

  /**
   * `withBase` inlined rather than imported from `../lib/catalog`: that module
   * builds lookup maps over the generated catalog at module scope, so a client
   * island importing anything from it ships the entire card database — 386 KB
   * in this chunk alone, over the 350 KB JS budget. Same string arithmetic.
   */
  const href = (route: string) =>
    `${base.replace(/\/$/, '')}/${route.replace(/^\//, '')}`;

  let dialog: HTMLDialogElement;
  let input: HTMLInputElement;
  let trigger: HTMLButtonElement;
  let query = '';
  let kind: FindKind | null = null;
  let active = 0;
  /** The visitor's own decks. Populated in the browser only. */
  let localEntries: FindEntry[] = [];

  $: groups = findGroups([...entries, ...localEntries], query, kind, PER_KIND);
  $: flat = groups.flatMap((group) => group.entries);
  $: active = Math.min(active, Math.max(0, flat.length - 1));
  $: keepActiveVisible(active, flat);

  /**
   * Touches `localStorage`, so it runs after mount and on every open — never
   * during SSR. `readStored` already swallows a blocked or corrupt store and
   * returns `null`, so a browser with storage disabled simply sees the
   * published decks alone.
   */
  function readLocalDecks() {
    const store = readStored(DECKS_KEY, migrateDecks);
    localEntries = store ? localDeckEntries(store.decks) : [];
  }

  onMount(readLocalDecks);

  function open() {
    query = '';
    kind = null;
    active = 0;
    // Re-read so a deck created in another tab since mount shows up.
    readLocalDecks();
    dialog.showModal();
    requestAnimationFrame(() => input.focus());
  }
  function close() {
    dialog.close();
    trigger.focus();
  }
  function selectKind(value: FindKind | null) {
    kind = value;
    active = 0;
    // Keep the keyboard model intact: arrows and Enter belong to the input.
    input?.focus();
  }
  function onWindowKeydown(event: KeyboardEvent) {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      if (dialog.open) close();
      else open();
    }
  }
  function navigate(route: string) {
    // Close first: a same-page result is a fragment navigation (`/decks/#deck-…`
    // from the page it points at), which never unloads the document. A modal
    // dialog left open would cover the target and hold the rest of the page
    // inert until Escape.
    dialog.close();
    window.location.href = href(route);
  }
  function keepActiveVisible(index: number, items: FindEntry[]) {
    if (!dialog?.open || !items[index]) return;
    requestAnimationFrame(() =>
      document
        .getElementById(`find-result-${items[index]?.key}`)
        ?.scrollIntoView({ block: 'nearest' }),
    );
  }
  function onInputKeydown(event: KeyboardEvent) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      active = Math.min(active + 1, flat.length - 1);
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      active = Math.max(active - 1, 0);
    }
    if (event.key === 'Enter' && flat[active]) navigate(flat[active].route);
  }
</script>

<svelte:window on:keydown={onWindowKeydown} />
<button
  class="search-trigger"
  bind:this={trigger}
  on:click={open}
  aria-haspopup="dialog"
>
  <span aria-hidden="true">⌕</span><span>Find</span><kbd>⌘ K</kbd>
</button>

<dialog
  class="search-dialog"
  bind:this={dialog}
  aria-labelledby="search-title"
  on:click={(event) => event.target === dialog && close()}
  on:close={() => trigger?.focus()}
>
  <div class="search-panel">
    <header>
      <h2 id="search-title">Find</h2>
      <button on:click={close} aria-label="Close search">×</button>
    </header>
    <label for="global-find">Search cards, docs, blog posts and decks</label>
    <input
      id="global-find"
      bind:this={input}
      bind:value={query}
      on:keydown={onInputKeydown}
      role="combobox"
      aria-autocomplete="list"
      aria-expanded={flat.length > 0}
      aria-controls={flat.length ? 'find-results' : undefined}
      aria-activedescendant={flat[active]
        ? `find-result-${flat[active].key}`
        : undefined}
      autocomplete="off"
    />
    <div class="find-filters" role="group" aria-label="Filter by kind">
      <button aria-pressed={kind === null} on:click={() => selectKind(null)}
        >All</button
      >
      {#each FIND_KINDS as value (value)}
        <button aria-pressed={kind === value} on:click={() => selectKind(value)}
          >{FIND_KIND_LABEL[value]}</button
        >
      {/each}
    </div>
    <p class="sr-only" aria-live="polite">
      {flat.length}
      {flat.length === 1 ? 'result' : 'results'}
    </p>
    {#if flat.length}
      <ul id="find-results" role="listbox" aria-label="Find results">
        {#each groups as group (group.kind)}
          <li role="presentation" class="find-group-label">{group.label}</li>
          {#each group.entries as entry (entry.key)}
            <li
              id={`find-result-${entry.key}`}
              role="option"
              tabindex="-1"
              data-find-kind={entry.kind}
              aria-selected={flat[active]?.key === entry.key}
              on:mousemove={() => (active = flat.indexOf(entry))}
              on:click={() => navigate(entry.route)}
              on:keydown={(event) =>
                event.key === 'Enter' && navigate(entry.route)}
            >
              <strong>{entry.title}</strong><span>{entry.detail}</span>
            </li>
          {/each}
        {/each}
      </ul>
    {:else}
      <p id="find-results" class="search-empty">Nothing matches “{query}”.</p>
    {/if}
  </div>
</dialog>

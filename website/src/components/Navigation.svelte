<script lang="ts">
  import { onMount } from 'svelte';
  import type { CatalogSection } from '../lib/catalog';
  import {
    applyRailState,
    readRailState,
    toggleRailState,
    writeRailState,
    type RailState,
  } from '../lib/catalog-rail';

  type NavSection = Pick<
    CatalogSection,
    'slug' | 'label' | 'kind' | 'route' | 'count'
  >;
  export let sections: NavSection[];
  export let currentPath: string;
  export let base: string;

  let dialog: HTMLDialogElement;
  let opener: HTMLButtonElement;
  let nonArchetypeOpen = true;
  let railState: RailState = 'expanded';

  onMount(() => {
    railState = readRailState();
    applyRailState(railState);
  });

  function toggleRail() {
    railState = toggleRailState(railState);
    applyRailState(railState);
    writeRailState(railState);
  }

  const href = (route: string) =>
    `${base.replace(/\/$/, '')}/${route.replace(/^\//, '')}`;
  const nonArchetype = sections.filter(
    (section) => section.kind === 'non-archetype',
  );
  const archetypes = sections.filter((section) => section.kind === 'archetype');
  const current = (route: string) => {
    const normalized = currentPath.endsWith('/')
      ? currentPath
      : `${currentPath}/`;
    if (normalized.endsWith(route)) return 'page' as const;
    return normalized.includes(route) ? ('location' as const) : undefined;
  };

  function openDrawer() {
    dialog.showModal();
    requestAnimationFrame(() =>
      dialog.querySelector<HTMLElement>('a, button')?.focus(),
    );
  }
  function closeDrawer() {
    dialog.close();
  }
  function keepFocus(event: FocusEvent) {
    const next = event.relatedTarget;
    if (dialog.open && (!(next instanceof Node) || !dialog.contains(next))) {
      event.preventDefault();
      dialog.querySelector<HTMLElement>('button, summary, a')?.focus();
    }
  }
  function trapFocus(event: KeyboardEvent) {
    if (event.key !== 'Tab') return;
    const focusable = [
      ...dialog.querySelectorAll<HTMLElement>('a, button, summary'),
    ];
    const first = focusable[0];
    const last = focusable.at(-1);
    if (!first || !last) return;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
</script>

<button
  class="drawer-trigger"
  bind:this={opener}
  on:click={openDrawer}
  aria-haspopup="dialog"
>
  <span aria-hidden="true">☰</span> Catalog
</button>

<nav id="desktop-catalog" class="desktop-catalog" aria-label="Catalog">
  <button
    class="rail-toggle rail-toggle--top"
    aria-expanded={railState === 'expanded'}
    aria-controls="desktop-catalog"
    on:click={toggleRail}
  >
    <span aria-hidden="true">{railState === 'expanded' ? '⟨' : '⟩'}</span>
    <span class="sr-only"
      >{railState === 'expanded' ? 'Collapse catalog' : 'Expand catalog'}</span
    >
  </button>
  <button
    class="nav-group"
    aria-expanded={nonArchetypeOpen}
    aria-controls="desktop-non-archetype"
    on:click={() => (nonArchetypeOpen = !nonArchetypeOpen)}
  >
    Non-Archetype <span aria-hidden="true">{nonArchetypeOpen ? '−' : '+'}</span>
  </button>
  {#if nonArchetypeOpen}
    <ul id="desktop-non-archetype">
      {#each nonArchetype as section (section.slug)}
        <li>
          <a href={href(section.route)} aria-current={current(section.route)}
            >{section.label}<small>{section.count}</small></a
          >
        </li>
      {/each}
    </ul>
  {/if}
  <p class="nav-label">Archetypes</p>
  <ul>
    {#each archetypes as section (section.slug)}
      <li>
        <a href={href(section.route)} aria-current={current(section.route)}
          >{section.label}<small>{section.count}</small></a
        >
      </li>
    {/each}
  </ul>
  <button
    class="rail-toggle rail-toggle--bottom"
    aria-expanded={railState === 'expanded'}
    aria-controls="desktop-catalog"
    on:click={toggleRail}
  >
    <span aria-hidden="true">{railState === 'expanded' ? '⟨' : '⟩'}</span>
    <span class="sr-only"
      >{railState === 'expanded' ? 'Collapse catalog' : 'Expand catalog'}</span
    >
  </button>
</nav>

<dialog
  class="mobile-drawer"
  bind:this={dialog}
  aria-labelledby="catalog-title"
  on:click={(event) => event.target === dialog && closeDrawer()}
  on:close={() => opener?.focus()}
  on:keydown={trapFocus}
  on:focusout={keepFocus}
>
  <div class="drawer-panel">
    <header>
      <h2 id="catalog-title">Catalog</h2>
      <button on:click={closeDrawer} aria-label="Close catalog">×</button>
    </header>
    <nav aria-label="Mobile catalog">
      <details open>
        <summary>Non-Archetype</summary>
        <ul>
          {#each nonArchetype as section (section.slug)}<li>
              <a
                href={href(section.route)}
                aria-current={current(section.route)}
                >{section.label} <small>{section.count}</small></a
              >
            </li>{/each}
        </ul>
      </details>
      <p class="nav-label">Archetypes</p>
      <ul>
        {#each archetypes as section (section.slug)}<li>
            <a href={href(section.route)} aria-current={current(section.route)}
              >{section.label} <small>{section.count}</small></a
            >
          </li>{/each}
      </ul>
    </nav>
  </div>
</dialog>

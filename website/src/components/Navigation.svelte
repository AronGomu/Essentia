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
  import type { ReadingKind, ReadingNavGroup } from '../lib/reading-nav';

  type NavSection = Pick<
    CatalogSection,
    'slug' | 'label' | 'kind' | 'route' | 'count'
  >;
  export let sections: NavSection[];
  export let currentPath: string;
  export let base: string;
  /** Docs and blog pages swap the catalog out for their own reading nav. */
  export let mode: 'catalog' | 'reading' = 'catalog';
  export let readingKind: ReadingKind | null = null;
  export let readingGroups: ReadingNavGroup[] = [];

  let dialog: HTMLDialogElement;
  let opener: HTMLButtonElement;
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

  $: navLabel = mode === 'reading' ? 'Documentation and blog' : 'Catalog';
  $: drawerLabel = mode === 'reading' ? 'Docs & blog' : 'Catalog';
  $: closeLabel = `Close ${drawerLabel.toLowerCase()}`;

  const href = (route: string) =>
    `${base.replace(/\/$/, '')}/${route.replace(/^\//, '')}`;
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
  <span aria-hidden="true">☰</span>
  {drawerLabel}
</button>

<nav id="desktop-catalog" class="desktop-catalog" aria-label={navLabel}>
  {#if mode === 'catalog'}
    <!-- One flat list. Sections arrive pre-ordered from
         website/content/sections.json (non-archetype first), so grouping
         them again only added a heading and a disclosure to click through. -->
    <ul id="desktop-catalog-sections">
      {#each sections as section (section.slug)}
        <li>
          <a href={href(section.route)} aria-current={current(section.route)}
            >{section.label}<small>{section.count}</small></a
          >
        </li>
      {/each}
    </ul>
  {:else}
    <!-- `true`, not `page`: on `/docs/rules/zones/` the switcher marks the
         active *section* while the group list marks the active page, and two
         `aria-current="page"` links in one nav announce two current pages. -->
    <div class="reading-switch">
      <a
        href={href('/docs/')}
        aria-current={readingKind === 'docs' ? 'true' : undefined}>Docs</a
      >
      <a
        href={href('/blog/')}
        aria-current={readingKind === 'blog' ? 'true' : undefined}>Blog</a
      >
    </div>
    {#each readingGroups as group (group.key)}
      <p class="nav-label">{group.label}</p>
      <ul>
        {#each group.items as item (item.route)}
          <li>
            <a href={href(item.route)} aria-current={current(item.route)}
              >{item.title}{#if item.meta}<small>{item.meta}</small>{/if}</a
            >
          </li>
        {/each}
      </ul>
    {/each}
  {/if}
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
      <h2 id="catalog-title">{drawerLabel}</h2>
      <button on:click={closeDrawer} aria-label={closeLabel}>×</button>
    </header>
    <!-- Below 64rem `.desktop-catalog` is `display: none`, so on a phone this
         drawer is the only navigation there is. It has to carry whichever mode
         the rail is in, or a reading page strands the visitor. -->
    <nav aria-label={`Mobile ${navLabel.toLowerCase()}`}>
      {#if mode === 'catalog'}
        <ul>
          {#each sections as section (section.slug)}<li>
              <a
                href={href(section.route)}
                aria-current={current(section.route)}
                >{section.label} <small>{section.count}</small></a
              >
            </li>{/each}
        </ul>
      {:else}
        <div class="reading-switch">
          <a
            href={href('/docs/')}
            aria-current={readingKind === 'docs' ? 'true' : undefined}>Docs</a
          >
          <a
            href={href('/blog/')}
            aria-current={readingKind === 'blog' ? 'true' : undefined}>Blog</a
          >
        </div>
        {#each readingGroups as group (group.key)}
          <p class="nav-label">{group.label}</p>
          <ul>
            {#each group.items as item (item.route)}<li>
                <a href={href(item.route)} aria-current={current(item.route)}
                  >{item.title}{#if item.meta}<small>{item.meta}</small>{/if}</a
                >
              </li>{/each}
          </ul>
        {/each}
      {/if}
    </nav>
  </div>
</dialog>

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
    'slug' | 'label' | 'kind' | 'accent' | 'route' | 'count'
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
    // BaseLayout's CSP `style-src` (hardened by scripts/harden-csp.mjs) lists
    // only the sha256 hashes of this page's static <style> elements — it
    // carries no `'unsafe-inline'`/`'unsafe-hashes'` for the *attribute*
    // form, and a per-section value like `--nav-tint: var(--ember)` can't be
    // hashed statically anyway. Every browser therefore silently drops the
    // SSR-rendered `style="--nav-tint: …"` on each <li>: the text is still
    // visible via `getAttribute('style')`, but it never reaches
    // `element.style` or `getComputedStyle`, so `color-mix()` in
    // `.desktop-catalog li a` never sees it. Verified cross-engine — a CSP-
    // free minimal repro of the identical markup+CSS renders the tint fine.
    // CSP does not restrict direct CSSOM mutation, so apply the tint that
    // way instead, once, from the same `sections` data `tintStyle` reads.
    const applyTint = (list: NodeListOf<HTMLLIElement>) => {
      list.forEach((li, index) => {
        const value = tintStyle(sections[index]);
        if (value) li.style.setProperty('--nav-tint', value);
      });
    };
    applyTint(
      document.querySelectorAll<HTMLLIElement>(
        '#desktop-catalog-sections > li',
      ),
    );
    applyTint(
      document.querySelectorAll<HTMLLIElement>('#mobile-catalog-sections > li'),
    );
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

  /**
   * The rail wears each archetype's own colour. `non-archetype` is not an
   * archetype and has no colour of its own — its authored `relic` accent is
   * the page accent, not a section identity — so it rests on the rail's own
   * black and only lifts on hover.
   *
   * Returns the CSS value each <li> should carry as its `--nav-tint`
   * property. Bound both as a `style:--nav-tint` directive on the markup
   * (kept for readability/SSR intent) and applied again through the CSSOM
   * in `onMount` above — see the comment there for why the second pass is
   * required: BaseLayout's CSP `style-src` has no allowance for inline
   * `style=""` attribute values, so the SSR-rendered attribute is silently
   * inert in every engine and only the CSSOM write actually paints it.
   */
  const tintStyle = (section: NavSection) =>
    section.kind === 'archetype' ? `var(--${section.accent})` : null;

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
        <li style:--nav-tint={tintStyle(section)}>
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
        <ul id="mobile-catalog-sections">
          {#each sections as section (section.slug)}<li
              style:--nav-tint={tintStyle(section)}
            >
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

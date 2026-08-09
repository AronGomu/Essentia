# ADR 0028 — The catalog rail is flat and tinted by section

- Date: 2026-08-09
- Status: Proposed
- Scope: catalog navigation — `website/src/components/Navigation.svelte`, `website/src/layouts/BaseLayout.astro`, `website/src/styles/global.css`

## Context

The catalog rail split five sections into two groups: a collapsible "Non-Archetype" disclosure (a `<button class="nav-group">` on desktop, a `<details open>` in the mobile drawer) holding one entry, and an "Archetypes" `.nav-label` heading over the other four. Two headings, one disclosure and one click, to reach a list that fits on screen without scrolling.

The grouping also carried no information the list itself does not: `website/content/sections.json` already orders the sections `non-archetype` (order 0) then the four archetypes (orders 1–4), and the rail renders that order.

Separately, the rail was monochrome. Every entry rested on the same near-black with a grey `var(--sleeve)` hover, so the rail gave no hint of which archetype a visitor was heading into, even though each section has carried an authored `accent` since the catalog schema was written.

## Decision

1. The catalog rail and the mobile drawer each render **one** flat `<ul>` over `sections`, in the order received. No group button, no `<details>`, no group heading.
2. The reading mode of the same component (docs and blog) keeps its `.reading-switch` and its per-group `.nav-label` headings. That grouping is authored in `website/content/reading-order.json` and is checked by `website/scripts/check-chrome.mjs`.
3. Each archetype `<li>` sets `--nav-tint: var(--{accent})` inline. Links rest on `color-mix(in oklch, var(--nav-tint, transparent) 14%, transparent)` and lift to `color-mix(in oklch, var(--nav-tint, var(--sleeve)) 32%, var(--sleeve))` on hover, `:focus-visible` and `aria-current="page"`.
4. The tint keys off `kind === 'archetype'`, **not** off `accent`. `non-archetype` carries `accent: relic` as its *page* theme, which is not a section identity; the rail leaves it untinted on its own black.
5. No colour token is re-authored. `burning-abyss → --ember` (orange) and `nekroz → --ice` (blue) already match what was asked for.

## Evidence

`website/content/sections.json` assigns `ember` / `shadow` / `ice` / `aether` to the four archetypes and `relic` to `non-archetype`, whose `kind` is `non-archetype`. `website/src/styles/global.css` `:root` defines `--ember: oklch(0.68 0.18 32)` and `--ice: oklch(0.78 0.13 218)`.

The untinted fallbacks are exact: with `--nav-tint` unset, the resting mix resolves to `transparent` and the hover mix to `color-mix(in oklch, var(--sleeve) 32%, var(--sleeve))` — that is `var(--sleeve)`, the pre-tint appearance, unchanged.

`chromeIssues()` in `website/scripts/check-chrome.mjs` inspects catalog markup only for the rail's presence and its toggle; its `mobileReadingNavIssues()` gate runs on `docs/` and `blog/` pages and reads the reading markup, which this decision does not touch.

## Consequences

- One flat list, no disclosure to open, identical on desktop and phone.
- Section identity is visible in the rail before the visitor clicks.
- `Navigation.svelte`'s `sections` prop gains a required `accent: string`; `BaseLayout.astro` must stop dropping it when it narrows `catalog.sections`.
- A future non-archetype-like section that *should* be tinted needs `kind: 'archetype'` or an explicit opt-in field — the rule is deliberately structural, not per-slug.

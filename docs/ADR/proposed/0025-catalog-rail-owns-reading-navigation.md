# ADR 0025 — The catalog rail owns reading navigation; the brand belongs to the header

- Date: 2026-08-08
- Status: Proposed — accepted for implementation by `ai-artifacts/PLAN_2026_08_08_website-feedback-pass-2.md` (T7, T8, T10)
- Scope: site chrome, navigation, docs and blog page shells
- Related: [0020 — Reading surfaces for docs and blog](0020-reading-surfaces-for-docs-and-blog.md), [0022 — Essentia logo and icon set](0022-essentia-logo-and-icon-set.md)

## Context

Three navigation surfaces competed for the left edge of a docs page:

- the fixed catalog rail (`.desktop-catalog`) listing sections and archetypes,
- the in-page reading rail (`.reading-rail docs-rail` / `blog-rail`) listing articles,
- a fixed-position collapse toggle floating between them.

On `/docs/…` the visitor therefore saw two vertical lists side by side, one of which —
archetype links — is irrelevant while reading documentation. The article column paid
for both. Meanwhile the rail's text brand (`.brand`, the word "Essentia") vanished
whenever the rail collapsed, because collapsing translated the whole rail off screen
and set `--sidebar: 0rem`; the header only revealed its wordmark below 64rem.

## Decision

1. **Brand moves to the header.** `<a class="compact-brand">` becomes the first child
   of `<header class="site-header">` and is `display: block` at every width. The nav's
   text brand is deleted. The rail can no longer hide the brand because the rail no
   longer owns it.
2. **The toggle moves inside the rail, twice.** Two `.rail-toggle` buttons are the
   first and last children of `<nav id="desktop-catalog">`, so a visitor at either end
   of a long rail can collapse or expand it without travelling.
3. **Collapsed is a strip, not a disappearance.** `html[data-catalog='collapsed']` sets
   `--sidebar: 3.25rem`; the rail stays in flow with `transform: none`, and every child
   except the two toggles is hidden. The persisted state key
   (`essentia.v1.catalog-rail`) and the pre-paint inline script are unchanged.
4. **The rail is context-sensitive.** `Navigation` takes `mode: 'catalog' | 'reading'`.
   On `/docs/…` and `/blog/…` it renders a two-link `Docs | Blog` switcher followed by
   the article groups, and renders no section or archetype links. Everywhere else it
   renders the catalog exactly as before.
5. **The in-page reading rail is deleted.** `DocsRail.astro`, `BlogRail.astro`, every
   `.reading-rail` rule and the `--reading-rail` token go. `.reading-shell` becomes
   `minmax(0, 1fr) var(--reading-toc)`, so the article column absorbs the freed width.
6. **The gate follows.** `check-chrome.mjs` stops requiring `class="reading-rail` on
   reading pages and requires `class="reading-switch"` instead, so a regression that
   drops the switcher fails the build rather than shipping an unnavigable docs page.
7. The mobile drawer keeps showing the catalog on every page. It is the small-screen
   catalog and is out of scope for this decision.

## Consequences

- One vertical navigation surface at a time. The docs body gains roughly 17rem.
- Reading navigation now depends on the rail's collapsed state: collapsing on `/docs/`
  hides the article list. That is the same trade the catalog already made, and both
  toggles stay visible to undo it.
- `Navigation.svelte` grows a branch and three props; it is now the single component
  that answers "what is on the left edge".
- ADR 0020's reading-surface tokens survive except `--reading-rail`, which has no
  consumer left.
- A future third reading kind (say, releases) is a new `mode` value plus a switcher
  entry, not a new rail component.

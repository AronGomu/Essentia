# Manual test checklist — steps a human still needs to eyeball in a real browser.

## T1 header-owns-top-row

- [ ] `cd website && npm run dev`, open `http://localhost:4321/` at a desktop width: the Essentia wordmark is flush to the top-left corner, with nothing floating over it.
- [ ] The site header spans the entire viewport width, edge to edge, and paints above the catalog rail.
- [ ] The catalog rail starts at the header's bottom border, not at the top of the viewport.
- [ ] Narrow the window to 900px: the hamburger sits immediately to the right of the wordmark, in the header row, and no longer floats over the top-left corner.
- [ ] At 900px, tapping the hamburger still opens the mobile drawer.
- [ ] Narrow to a phone width (390px): the wordmark still holds the top-left corner and the header does not overflow horizontally.
- [ ] Visit an inner page with a breadcrumb (for example `/docs/`): the order across the header is wordmark, then breadcrumb, then the utility nav and search.
- [ ] Scroll a long page: the header stays stuck to the top and nothing from the rail bleeds over it.

## T2 single-square-rail-toggle

- [ ] `cd website && npm run dev`, open `http://localhost:4321/` at 1400px: the catalog rail has exactly one collapse control — a small square in its bottom-right corner. There is no second toggle at the top of the rail.
- [ ] Click that square: the rail collapses to a narrow strip and the square is still visible in the strip's bottom-right corner.
- [ ] Click it again: the rail expands back. The square's size does not change between the two states.
- [ ] Watch the square while toggling: it stays a square (equal width and height) and stays pinned to the rail's bottom-right corner — it never stretches to the rail's full width.
- [ ] Collapse the rail, then navigate to a docs page (for example `/docs/`): the rail is still collapsed and the square is still reachable to reopen it.
- [ ] With the rail expanded, tab to the square with the keyboard: it takes focus with a visible focus ring, and Enter or Space toggles the rail.
- [ ] With a screen reader (or the accessibility inspector), confirm the control is announced as "Collapse catalog" when expanded and "Expand catalog" when collapsed.

## T3 flat-catalog-rail

- [ ] `cd website && npm run dev`, open `http://localhost:4321/` at 1400px: the catalog rail shows one flat list of links — no "Non-Archetype" toggle button, no "Archetypes" heading, no collapsible group.
- [ ] Every published section (currently Non-archetype, Burning Abyss, Nekroz — Shaddoll and Spellbook have no released cards yet in this checkout) appears as a link with its label and a count badge, in that order.
- [ ] Narrow to a phone width (390px or similar) and open the hamburger drawer: it shows the same flat list of links, no `<details>`/`<summary>` disclosure, no "Archetypes" heading.
- [ ] Visit `/docs/` and `/blog/`: the rail switches to its reading mode — the Docs/Blog switcher and grouped headings (e.g. "Design", chapter names) are unchanged from before this change.
- [ ] Click a catalog link (e.g. "Burning Abyss"): it navigates to that section and the link shows as current (a marker before it).
- [ ] Once Shaddoll and/or Spellbook cards are released, re-check this page: those sections should appear in the flat list in the same style, with no code changes needed.

## T4 accent-tinted-nav-items

- [ ] `cd website && npm run build && node scripts/serve-dist.mjs` (production build — the tint's CSSOM fallback only matters once the CSP is hardened by `scripts/harden-csp.mjs`, which runs on build, not on `npm run dev`), open the served site at 1400px: Burning Abyss reads with a faint orange-brown wash, Nekroz with a faint blue-teal wash, and Non-archetype stays plain black.
- [ ] Hover Burning Abyss: its wash visibly deepens (goes from a faint tint to a stronger orange-brown, still readable). Move off: it returns to the faint resting wash.
- [ ] Hover Non-archetype: it lifts to the same plain `--sleeve` highlight as before this change — no colour appears.
- [ ] Tab to Burning Abyss with the keyboard: the same deepened wash appears on `:focus-visible` as on hover.
- [ ] Navigate to `/archetypes/burning-abyss/`: the Burning Abyss rail link shows the deepened wash as its "current page" state (no separate marker needed to tell it apart from hover/focus).
- [ ] Narrow to a phone width (390px) and open the hamburger drawer: the same tints (Burning Abyss orange, Nekroz blue, Non-archetype black) appear in the drawer's list, and hovering/tapping deepens them the same way.
- [ ] Open the browser devtools console while loading the page: no CSP violation reports and no other console errors.
- [ ] `cd website && npm run dev` (unhardened dev CSP), open at 1400px: the same tints render correctly (the dev-mode CSP still allows the plain inline `style=""` attribute, so this should look identical to the production build).

## T5 compact-header-overflow-menu

- [ ] `cd website && npm run build && node scripts/serve-dist.mjs`, open the served site at 1400px: the header shows the brand, the hamburger drawer trigger, and the utility nav as a plain inline row of three text links — "Learn about Essentia", "Blog", "Decks" — exactly as before this change; no `⋯` button is visible.
- [ ] Narrow the browser to 400px width: the utility nav collapses to a single small square `⋯` button (labelled "More sections"); the "Learn about Essentia" text link is not visible anywhere in the header.
- [ ] At 400px, the drawer trigger and the Find trigger show as icon-only squares (`☰` and `⌕`) with no visible text label.
- [ ] At 400px, click the `⋯` button: a small popover panel opens below the header at the right edge, listing "Learn", "Blog", "Decks" (short labels).
- [ ] With the popover open, inspect each link's accessible name via a screen reader or the browser's accessibility tree inspector: the docs link announces "Learn about Essentia" even though only "Learn" is visible; the drawer trigger announces "Catalog" (or "Docs & blog" in reading mode); the Find trigger announces "Find".
- [ ] Click outside the open popover (or press Escape): it closes.
- [ ] Resize the browser slowly from 1400px to 390px and back: the switch between the inline row and the `⋯` button happens exactly at 44rem (704px) with no layout jump or flash of unstyled content.
- [ ] Open the browser devtools console at 400px while opening/closing the popover: no console errors.

## T6 header-single-row-guard

- [ ] `cd website && npm run build && node scripts/serve-dist.mjs`, open DevTools at exactly 400×800 on `/cards/ash-blossom-and-joyous-spring/`: the header stays one row (brand, hamburger icon, breadcrumb, `⋯` button, Find icon all sit on the same line — no wrap).
- [ ] At 400×800, the breadcrumb's last crumb ("Ash Blossom & Joyous Spring") is truncated with an ellipsis rather than wrapping the header to a second line.
- [ ] With the console open at 400×800, reload the page: no `[essentia] site-header wraps to …` warning appears and no console error appears.
- [ ] Resize the window from 401px down to 400px and back while watching the console: the wrap warning never appears at any width above 400px (the guard is a no-op there by design).
- [ ] Temporarily shrink the window well below 400px (e.g. 300px): if the header genuinely wraps, confirm a `[essentia] site-header wraps to N rows at …px` warning appears in the console and the page keeps working (no thrown error, nothing broken).
- [ ] Run `cd website && npm run build` from a terminal: confirm the build completes and exits 0 whether or not a `[warn] site-header may wrap …` line is printed (it should NOT print in the current checkout, since the shipped budget fits).
- [ ] Visit `/` and `/archetypes/burning-abyss/` at 400×800: both hold a single header row, same as the card page above.

## T7 catalog-hero-tightening

- [ ] `cd website && npm run build && node scripts/serve-dist.mjs`, open `/archetypes/nekroz/` at 1440px: the prose and the hero art read as one row capped well short of the browser edges, roughly centred on the page, with a visibly tighter gutter between them than before this change.
- [ ] At 1440px, the two columns keep their prior proportions — the prose column is still noticeably wider than the art column, just closer together.
- [ ] Resize down to 900px (the `64rem` stacked layout): the hero collapses to one column, the art still shows, capped at `24rem` wide and centred — unchanged from before this change.
- [ ] Resize down to 704px and 704.1px: the hero art is still visible on both sides of that boundary (this pass only removes it below 44rem / 704px, not at the 64rem stack point).
- [ ] Resize down to 390px (a phone width): the hero art disappears entirely — no broken image box, no leftover whitespace where it was — and the archetype name heading plus the first card in the gallery below are visible without excess scrolling.
- [ ] With a screen reader (or the accessibility tree inspector), confirm at 390px that the hidden hero art (`role="img"`, `tabindex="0"`) is not announced and not reachable by Tab — it should be fully removed from the accessibility tree, not just visually hidden.
- [ ] Repeat the 1440px and 390px checks on `/sections/non-archetype/non-archetype/` (the non-archetype hero shares the same CSS class) to confirm both hero routes moved together.
- [ ] Open the browser devtools console while loading `/archetypes/nekroz/` at both 1440px and 390px: no console errors other than the known, pre-existing CSP-violation message for the inert `--nav-tint` inline style (queued separately, not part of this ticket).

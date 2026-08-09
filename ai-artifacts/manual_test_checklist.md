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

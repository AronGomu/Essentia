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

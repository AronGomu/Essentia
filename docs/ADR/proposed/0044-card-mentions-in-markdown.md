# ADR 0044 — Card mentions link prose to the gallery hover preview

- Date: 2026-08-14
- Status: Proposed
- Scope: `website/src/lib/card-mentions.ts`, `markdown.ts`, `Markdown.astro`, `global.css`, docs/blog corpus

## Context

The hover preview is a single overlay in the shell (`CardHoverPreview.astro`) driven by three attributes any element may publish: `data-card-preview`, `data-card-keywords`, and an `href` to the card page. Only gallery tiles published them, so a card named in a doc, a blog post or a decklist was inert text — the reader had to leave the page to see the card.

Decklists were the worst case: an authored ```text fence, forty card names, zero links.

## Decision

### D1 — `[[Card Name]]` is the mention syntax

`[[Nekroz - Trishula]]` renders the printed name; `[[Nekroz - Trishula|the finisher]]` renders the author's words. It is the syntax card-game readers already know from bots, and it collides with nothing in the existing subset: the link rule needs `](`, which a mention never has.

### D2 — An unresolved mention fails the build

`lookupCardMention` throws on an unknown or ambiguous name. Degrading to plain text is the worse failure: the link silently disappears and no review catches it. The renderer already fails this way on an unsafe URL (ADR 0037's image ladder) — a mention is held to the same standard.

### D3 — Names resolve through printed names first, archetype titles second

Primary keys are the printed name and every historical name (`matchNames`), so a renamed card keeps resolving. The archetype title (`Burning Abyss - Graff` → `Graff`) is registered only where no printed name claims that key, and a title two archetypes both print becomes ambiguous rather than picking one. Matching normalizes case, quotes (`Maxx "C"` finds `Maxx “C”`) and dashes.

### D4 — Decklists are a ```decklist fence, not sniffed prose

Each line is `quantity name`; anything else must be one of a small allowlist of zone labels (`Main Deck`, `Sideboard`, `Extra Deck`, `Flex`, with an optional `(40 cards)`). A card name without a quantity, or an unrecognized line, throws. The alternative — treating any unquantified line as a heading — turns a typo into a silently dropped card, which is exactly the failure D2 rejects.

Basic lands are the one unlinked entry: they belong to no package, so they render as plain text rather than failing.

### D5 — The renderer stays catalog-free

`markdown.ts` takes a `resolveCard` callback; `Markdown.astro` supplies one built from the catalog, memoized per deployment base. The resolution rules stay unit-testable without loading the generated catalog, and the renderer keeps rendering any authored corpus in isolation.

### D6 — Code spans park before every other inline rule

Documenting the syntax requires printing `` `[[Graff]]` `` literally. Code spans previously parked after links, so markup rules ran over their contents. They now park first, which is what a code span means.

## Consequences

- Every mention and every decklist entry carries the same hover contract as a gallery tile; the overlay code is unchanged.
- Renaming a card keeps published prose working through `matchNames`, and deleting one breaks the build immediately.
- `docs/rules/DECKLISTS_ALPHA_0.1.md` was rewritten from nicknames (`Tour guide`, `Dd Crow`) to printed names. Nicknames are not a resolution rule; only archetype titles are.
- The 5% granularity of ADR 0037's image ladder has an analogue here: a mention prints the catalog's name, not the author's casing, unless display text is given.

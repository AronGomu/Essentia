# ADR 0040 — Cards relate through the names they print

- Date: 2026-08-13
- Status: Proposed
- Scope: `website/scripts/content/related.mjs`, `website/scripts/content/orchestrator.mjs`, `website/src/lib/catalog.ts`, `website/src/pages/cards/[id].astro`
- Review: `ai-artifacts/GRILL_2026_08_12_feedback_batch_3/round-1.html` Q4, `round-2.html` Q2, `round-3.html` Q1-Q3; supersedes ADR 0032 and ADR 0036

## Context

ADR 0032 derived an `interaction` relation by parsing constraints — subtype, colour,
supertype, mana value, quoted name — out of every rule-text clause carrying an action
keyword, then matching them against every other card. ADR 0036 made the two categories
disjoint.

The rule is quadratic and already visibly wrong. `Leviair the Sea Dragon` reads
`Summon … MV 4 or less`, which matches **41 of the other 49 cards**. Maxx "C" matches 21,
Stealth Kragen 20. Benchmarked on cloned corpora, total edges go 50 cards → 528,
200 → 8 856, 400 → 35 696, **800 → 143 328**. CPU is never the issue (162 ms at 800 cards);
the payload in `src/generated/catalog.ts` and in every card page is.

A pure-constraint match also answers a question nobody asked. "Every card in the set with mana
value 4 or less" is a search query, not a relationship.

Two further facts, measured on the live corpus:

- Archetype and card names in rule text are **always** curly-quoted:
  `Search 1 “Nekroz” Creature`, `Sacrifice 2 “Burning Abyss” Creatures`.
- All 37 quoted tokens across all 50 cards are self-references. No card currently names an
  archetype it does not belong to.

## Decision

1. The `interaction` relation and the entire constraint matcher are deleted.
2. The authored `archetype` relation is unchanged. It comes from `content/identities.json`,
   which is why `Tour Guide From the Underworld` — a non-archetype staple with
   `archetype: "burning-abyss", role: "support"` — lists all 13 Burning Abyss cards.
3. A new relation derives from **quoted names only**. For each distinct quoted token on a
   card, first match wins:
   1. the token occurs inside the card's own printed name → self-reference, no edge;
   2. the token equals a section's `namePattern` → archetype reference, unless it is the
      card's own archetype;
   3. the token matches another card's printed name on a word boundary → card reference;
   4. nothing matched → the build fails.
4. An archetype reference is **one** entry linking to that archetype's page with its card
   count — never one tile per member. This is what keeps growth linear.
5. Relations are stored and rendered in both directions: `references` on the naming card,
   `referencedBy` on everything named.
6. Rule 3.4 preserves the unknown-name build guard that `assertKnownNames` provided under
   ADR 0032. A misspelled `“Burning Abbys”` still fails the build.

## Consequences

- Edge count becomes one per quoted name per card — linear in corpus size and bounded by how
  many names are printed.
- On today's corpus the new relation renders **nothing**: every quoted token is a
  self-reference. The feature is forward-looking, so its tests are fixture-based and the
  blocks stay hidden until a real edge exists.
- `Interacts with this card` disappears from card pages, replaced by `References` and
  `Referenced by`.
- `catalog.cards[].related.interaction` is removed from the catalog shape.
- A relationship now exists because the card text says so, not because a matcher inferred it.
  Making two cards related is an authoring act: print the name.

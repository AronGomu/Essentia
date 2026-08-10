# ADR 0032 — Related cards are derived at build time, in two categories

- Date: 2026-08-10
- Status: Proposed
- Scope: `website/scripts/content/related.mjs`, `website/scripts/content/orchestrator.mjs`, `website/src/lib/catalog.ts`, `website/src/pages/cards/[id].astro`

## Context

`relatedCards()` in `src/lib/catalog.ts` returns one flat list: cards sharing the current card's archetype, or printing one of that archetype's keywords, capped at 24, name-sorted. It answers "same family" and nothing else.

The gap it leaves is mechanical relatedness. `Tour Guide From the Underworld` reads:

```
(1 - Triggered Hard) On Enter — Summon 1 Fiend MV 1 Creature from Hand or Deck.
```

Every Burning Abyss creature is a Fiend with MV 1, so every one of them is a card Tour Guide can actually fetch. Nothing in the catalog says so, and a reader has to know the subtype table to see it.

The site is statically built: `npm run build` runs `scripts/build-content.mjs` once and every page is emitted from the generated catalog. "Cache it" therefore means "compute it in the content build", not "memoise at request time" — there are no requests.

## Decision

**1. Two categories, computed in the content build, embedded in `catalog.ts`.** Each card gains `related: { archetype: string[]; interaction: string[] }`, holding stable ids, name-sorted, uncapped. `catalog.schemaVersion` goes 10 → 11. No separate cache file: the catalog is already the build's single generated artifact, already invalidated by every card source hash, and a second file would be a second thing to keep in step.

**2. Category 1 — archetype — is the printed name, not the field.** For a card whose `archetype` is `a`, every other card whose `name` contains section `a`'s `namePattern` (`website/content/sections.json`), quote-normalised, case-insensitive. This is the rule the feedback states: "every card whose name contains the same archetype name".

**3. Category 2 — interaction — is derived from rule text against closed vocabularies.** For each clause (`ruleTextPlain` split on `.`, `;`, `—`):

- The clause counts **only** if it contains one of the card's own keywords whose registry `category` is `action` or `cost-procedure`. This is what stops an Xyz material line (`2 Creatures MV 1`) from relating every MV-1 creature to every Xyz card: a material line names no action.
- Constraints read from the clause: `subtype` (from the catalog's own `subType` vocabulary, never a hardcoded race list), `name` (any `“…”` run), `color` (`white|blue|black|red|green`), `supertype` (`Ritual|Xyz|Fusion|Synchro|Link|Trap`), `mv` (`MV <int>`, `MV X`, with optional `or less` / `or more`).
- A candidate matches a clause when it satisfies **every** constraint kind present in that clause. The union over clauses, minus the card itself, is the list.

**4. An unresolvable token fails the build.** Two cases, both deterministic:

- a quoted run matching neither a section `namePattern` nor any card `name` as a substring;
- an `MV` token followed by anything other than an integer, `X`, or the word `meets`.

`meets` is explicitly legal because three Nekroz ritual cards read `whose MV meets its Ritual cost`. A reference that resolves to *zero cards* is legal too — the archetype may simply have no printed member yet.

**5. Presentation caps at 12 per category.** The archetype category links to its section page when truncated. The interaction category shows a count, because there is no listing page for "cards a Fiend-fetcher can fetch".

## Rejected

**Hand-authored interaction lists.** Perfect accuracy, and a manual step on every card forever. The cube is 50 cards today and grows by archetype.

**Derived plus an override file.** The best output, and two mechanisms that can disagree. Revisit if derivation proves wrong on a real card rather than a hypothetical one.

**Runtime computation.** Nothing to compute at runtime on a static site.

## Consequences

- `relatedCards()` and `RelatedInput` are removed from `src/lib/catalog.ts`; `tests/unit/related-cards.test.ts` is rewritten against the catalog field.
- Rule-text wording now has a build-visible effect: a typo inside `“ ”` fails `npm run build`. That is the intended trade — the same closed-taxonomy discipline the keyword registry already imposes.
- `docs/CONTEXT.md`'s related-cards sentence is updated to name both categories.

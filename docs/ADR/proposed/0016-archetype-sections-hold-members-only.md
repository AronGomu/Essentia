# ADR 0016 — Archetype sections hold members and linked support cards only

- Date: 2026-08-07
- Status: Proposed — accepted for implementation by `ai-artifacts/PLAN_2026_08_07_website-feedback-pass.md` (T15, T21)
- Scope: identity registry, website section membership, card page relatedness

## Context

`docs/CONTEXT.md` and ADR-era practice already separate two ideas:

- **membership**, which mirrors the in-game rule — a card belongs to an archetype when its printed name carries the archetype string;
- **bucket**, an authored browse convenience that also swept in support cards whose names lack the string (Tour Guide, Manju, Senju, Preparation of Rites, Beatrice, …).

`resolveSection()` in `website/scripts/content/identity.mjs` used the bucket, so `/archetypes/burning-abyss/` listed 7 cards whose names never say "Burning Abyss". Website feedback rejects that: an archetype page should list the archetype, not its supporting cast.

Deleting the support relationship entirely is wrong too — the same feedback asks the card page to relate cards by archetype *and* by archetype keyword, which is exactly what support cards are for.

## Decision

1. Section membership becomes `role === 'member' || (role === 'support' && linked === true)`.
2. `website/content/identities.json` gains an optional `linked` boolean, valid only on `role: "support"` entries. The build fails when it appears on a member or a staple.
3. No card is linked by default. All 14 current support entries move to the non-archetype section.
4. Those cards keep their authored `archetype` and `role: "support"`. The value stops driving gallery placement and starts driving relatedness only.
5. Card-page relatedness spans: same authored `archetype`, or printing a keyword whose registry entry names that archetype.

## Consequences

- Archetype galleries shrink to their printed-name members and read as the archetype does in play.
- The non-archetype section grows; it is now the home of every staple and every unlinked support card.
- A support card is still one click from its archetype through the related-cards list on any member's page.
- `linked: true` remains available for the case the rule cannot express — a support card so tied to an archetype that browsing without it is wrong. Using it is a deliberate, reviewed act.
- `section.count`, `section.cardIds`, and `section.latestModified` all shift on the next build. Card routes (`/cards/<id>/`) are unaffected.

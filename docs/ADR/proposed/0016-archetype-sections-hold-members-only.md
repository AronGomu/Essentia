# ADR 0016 — Archetype sections hold members and linked support cards only

- Date: 2026-08-07
- Status: Proposed — accepted for implementation by `ai-artifacts/archive/PLAN_2026_08_07_website-feedback-pass.md` (T15, T21); affinity rule amended by `ai_artefacts/PLAN_2026_08_13_feedback_follow_up.md` (T3)
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
3. No card is linked by default. Unlinked support entries move to the non-archetype section.
4. Gallery placement does not itself erase authored affinity: a true support card may keep `archetype` + `role: "support"` for relatedness. Affinity is optional, reviewed metadata — not an automatic property of every generic card that helps an archetype.
5. A generic card judged to have no archetype affinity uses `archetype: null`, `role: "staple"`. Feedback follow-up applies that classification to Tour Guide From the Underworld, Preparation of Rites, Manju of the Ten Thousand Hands, and Senju of the Thousand Hands; exact live values remain in `website/content/identities.json`.
6. Card-page Same archetype relatedness exists only when authored `archetype` remains non-null.

## Consequences

- Archetype galleries shrink to their printed-name members and read as the archetype does in play.
- The non-archetype section grows; it is now the home of every staple and every unlinked support card.
- A support card with retained affinity stays one click from its archetype through related cards. A staple has no such link.
- `linked: true` remains available for the case the rule cannot express — a support card so tied to an archetype that browsing without it is wrong. Using it is a deliberate, reviewed act.
- `section.count`, `section.cardIds`, and `section.latestModified` all shift on the next build. Card routes (`/cards/<id>/`) are unaffected.

# ADR 0036 — Related lists are disjoint; the band owns the page width

- Date: 2026-08-12
- Status: Proposed
- Scope: `website/scripts/content/related.mjs`, `CardGallery.astro`, card detail layout
- Review: `ai-artifacts/GRILL_2026_08_12_feedback_batch_2/round-1.html` Q6; extends ADR 0032

## Context

ADR 0032 derives two related-card categories per card: `archetype` (same printed name pattern) and `interaction` (targets this card's own rule text can act on). They were computed independently, so an archetype member that fetches its own archetype printed the same gallery twice — once under `Same archetype`, once under `Interacts with this card`.

Both galleries also rendered the `New` badge, which is meaningful on a section grid and noise inside a card page, and both sat inside the narrow `.card-transcription` column while the card render stayed sticky beside them.

## Decision

1. `interaction` excludes every id already in the same card's `archetype` list. Dedupe happens in derivation, not in the page, so every consumer of the catalog sees the same disjoint data.
2. Direction is fixed: `archetype` wins. It is computed first; its ids are subtracted from `interaction`.
3. `CardGallery` gains `showNewBadge`, default `true`. The card page passes `false`; section and home grids are unchanged.
4. Related sections leave `.card-transcription` and become a sibling `.related-band` after `.card-detail`. The band background is full-bleed (`100vw`, negative inline margin); its content stays inside the `88rem` page shell.
5. The scroll "bind" needs no JavaScript: `position: sticky` on `.render-column` already releases at the end of `.card-detail`, so moving the related sections out of that block makes the render and the text scroll away together, exactly as asked.

## Consequences

- Cards inside an archetype that fetch their own archetype lose those entries from `Interacts with this card`. That list can now be empty where it was previously a duplicate — intended.
- Archetype **support** cards (`archetypeRole: "support"`, e.g. `Tour Guide From the Underworld`) carry a full `archetype` list too, so their same-archetype fetch targets are subtracted from `interaction` as well. Those cards still appear once on the page, under `Same archetype`.
- Related galleries get more columns (6 from 90rem) because they own the full shell width.
- `src/generated/catalog.ts` must be regenerated; `npm run content:check` is the gate.

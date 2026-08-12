# ADR 0035 — The hover preview overlays the hovered card at 75vh

- Date: 2026-08-12
- Status: Proposed
- Scope: `website/src/lib/hover-placement.ts`, `CardHoverPreview.astro`, card detail render column
- Review: `ai-artifacts/GRILL_2026_08_12_feedback_batch_2/round-1.html` Q4, Q5

## Context

The hover preview was a fixed 320 × 448 box placed **beside** the hovered tile, optionally with a 320px rulings column beside that. Two costs: a card-width of screen is reserved for something that only exists on hover, and the preview is barely larger than the tile it explains.

Card pixel ceiling, for the record: canonical MSE render is 750 × 1046, the `display` webp tier is 750 px, the print master is 1500 × 2092. There is no 1920 px source, so "as close to full size as possible" is bounded by 1500 px, and only the print master reaches it.

## Decision

### D1 — Overlay, centred on the tile

- Preview height = `min(0.75 × viewport height, width-constrained height)`; width follows the render's exact ratio, `1046 / 750`.
- Position: centred on the tile's centre, then clamped inside the viewport with a 16px margin.
- The preview keeps `pointer-events: none`, so it can sit on top of the tile without stealing the hover. The hover zone stays the tile.

### D2 — Rulings float outside the overlay

The rulings column no longer shares a flex row with the render. It is absolutely positioned against the overlay box, on the side with more free space, and dropped when neither side has 320px.

### D3 — The card page render fills its column, capped at 40rem

`width: min(100%, 25rem)` is replaced by `width: 100%; max-width: 40rem`. 40rem = 640px, which stays near 1:1 against the 750px display tier at DPR 1.

### D4 — "Full size" means the print master

A `Show full size` link under the render opens `card.images.print.url` — the 1500 × 2092 PNG that already ships. No new image tier is generated: a `detail` tier would add ~35MB of derivatives to serve one page each.

## Consequences

- Preview is ~2.4× taller than before and no layout space is reserved for it.
- `PreviewRect` gains a required `width`; `CARD_WIDTH` / `PREVIEW_HEIGHT` are gone. `npm run check` catches any missed call site.
- On displays at DPR 2 the 640px-wide render is upscaled from 750px source. The full-size link is the escape hatch; raising the display tier is a separate decision.
- Rulings can be dropped on narrow viewports. That was already true.

export interface PreviewRect {
  left: number;
  right: number;
  top: number;
  height: number;
}

export interface Viewport {
  width: number;
  height: number;
}

export interface PreviewPlacement {
  left: number;
  top: number;
  /** rulings render to the left of the card render */
  rulingsLeft: boolean;
  /** false when neither side fits and the rulings column must be dropped */
  showRulings: boolean;
}

export const PREVIEW_GAP = 16;
export const CARD_WIDTH = 320;
export const RULINGS_WIDTH = 320;
export const PREVIEW_HEIGHT = 448;

export function placeHoverPreview(
  rect: PreviewRect,
  viewport: Viewport,
  hasRulings: boolean,
): PreviewPlacement {
  const spaceRight = viewport.width - rect.right - PREVIEW_GAP;
  const spaceLeft = rect.left - PREVIEW_GAP;

  const fullWidth = hasRulings
    ? CARD_WIDTH + PREVIEW_GAP + RULINGS_WIDTH
    : CARD_WIDTH;

  let left: number;
  let rulingsLeft: boolean;
  let showRulings: boolean;

  if (spaceRight >= fullWidth) {
    left = rect.right + PREVIEW_GAP;
    rulingsLeft = false;
    showRulings = hasRulings;
  } else if (spaceLeft >= fullWidth) {
    left = rect.left - PREVIEW_GAP - fullWidth;
    rulingsLeft = true;
    showRulings = hasRulings;
  } else {
    showRulings = false;
    const cardOnlyWidth = CARD_WIDTH;
    if (spaceRight >= cardOnlyWidth) {
      left = rect.right + PREVIEW_GAP;
      rulingsLeft = false;
    } else if (spaceLeft >= cardOnlyWidth) {
      left = rect.left - PREVIEW_GAP - cardOnlyWidth;
      rulingsLeft = true;
    } else {
      left = Math.max(PREVIEW_GAP, viewport.width - CARD_WIDTH - PREVIEW_GAP);
      rulingsLeft = false;
    }
  }

  const top = Math.min(
    Math.max(PREVIEW_GAP, rect.top + rect.height / 2 - PREVIEW_HEIGHT / 2),
    Math.max(PREVIEW_GAP, viewport.height - PREVIEW_HEIGHT - PREVIEW_GAP),
  );

  return { left, top, rulingsLeft, showRulings };
}

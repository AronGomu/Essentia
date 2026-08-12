export interface PreviewRect {
  left: number;
  right: number;
  top: number;
  width: number;
  height: number;
}

export interface Viewport {
  width: number;
  height: number;
}

export interface PreviewPlacement {
  left: number;
  top: number;
  width: number;
  height: number;
  /** rulings render to the left of the card render */
  rulingsLeft: boolean;
  /** false when neither side fits and the rulings column must be dropped */
  showRulings: boolean;
}

export const PREVIEW_GAP = 16;
export const RULINGS_WIDTH = 320;
/** Canonical render is 750 × 1046, so the preview keeps that exact ratio. */
export const PREVIEW_ASPECT = 1046 / 750;
export const VIEWPORT_HEIGHT_FRACTION = 0.75;

export function placeHoverPreview(
  rect: PreviewRect,
  viewport: Viewport,
  hasRulings: boolean,
): PreviewPlacement {
  const maxHeight = viewport.height * VIEWPORT_HEIGHT_FRACTION;
  const maxWidth = viewport.width - PREVIEW_GAP * 2;
  const height = Math.min(maxHeight, maxWidth * PREVIEW_ASPECT);
  const width = height / PREVIEW_ASPECT;

  const clamp = (value: number, size: number, extent: number) =>
    Math.max(
      PREVIEW_GAP,
      Math.min(value, Math.max(PREVIEW_GAP, extent - size - PREVIEW_GAP)),
    );

  const left = clamp(
    rect.left + rect.width / 2 - width / 2,
    width,
    viewport.width,
  );
  const top = clamp(
    rect.top + rect.height / 2 - height / 2,
    height,
    viewport.height,
  );

  const spaceRight = viewport.width - (left + width) - PREVIEW_GAP;
  const spaceLeft = left - PREVIEW_GAP;
  const rulingsLeft = spaceLeft > spaceRight;
  const showRulings =
    hasRulings && Math.max(spaceLeft, spaceRight) >= RULINGS_WIDTH;

  return { left, top, width, height, rulingsLeft, showRulings };
}

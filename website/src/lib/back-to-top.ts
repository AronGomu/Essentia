/** Pixels of scroll after which returning to the top is worth a control. */
export const BACK_TO_TOP_THRESHOLD = 480;

/** True once the visitor is far enough down that the control earns its place. */
export function shouldShowBackToTop(
  scrollY: number,
  threshold: number = BACK_TO_TOP_THRESHOLD,
): boolean {
  return Number.isFinite(scrollY) && scrollY >= threshold;
}

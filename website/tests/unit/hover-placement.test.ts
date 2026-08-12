import { describe, expect, it } from 'vitest';
import {
  placeHoverPreview,
  PREVIEW_ASPECT,
  PREVIEW_GAP,
  RULINGS_WIDTH,
  VIEWPORT_HEIGHT_FRACTION,
} from '../../src/lib/hover-placement';

describe('placeHoverPreview', () => {
  it('sizes the preview to 75% of viewport height', () => {
    const result = placeHoverPreview(
      { left: 100, right: 300, top: 200, width: 200, height: 280 },
      { width: 1600, height: 900 },
      false,
    );
    expect(result.height).toBe(900 * VIEWPORT_HEIGHT_FRACTION);
    expect(result.width).toBeCloseTo(result.height / PREVIEW_ASPECT, 1);
  });

  it('centres the preview on the tile', () => {
    const result = placeHoverPreview(
      { left: 700, right: 900, top: 400, width: 200, height: 280 },
      { width: 1600, height: 900 },
      false,
    );
    expect(result.left + result.width / 2).toBeCloseTo(800, 0);
    expect(result.top + result.height / 2).toBeCloseTo(540, 0);
  });

  it('clamps into the viewport', () => {
    const result = placeHoverPreview(
      { left: 0, right: 120, top: 0, width: 120, height: 160 },
      { width: 1600, height: 900 },
      false,
    );
    expect(result.left).toBeGreaterThanOrEqual(PREVIEW_GAP);
    expect(result.top).toBeGreaterThanOrEqual(PREVIEW_GAP);
    expect(result.left + result.width).toBeLessThanOrEqual(1600 - PREVIEW_GAP);
    expect(result.top + result.height).toBeLessThanOrEqual(900 - PREVIEW_GAP);
  });

  it('shrinks to fit a narrow viewport', () => {
    const result = placeHoverPreview(
      { left: 100, right: 220, top: 400, width: 120, height: 160 },
      { width: 320, height: 1200 },
      false,
    );
    expect(result.width).toBeLessThanOrEqual(320 - 2 * PREVIEW_GAP);
    expect(result.height).toBeCloseTo(result.width * PREVIEW_ASPECT, 1);
  });

  it('floats rulings on the side with room', () => {
    const result = placeHoverPreview(
      { left: 20, right: 180, top: 400, width: 160, height: 200 },
      { width: 1600, height: 900 },
      true,
    );
    expect(result.showRulings).toBe(true);
    expect(result.rulingsLeft).toBe(false);
  });

  it('flips rulings left when the right is short', () => {
    const result = placeHoverPreview(
      { left: 1420, right: 1580, top: 400, width: 160, height: 200 },
      { width: 1600, height: 900 },
      true,
    );
    expect(result.rulingsLeft).toBe(true);
  });

  it('drops rulings when neither side fits', () => {
    const result = placeHoverPreview(
      { left: 400, right: 500, top: 400, width: 100, height: 100 },
      { width: 900, height: 900 },
      true,
    );
    const spaceLeft = result.left - PREVIEW_GAP;
    const spaceRight = 900 - (result.left + result.width) - PREVIEW_GAP;
    expect(Math.max(spaceLeft, spaceRight)).toBeLessThan(RULINGS_WIDTH);
    expect(result.showRulings).toBe(false);
  });

  it('ignores rulings geometry when there are none', () => {
    const result = placeHoverPreview(
      { left: 100, right: 300, top: 100, width: 200, height: 200 },
      { width: 1600, height: 900 },
      false,
    );
    expect(result.showRulings).toBe(false);
  });

  it('never returns negative left or top', () => {
    const result = placeHoverPreview(
      { left: 100, right: 200, top: 0, width: 100, height: 10 },
      { width: 300, height: 640 },
      false,
    );
    expect(result.left).toBeGreaterThanOrEqual(0);
    expect(result.top).toBeGreaterThanOrEqual(0);
  });
});

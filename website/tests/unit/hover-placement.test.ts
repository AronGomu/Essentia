import { describe, expect, it } from 'vitest';
import { placeHoverPreview } from '../../src/lib/hover-placement';

describe('placeHoverPreview', () => {
  it('puts rulings right when the right fits', () => {
    const result = placeHoverPreview(
      { left: 100, right: 300, top: 100, height: 200 },
      { width: 1600, height: 900 },
      true,
    );
    expect(result.rulingsLeft).toBe(false);
    expect(result.showRulings).toBe(true);
    expect(result.left).toBe(316);
  });

  it('flips to the left when the right is short', () => {
    const result = placeHoverPreview(
      { left: 900, right: 1100, top: 100, height: 200 },
      { width: 1200, height: 900 },
      true,
    );
    expect(result.rulingsLeft).toBe(true);
    expect(result.showRulings).toBe(true);
    expect(result.left).toBe(228);
  });

  it('drops rulings when neither side fits', () => {
    const result = placeHoverPreview(
      { left: 380, right: 520, top: 0, height: 200 },
      { width: 900, height: 900 },
      true,
    );
    expect(result.showRulings).toBe(false);
    // Card-only still fits on the right, so the preview stays there.
    expect(result.rulingsLeft).toBe(false);
    expect(result.left).toBe(536);
  });

  it('falls back to the left when only the left fits card-only', () => {
    const result = placeHoverPreview(
      { left: 400, right: 600, top: 0, height: 200 },
      { width: 700, height: 900 },
      true,
    );
    expect(result.showRulings).toBe(false);
    expect(result.rulingsLeft).toBe(true);
    expect(result.left).toBe(64);
  });

  it('never returns a negative left', () => {
    // A viewport narrower than the card itself: neither side fits even
    // card-only, and the right-aligned fallback (300 - 320 - 16) is negative,
    // so the clamp is the only thing keeping the preview on screen. The old
    // 360px case exited on the first branch and never reached it.
    const result = placeHoverPreview(
      { left: 100, right: 200, top: 0, height: 10 },
      { width: 300, height: 640 },
      true,
    );
    expect(result.showRulings).toBe(false);
    expect(result.rulingsLeft).toBe(false);
    expect(result.left).toBe(16);
  });

  it('clamps top into the viewport', () => {
    const result = placeHoverPreview(
      { left: 100, right: 300, top: 5000, height: 200 },
      { width: 1600, height: 900 },
      false,
    );
    expect(result.top).toBe(900 - 448 - 16);
  });

  it('ignores rulings geometry when there are none', () => {
    const result = placeHoverPreview(
      { left: 100, right: 300, top: 100, height: 200 },
      { width: 700, height: 900 },
      false,
    );
    expect(result.showRulings).toBe(false);
    expect(result.left).toBe(316);
  });
});

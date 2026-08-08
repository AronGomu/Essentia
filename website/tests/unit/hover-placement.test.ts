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
  });

  it('never returns a negative left', () => {
    const result = placeHoverPreview(
      { left: 0, right: 20, top: 0, height: 10 },
      { width: 360, height: 640 },
      true,
    );
    expect(result.left).toBeGreaterThanOrEqual(16);
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

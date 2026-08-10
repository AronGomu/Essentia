import { describe, expect, it } from 'vitest';
import catalog from '../../src/generated/catalog';

describe('generated card images', () => {
  it('display tier is 750 wide', () => {
    expect(catalog.cards).not.toHaveLength(0);
    for (const card of catalog.cards)
      expect(card.images.display.width).toBe(750);
  });

  it('no card is draft resolution', () => {
    expect(catalog.cards).not.toHaveLength(0);
    for (const card of catalog.cards)
      expect(card.images.print.draftResolution).toBe(false);
  });

  it('render size matches the stylesheet', () => {
    expect(catalog.cards).not.toHaveLength(0);
    for (const card of catalog.cards) {
      expect(card.images.width).toBe(750);
      expect(card.images.height).toBe(1046);
    }
  });
});

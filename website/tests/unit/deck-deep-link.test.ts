import { describe, expect, it } from 'vitest';
import { deckIdFromHash } from '../../src/lib/decks';

describe('deckIdFromHash', () => {
  it('reads a deck id from the hash', () => {
    expect(deckIdFromHash('#deck-u1')).toBe('u1');
  });

  it('ignores an unrelated hash', () => {
    expect(deckIdFromHash('#section-two')).toBe(null);
  });

  it('ignores an empty hash', () => {
    expect(deckIdFromHash('')).toBe(null);
  });
});

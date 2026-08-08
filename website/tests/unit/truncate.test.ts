import { describe, expect, it } from 'vitest';
import { truncateAtWordBoundary } from '../../src/lib/text';
import { docDescription } from '../../src/lib/docs';

describe('truncateAtWordBoundary', () => {
  it('returns text that fits untouched, with no ellipsis', () => {
    expect(truncateAtWordBoundary('Short body.', 130)).toBe('Short body.');
  });

  it('returns text of exactly the limit untouched', () => {
    const text = 'x'.repeat(20);
    expect(truncateAtWordBoundary(text, 20)).toBe(text);
  });

  it('never cuts mid-word', () => {
    // The pre-fix `slice(0, 130)` produced `…Exile 0–3 “Burning Abys`.
    const text =
      'Whenever this creature dies, each opponent loses 1 life. Sacrifice: Exile 0–3 “Burning Abyss” cards from your Grave to draw that many cards.';
    const result = truncateAtWordBoundary(text, 130);
    expect(result.length).toBeLessThanOrEqual(131);
    expect(result.endsWith('…')).toBe(true);
    expect(result).not.toContain('Abys…');
    expect(text.startsWith(result.slice(0, -1))).toBe(true);
  });

  it('marks the cut with a single ellipsis and no dangling punctuation', () => {
    expect(truncateAtWordBoundary('alpha beta, gamma delta', 12)).toBe(
      'alpha beta…',
    );
  });

  it('drops a trailing em dash left at the cut', () => {
    expect(truncateAtWordBoundary('alpha beta — gamma', 13)).toBe(
      'alpha beta…',
    );
  });

  it('cuts hard when one word is longer than the whole limit', () => {
    expect(truncateAtWordBoundary('supercalifragilistic', 8)).toBe('supercal…');
  });

  it('returns an empty string for empty input', () => {
    expect(truncateAtWordBoundary('', 130)).toBe('');
  });
});

describe('description cuts across the site', () => {
  /**
   * `/docs/` and `/cards/` build their descriptions from different bodies but
   * must cut them the same way; the card page regressed precisely because it
   * had its own `slice()`.
   */
  it('cuts a doc body and a card body identically', () => {
    const body = `${'word '.repeat(60)}tail`;
    expect(docDescription(body)).toBe(
      truncateAtWordBoundary(body.replace(/\s+/g, ' ').trim(), 150),
    );
  });
});

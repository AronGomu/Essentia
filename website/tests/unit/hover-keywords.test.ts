import { describe, expect, it } from 'vitest';
import { essentiaKeywordsFor } from '../../src/lib/catalog';

describe('essentiaKeywordsFor', () => {
  it('returns Essentia keywords with rulings', () => {
    const result = essentiaKeywordsFor({ keywords: ['Bounce', 'Flying'] });
    expect(result).toHaveLength(1);
    expect(result[0]!.term).toBe('Bounce');
    expect(result[0]!.definition.length).toBeGreaterThan(0);
  });

  it('drops Magic evergreens', () => {
    expect(essentiaKeywordsFor({ keywords: ['Flying', 'Trample'] })).toEqual(
      [],
    );
  });

  it('preserves printed order', () => {
    const result = essentiaKeywordsFor({ keywords: ['Search', 'Bounce'] });
    expect(result.map((entry) => entry.term)).toEqual(['Search', 'Bounce']);
  });

  it('ignores unknown terms', () => {
    expect(essentiaKeywordsFor({ keywords: ['Not A Keyword'] })).toEqual([]);
  });
});

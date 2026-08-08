import { describe, expect, it } from 'vitest';
import { previewKeywordsFor } from '../../src/lib/catalog';

describe('previewKeywordsFor', () => {
  it('returns preview keywords with rulings', () => {
    const result = previewKeywordsFor({ keywords: ['Bounce', 'Flying'] });
    expect(result).toHaveLength(1);
    expect(result[0]!.term).toBe('Bounce');
    expect(result[0]!.definition.length).toBeGreaterThan(0);
  });

  it('drops Magic evergreens', () => {
    expect(previewKeywordsFor({ keywords: ['Flying', 'Trample'] })).toEqual([]);
  });

  it('preserves printed order', () => {
    const result = previewKeywordsFor({ keywords: ['Search', 'Bounce'] });
    expect(result.map((entry) => entry.term)).toEqual(['Search', 'Bounce']);
  });

  it('ignores unknown terms', () => {
    expect(previewKeywordsFor({ keywords: ['Not A Keyword'] })).toEqual([]);
  });

  it('shows Mill N in the hover box', () => {
    const result = previewKeywordsFor({ keywords: ['Mill N'] });
    expect(result).toHaveLength(1);
    expect(result[0]!.term).toBe('Mill N');
  });

  it('keeps Counter out of the hover box', () => {
    expect(previewKeywordsFor({ keywords: ['Counter'] })).toEqual([]);
  });
});

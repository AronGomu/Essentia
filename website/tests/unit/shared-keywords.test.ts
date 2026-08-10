import { describe, expect, it } from 'vitest';
import { normalizeKeyword, splitComposite } from '../../shared/keywords.mjs';
import { loadKeywordRegistry } from '../../scripts/content/keywords.mjs';

describe('shared keyword normalisation', () => {
  it('shared normalizeKeyword folds X', () => {
    expect(normalizeKeyword('Detach X')).toBe('Detach N');
  });

  // `.script/lint_mse_card_style.py` QUANTITY accepts an inclusive range on
  // either dash with X legal at either bound; the site has to fold the same
  // shapes or the lint passes card text the build then rejects.
  it('shared normalizeKeyword folds an inclusive range', () => {
    expect(normalizeKeyword('Mill 1-4')).toBe('Mill N');
    expect(normalizeKeyword('Mill 1 - 4')).toBe('Mill N');
    expect(normalizeKeyword('Mill 1–4')).toBe('Mill N');
    expect(normalizeKeyword('Detach 1-X')).toBe('Detach N');
  });

  it('shared splitComposite splits on and', () => {
    expect(splitComposite('Detach 1 and Mill 3')).toEqual([
      'Detach 1',
      'Mill 3',
    ]);
  });

  it('build and runtime agree', async () => {
    const registry = await loadKeywordRegistry();
    for (const term of registry.keys()) {
      expect(normalizeKeyword(term)).toBe(term);
    }
  });
});

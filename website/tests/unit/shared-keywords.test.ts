import { describe, expect, it } from 'vitest';
import { normalizeKeyword, splitComposite } from '../../shared/keywords.mjs';
import { loadKeywordRegistry } from '../../scripts/content/keywords.mjs';

describe('shared keyword normalisation', () => {
  it('shared normalizeKeyword folds X', () => {
    expect(normalizeKeyword('Detach X')).toBe('Detach N');
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

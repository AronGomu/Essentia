import { describe, expect, it } from 'vitest';
import { catalog, sectionHasNewCards } from '../../src/lib/catalog';

describe('sectionHasNewCards', () => {
  it('flags a section holding a newest-release card', () => {
    expect(sectionHasNewCards(catalog.sections[0]!)).toBe(true);
  });

  it('is false for an empty section', () => {
    expect(sectionHasNewCards({ cardIds: [] })).toBe(false);
  });

  it('is false for unknown ids', () => {
    expect(sectionHasNewCards({ cardIds: ['does-not-exist'] })).toBe(false);
  });
});

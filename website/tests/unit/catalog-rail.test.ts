import { describe, expect, it } from 'vitest';
import {
  RAIL_STORAGE_KEY,
  normalizeRailState,
  toggleRailState,
} from '../../src/lib/catalog-rail';

describe('normalizeRailState', () => {
  it('defaults to expanded when unset', () => {
    expect(normalizeRailState(null)).toBe('expanded');
  });

  it('defaults to expanded on garbage', () => {
    expect(normalizeRailState('yes')).toBe('expanded');
  });

  it('reads the collapsed marker', () => {
    expect(normalizeRailState('collapsed')).toBe('collapsed');
  });
});

describe('toggleRailState', () => {
  it('toggles expanded to collapsed', () => {
    expect(toggleRailState('expanded')).toBe('collapsed');
  });

  it('toggles collapsed to expanded', () => {
    expect(toggleRailState('collapsed')).toBe('expanded');
  });
});

describe('RAIL_STORAGE_KEY', () => {
  it('exports the prefixed storage key', () => {
    expect(RAIL_STORAGE_KEY).toBe('essentia.v1.catalog-rail');
  });
});

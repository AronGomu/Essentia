import { describe, expect, it } from 'vitest';
import {
  compareSemanticVersion,
  selectCurrentVersion,
} from '../../scripts/publication-order.mjs';

const version = (
  stage: string,
  stageRank: number,
  value: string,
  packageId = `${stage}-${value}`,
) => ({
  stage,
  stageRank,
  version: value,
  releasedOn: '2026-07-31',
  packageId,
});

describe('publication order', () => {
  it('uses lifecycle rank before semantic version', () => {
    expect(
      selectCurrentVersion([
        version('alpha', 2, '9.0'),
        version('beta', 4, '1.0'),
      ]).stage,
    ).toBe('beta');
  });

  it('uses semantic version inside one lifecycle', () => {
    expect(
      selectCurrentVersion([
        version('beta', 4, '0.9'),
        version('beta', 4, '0.10'),
      ]).version,
    ).toBe('0.10');
    expect(compareSemanticVersion('1.0', '1.0.1')).toBeLessThan(0);
  });

  it('rejects duplicate lifecycle/version entries', () => {
    expect(() =>
      selectCurrentVersion([
        version('alpha', 2, '0.1', 'one'),
        version('alpha', 2, '0.1', 'two'),
      ]),
    ).toThrow('Duplicate lifecycle/version: alpha:0.1');
  });
});

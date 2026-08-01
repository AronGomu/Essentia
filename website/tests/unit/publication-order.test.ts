import { describe, expect, it } from 'vitest';
import {
  compareLifecycleVersion,
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
  it('uses lifecycle rank before version string', () => {
    expect(
      selectCurrentVersion([
        version('alpha', 1, 'Alpha_9.0'),
        version('beta', 2, 'Beta_1.0'),
      ]).stage,
    ).toBe('beta');
  });

  it('uses numeric part inside one lifecycle', () => {
    expect(
      selectCurrentVersion([
        version('beta', 2, 'Beta_0.9'),
        version('beta', 2, 'Beta_0.10'),
      ]).version,
    ).toBe('Beta_0.10');
    expect(compareSemanticVersion('1.0', '1.0.1')).toBeLessThan(0);
    expect(compareLifecycleVersion('Alpha_0.1', 'Alpha_0.2')).toBeLessThan(0);
  });

  it('rejects duplicate lifecycle/version entries', () => {
    expect(() =>
      selectCurrentVersion([
        version('alpha', 1, 'Alpha_0.1', 'one'),
        version('alpha', 1, 'Alpha_0.1', 'two'),
      ]),
    ).toThrow('Duplicate lifecycle/version: alpha:Alpha_0.1');
  });
});

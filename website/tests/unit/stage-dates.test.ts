import { describe, expect, it } from 'vitest';
import { stageDateIssues } from '../../scripts/content/shared.mjs';

const pkg = (
  id: string,
  stage: string,
  stageRank: number,
  releasedOn: string,
) => ({ id, stage, stageRank, releasedOn });

describe('stageDateIssues', () => {
  it('accepts one package', () => {
    expect(stageDateIssues([pkg('a', 'alpha', 1, '2026-08-01')])).toEqual([]);
  });

  it('accepts an empty catalog', () => {
    expect(stageDateIssues([])).toEqual([]);
  });

  it('accepts several packages sharing one stage date', () => {
    expect(
      stageDateIssues([
        pkg('a', 'alpha', 1, '2026-08-01'),
        pkg('b', 'alpha', 1, '2026-08-01'),
        pkg('c', 'beta', 2, '2026-09-01'),
      ]),
    ).toEqual([]);
  });

  it('rejects two dates inside one stage', () => {
    expect(
      stageDateIssues([
        pkg('a', 'alpha', 1, '2026-08-01'),
        pkg('b', 'alpha', 1, '2026-08-02'),
      ]),
    ).toEqual([
      'stage alpha has two release dates: a on 2026-08-01, b on 2026-08-02',
    ]);
  });

  it('rejects a later stage dated before an earlier one', () => {
    expect(
      stageDateIssues([
        pkg('a', 'alpha', 1, '2026-08-01'),
        pkg('b', 'beta', 2, '2026-07-01'),
      ]),
    ).toEqual([
      'stage beta (2026-07-01) is dated before the earlier stage alpha (2026-08-01)',
    ]);
  });

  it('accepts equal dates across adjacent stages', () => {
    expect(
      stageDateIssues([
        pkg('a', 'alpha', 1, '2026-08-01'),
        pkg('b', 'beta', 2, '2026-08-01'),
      ]),
    ).toEqual([]);
  });

  it('compares stages by rank, not by input order', () => {
    expect(
      stageDateIssues([
        pkg('c', 'release', 3, '2026-07-01'),
        pkg('a', 'alpha', 1, '2026-08-01'),
      ]),
    ).toEqual([
      'stage release (2026-07-01) is dated before the earlier stage alpha (2026-08-01)',
    ]);
  });

  it('guarantees the first stage-ranked package is also the newest', () => {
    const packages = [
      pkg('a', 'alpha', 1, '2026-08-01'),
      pkg('b', 'beta', 2, '2026-09-01'),
      pkg('c', 'release', 3, '2026-10-01'),
    ];
    expect(stageDateIssues(packages)).toEqual([]);
    const byStage = [...packages].sort((x, y) => y.stageRank - x.stageRank);
    const byDate = [...packages].sort((x, y) =>
      y.releasedOn.localeCompare(x.releasedOn),
    );
    expect(byStage[0]?.releasedOn).toBe(byDate[0]?.releasedOn);
    expect(byStage[0]?.id).toBe('c');
  });
});

import { describe, expect, it } from 'vitest';
import { formatDateNumeric } from '../../src/lib/catalog';
import { readingNavGroups } from '../../src/lib/reading-nav';

const posts = [
  {
    slug: 'newer',
    route: '/blog/newer/',
    title: 'Newer post',
    date: '2026-08-08',
  },
  {
    slug: 'older',
    route: '/blog/older/',
    title: 'Older post',
    date: '2026-08-01',
  },
];

const source = { docs: [], posts };

describe('formatDateNumeric', () => {
  it('renders day, month, year', () => {
    expect(formatDateNumeric('2026-08-08')).toBe('08/08/2026');
  });

  it('rejects a malformed date', () => {
    expect(() => formatDateNumeric('2026-8-8')).toThrow(
      'Invalid local date: 2026-8-8',
    );
  });
});

describe('blog rail', () => {
  it('is one flat group, newest first', () => {
    const groups = readingNavGroups('blog', source);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.items[0]?.route).toBe('/blog/newer/');
  });

  it('carries numeric dates as item meta', () => {
    const groups = readingNavGroups('blog', source);
    expect(groups[0]?.items[0]?.meta).toBe('08/08/2026');
  });

  it('has no group label', () => {
    const groups = readingNavGroups('blog', source);
    expect(groups[0]?.label).toBe('');
  });

  it('has no group when there are no posts', () => {
    expect(readingNavGroups('blog', { docs: [], posts: [] })).toEqual([]);
  });
});

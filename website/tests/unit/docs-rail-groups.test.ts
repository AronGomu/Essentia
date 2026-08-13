import { describe, expect, it } from 'vitest';
import { docsGroupStorageKey, isGroupOpen } from '../../src/lib/docs';

const currentRoute = '/docs/01-general-rules/01-zones/';
const activeGroup = {
  key: '01-general-rules',
  docs: [{ route: currentRoute }],
};
const otherGroup = {
  key: '02-card-types',
  docs: [{ route: '/docs/02-card-types/01-creatures/' }],
};

describe('docsGroupStorageKey', () => {
  it('namespaces the group', () => {
    expect(docsGroupStorageKey('01_general_rules')).toBe(
      'essentia.v1.docs-group.01_general_rules',
    );
  });
});

describe('isGroupOpen', () => {
  it('opens the group holding the current page over persisted closed state', () => {
    expect(isGroupOpen(activeGroup, currentRoute, false)).toBe(true);
  });

  it('keeps a persisted open group open away from it', () => {
    expect(isGroupOpen(otherGroup, currentRoute, true)).toBe(true);
  });

  it('closes a group with no persisted state by default', () => {
    expect(isGroupOpen(otherGroup, currentRoute, null)).toBe(false);
  });

  it('always opens the root group', () => {
    expect(
      isGroupOpen(
        { key: '', docs: [{ route: '/docs/' }] },
        currentRoute,
        false,
      ),
    ).toBe(true);
  });
});

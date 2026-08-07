import { describe, expect, it, vi } from 'vitest';
import { catalog, isLatestRelease } from '../../src/lib/catalog';

describe('isLatestRelease', () => {
  it('flags a card from the newest package', () => {
    expect(isLatestRelease({ packageId: catalog.releases[0]!.id })).toBe(true);
  });

  it('rejects a card from an older package', () => {
    expect(isLatestRelease({ packageId: 'alpha-OLD-0000-Alpha-0-1' })).toBe(
      false,
    );
  });

  it('is false on a draft-only catalog', async () => {
    vi.resetModules();
    vi.doMock('../../src/generated/catalog', () => ({
      default: {
        schemaVersion: 6,
        generatedAt: '2026-01-01T00:00:00.000Z',
        heroSectionSlug: '',
        sections: [],
        cards: [],
        cardVersions: [],
        releases: [],
        keywords: [],
        explanations: {},
        updates: [],
        docs: [],
        posts: [],
        publicationDiagnostics: [],
      },
    }));

    const draftCatalog = await import('../../src/lib/catalog');
    expect(draftCatalog.latestRelease).toBeNull();
    expect(draftCatalog.isLatestRelease({ packageId: 'anything' })).toBe(false);

    vi.doUnmock('../../src/generated/catalog');
    vi.resetModules();
  });
});

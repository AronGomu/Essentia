import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { catalog, cardsById } from '../../src/lib/catalog';

const content = (name: string) =>
  JSON.parse(
    readFileSync(new URL(`../../content/${name}`, import.meta.url), 'utf8'),
  );

describe('immutable publication graph', () => {
  it('keeps section presentation metadata in navigation order', () => {
    expect(
      content('sections.json')
        .sections.toSorted(
          (left: { order: number }, right: { order: number }) =>
            left.order - right.order,
        )
        .map((section: { label: string }) => section.label),
    ).toEqual([
      'Non-archetype',
      'Burning Abyss',
      'Shaddoll',
      'Nekroz',
      'Spellbook',
    ]);
  });

  it('uses source references rather than duplicated card names in identities', () => {
    const identities = content('identities.json');
    expect(identities.schemaVersion).toBe(3);
    expect(identities.cards.length).toBeGreaterThan(100);
    expect(
      identities.cards.every(
        (identity: Record<string, unknown>) =>
          typeof identity.stableId === 'string' &&
          Array.isArray(identity.sources) &&
          !Object.hasOwn(identity, 'name'),
      ),
    ).toBe(true);
  });

  it('publishes open/locked packages, never drafts', () => {
    expect(catalog.schemaVersion).toBe(5);
    expect(catalog.releases.length).toBeGreaterThan(0);
    expect(catalog.cards.length).toBeGreaterThan(0);
    expect(catalog.cardVersions.length).toBeGreaterThan(0);
    expect(
      catalog.releases.every((release) =>
        ['alpha', 'beta', 'release'].includes(release.stage),
      ),
    ).toBe(true);
    expect(
      catalog.releases.some((release) => release.setId === 'LOTA-0001'),
    ).toBe(true);
  });

  it('keeps current cards and versions internally linked', () => {
    expect(new Set(catalog.cards.map((card) => card.id)).size).toBe(
      catalog.cards.length,
    );
    for (const card of catalog.cards) {
      expect(cardsById.get(card.id)).toBe(card);
      expect(card.versionIds).toContain(card.packageId);
      expect(
        catalog.cardVersions.some(
          (version) =>
            version.id === card.id && version.packageId === card.packageId,
        ),
      ).toBe(true);
    }
  });

  it('exposes immutable release and card-version routes only', () => {
    for (const release of catalog.releases) {
      expect(release.route).toMatch(/^\/releases\/(alpha|beta|release)\//);
    }
    for (const version of catalog.cardVersions) {
      expect(version.versionRoute).toBe(
        `/cards/${version.id}/versions/${version.packageId}/`,
      );
    }
  });
});

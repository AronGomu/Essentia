import { describe, expect, it } from 'vitest';
import { catalog, toGalleryCard } from '../../src/lib/catalog';

const cardsById = new Map(catalog.cards.map((card) => [card.id, card]));
const releaseDates = new Set(
  catalog.releases.map((release) => release.releasedOn),
);

const sectionCards = (section: { cardIds: string[] }) =>
  section.cardIds.map((id) => {
    const card = cardsById.get(id);
    if (!card) throw new Error(`Section references an unknown card: ${id}`);
    return card;
  });

describe('section dates', () => {
  it('section date equals the release lock-in', () => {
    expect(catalog.sections.length).toBeGreaterThan(0);
    for (const section of catalog.sections) {
      const newest = sectionCards(section)
        .map((card) => card.releasedOn)
        .sort()
        .at(-1);
      expect(section.latestModified, `${section.slug} newest releasedOn`).toBe(
        newest,
      );
      expect(
        releaseDates.has(section.latestModified),
        `${section.slug} date ${section.latestModified} is a release lock-in`,
      ).toBe(true);
    }
  });

  it('no section date precedes a card modification claim', () => {
    for (const section of catalog.sections) {
      for (const card of sectionCards(section)) {
        expect(
          section.latestModified >= card.releasedOn,
          `${section.slug} shows ${section.latestModified} but ${card.id} released ${card.releasedOn}`,
        ).toBe(true);
      }
    }
  });

  it('gallery card carries its package', () => {
    const source = catalog.cards[0];
    expect(source).toBeDefined();
    const card = toGalleryCard(source!);
    expect(card.packageId).toBe(source!.packageId);
    expect(card.releasedOn).toBe(source!.releasedOn);
  });
});

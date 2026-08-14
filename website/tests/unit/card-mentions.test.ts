import { describe, expect, it } from 'vitest';
import {
  buildCardMentionIndex,
  findCardMention,
  lookupCardMention,
  mentionKey,
  type MentionSource,
} from '../../src/lib/card-mentions';

function source(name: string, overrides: Partial<MentionSource> = {}) {
  const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  return {
    name,
    matchNames: [name],
    route: `/cards/${id}/`,
    previewImage: `/renders/${id}.webp`,
    previewKeywords: [],
    ...overrides,
  } satisfies MentionSource;
}

describe('card mention index', () => {
  const cards = [
    source('Burning Abyss - Graff'),
    source('Nekroz - Trishula'),
    source('Maxx “C”'),
    source('Ash Blossom & Joyous Spring'),
  ];
  const index = buildCardMentionIndex(cards);

  it('resolves the printed name to page and preview attributes', () => {
    expect(lookupCardMention(index, 'Burning Abyss - Graff')).toEqual({
      name: 'Burning Abyss - Graff',
      href: '/cards/burning-abyss-graff/',
      preview: '/renders/burning-abyss-graff.webp',
      keywords: [],
    });
  });

  it('resolves an archetype card by its title alone', () => {
    expect(lookupCardMention(index, 'Trishula').name).toBe('Nekroz - Trishula');
  });

  it('accepts typed quotes, dashes and case', () => {
    expect(lookupCardMention(index, 'maxx "c"').name).toBe('Maxx “C”');
    expect(lookupCardMention(index, 'nekroz — trishula').name).toBe(
      'Nekroz - Trishula',
    );
    expect(mentionKey('  Nekroz –  Exa ')).toBe('nekroz - exa');
  });

  it('prefixes every URL with the deployment base', () => {
    const based = buildCardMentionIndex(cards, '/YGO-x-MTG/');
    expect(lookupCardMention(based, 'Graff')).toMatchObject({
      href: '/YGO-x-MTG/cards/burning-abyss-graff/',
      preview: '/YGO-x-MTG/renders/burning-abyss-graff.webp',
    });
  });

  it('carries the previewed keywords the hover box explains', () => {
    const withKeywords = buildCardMentionIndex([
      source('Nekroz - Exa', { previewKeywords: ['Ritual Summon', 'Search'] }),
    ]);
    expect(lookupCardMention(withKeywords, 'Exa').keywords).toEqual([
      'Ritual Summon',
      'Search',
    ]);
  });

  it('throws on an unknown name rather than dropping the link', () => {
    expect(() => lookupCardMention(index, 'Blue-Eyes')).toThrow(
      'Unknown card mention: Blue-Eyes',
    );
  });

  it('refuses a title two archetypes both print', () => {
    const shared = buildCardMentionIndex([
      source('Nekroz - Mirror'),
      source('Shaddoll - Mirror'),
    ]);
    expect(() => lookupCardMention(shared, 'Mirror')).toThrow(
      'Ambiguous card mention',
    );
    expect(lookupCardMention(shared, 'Nekroz - Mirror').href).toBe(
      '/cards/nekroz-mirror/',
    );
  });

  it('keeps a printed name ahead of another card’s alias', () => {
    const clash = buildCardMentionIndex([
      source('Graff'),
      source('Burning Abyss - Graff'),
    ]);
    expect(lookupCardMention(clash, 'Graff').href).toBe('/cards/graff/');
  });

  it('resolves a historical name to the card’s current page', () => {
    const renamed = buildCardMentionIndex([
      source('Nekroz - Valkyrus', {
        matchNames: ['Nekroz - Valkyrus', 'Nekroz - Valkyrus Prototype'],
      }),
    ]);
    expect(lookupCardMention(renamed, 'Nekroz - Valkyrus Prototype').name).toBe(
      'Nekroz - Valkyrus',
    );
  });

  it('finds without throwing for callers that tolerate a miss', () => {
    expect(findCardMention(index, 'Swamp')).toBeNull();
    expect(findCardMention(index, 'Graff')?.name).toBe('Burning Abyss - Graff');
  });
});

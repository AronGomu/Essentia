import { describe, expect, it } from 'vitest';
import {
  applyColorOverride,
  buildTypeLine,
  classifyZone,
  normalizeOracle,
  parseCastingCost,
  parseSubtypes,
  parseSupertypes,
} from '../../scripts/content/fields.mjs';

describe('casting cost parsing', () => {
  it('reads mono-colour and generic costs', () => {
    expect(parseCastingCost('B', 'x')).toEqual({ colors: ['B'], manaValue: 1 });
    expect(parseCastingCost('2U', 'x')).toEqual({
      colors: ['U'],
      manaValue: 3,
    });
    expect(parseCastingCost('1W', 'x')).toEqual({
      colors: ['W'],
      manaValue: 2,
    });
  });

  it('counts every coloured pip toward mana value', () => {
    expect(parseCastingCost('GGUU', 'x')).toEqual({
      colors: ['U', 'G'],
      manaValue: 4,
    });
    expect(parseCastingCost('2WB', 'x')).toEqual({
      colors: ['W', 'B'],
      manaValue: 4,
    });
  });

  it('treats a hybrid pip as one mana of two colours', () => {
    expect(parseCastingCost('B/G', 'x')).toEqual({
      colors: ['B', 'G'],
      manaValue: 1,
    });
    expect(parseCastingCost('U/B', 'x')).toEqual({
      colors: ['U', 'B'],
      manaValue: 1,
    });
  });

  it('returns colourless zero for an absent or zero cost', () => {
    expect(parseCastingCost('', 'x')).toEqual({ colors: [], manaValue: 0 });
    expect(parseCastingCost('0', 'x')).toEqual({ colors: [], manaValue: 0 });
  });

  it('orders colours WUBRG regardless of written order', () => {
    expect(parseCastingCost('GW', 'x').colors).toEqual(['W', 'G']);
  });

  it('fails loudly on an unknown symbol', () => {
    expect(() => parseCastingCost('2Z', 'zed')).toThrow(
      /unsupported cost symbol/,
    );
  });
});

describe('type lines', () => {
  it('tokenizes supertypes and drops the Link rating qualifier', () => {
    expect(parseSupertypes('Link Lvl 4 Creature', 'x')).toEqual([
      'Link',
      'Creature',
    ]);
    expect(parseSupertypes('Tuner Synchro Creature', 'x')).toEqual([
      'Tuner',
      'Synchro',
      'Creature',
    ]);
  });

  it('rejects an unknown super type token', () => {
    expect(() => parseSupertypes('Wibble Creature', 'x')).toThrow(
      /unknown super type token/,
    );
  });

  it('builds a printed type line with an em dash', () => {
    expect(buildTypeLine('Xyz Creature', 'Human')).toBe('Xyz Creature — Human');
    expect(buildTypeLine('Sorcery', '')).toBe('Sorcery');
  });

  it('tokenizes subtypes', () => {
    expect(parseSubtypes('Human Warrior')).toEqual(['Human', 'Warrior']);
    expect(parseSubtypes('')).toEqual([]);
  });
});

describe('zone classification', () => {
  it('sends Fusion/Synchro/Xyz/Link creatures to the extra deck', () => {
    for (const marker of ['Fusion', 'Synchro', 'Xyz', 'Link'])
      expect(classifyZone([marker, 'Creature'])).toBe('extra');
  });

  it('keeps a spell that performs an extra-deck summon in the main deck', () => {
    // "Fusion Summon Sorcery" is cast from hand; only creatures live in the extra deck.
    expect(classifyZone(['Fusion', 'Summon', 'Sorcery'])).toBe('main');
    expect(classifyZone(['Ritual', 'Creature'])).toBe('main');
    expect(classifyZone(['Creature'])).toBe('main');
  });
});

describe('oracle normalization', () => {
  it('lowercases, strips diacritics and collapses whitespace', () => {
    expect(normalizeOracle('Éxile   the\nCard')).toBe('exile the card');
  });

  it('folds curly quotes to straight ones', () => {
    expect(normalizeOracle('Maxx “C”')).toBe('maxx "c"');
  });
});

describe('colour overrides', () => {
  const parsed = { colors: ['U'], manaValue: 2 };

  it('reports cost as the source when no override applies', () => {
    expect(applyColorOverride('some-card', parsed, new Map())).toEqual({
      colors: ['U'],
      colorSource: 'cost',
    });
  });

  it('replaces the parsed colours and records the override source', () => {
    const overrides = new Map([
      ['some-card', { colors: ['B'], reason: 'printed frame is black' }],
    ]);
    expect(applyColorOverride('some-card', parsed, overrides)).toEqual({
      colors: ['B'],
      colorSource: 'override',
    });
  });
});

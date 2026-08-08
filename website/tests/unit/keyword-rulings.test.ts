import { describe, expect, it } from 'vitest';
import {
  catalog,
  essentiaKeywordsFor,
  keywordsByTerm,
} from '../../src/lib/catalog';

const EXPECTED: Record<string, string> = {
  'Mill N':
    'Send N cards from the top of your Deck to the Grave. The quantity is always printed.',
  'Detach N':
    'Send N materials from this card to the Grave. Before a colon or semicolon it is a cost; after an event and em dash it is a mandatory triggered action.',
  Salvage: 'Return the indicated cards from your Grave to your Hand.',
  Bounce: "Return the indicated permanents to their owner's Hand.",
  'Slow Blink N Any Creature':
    "Exile N permanents. At the next end step, Return them onto the Field under their owner's control.",
  'Abyssal Curse':
    'If you control another creature not named “Burning Abyss”, this creature destroys itself.',
  Descent:
    'Alternative Cast: at any time you could cast a sorcery, if you have not cast or summoned a “Burning Abyss” creature this turn, you may cast this card from your Hand without paying its mana cost.',
  'Ritual Summon':
    'Put a Ritual creature onto the Field, paying the ritual cost stated by the Ritual Summon effect.',
  'Nekroz Recovery':
    'Activated Sorcery: if you control no creatures, Exile this card and 1 other “Nekroz” from the Grave; Search 1 non-Creature “Nekroz” Ritual Summon.',
  'After Attack or Block':
    'Event: the next time you gain priority after combat damage resolves.',
  Attach:
    'Move the indicated card from the stated zone to become material of the named Xyz creature, without destroying it.',
  Release:
    'Summon the indicated card from Exile onto the Field. Proper-summon rules apply.',
};

describe('keyword ruling wording', () => {
  it('matches the authored ruling wording', () => {
    for (const [term, definition] of Object.entries(EXPECTED)) {
      const keyword = keywordsByTerm.get(term);
      expect(keyword, `missing keyword for term "${term}"`).toBeDefined();
      expect(keyword?.definition).toBe(definition);
    }
  });

  it('keeps Nekroz Recovery archetype-scoped', () => {
    const keyword = keywordsByTerm.get('Nekroz Recovery');
    expect(keyword?.category).toBe('archetype');
    expect(keyword?.archetype).toBe('nekroz');
  });

  it('keeps every ruling within the schema', () => {
    for (const keyword of catalog.keywords) {
      expect(keyword.definition.length).toBeGreaterThanOrEqual(20);
      expect(keyword.definition.length).toBeLessThanOrEqual(400);
      expect(keyword.definition).toMatch(/^[^<>]+$/);
    }
  });

  it('serialises the updated Bounce ruling', () => {
    const rulings = essentiaKeywordsFor({ keywords: ['Bounce'] });
    expect(rulings[0]?.definition).toBe(EXPECTED.Bounce);
  });
});

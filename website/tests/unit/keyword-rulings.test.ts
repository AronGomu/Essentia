import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  catalog,
  previewKeywordsFor,
  keywordsByTerm,
  previewDefinitions,
  reminderDefinitions,
} from '../../src/lib/catalog';

/** Every route that renders card rule text through `<RichText definitions=…>`. */
const CARD_ROUTES = [
  '../../src/pages/cards/[id].astro',
  '../../src/pages/cards/[id]/versions/[package].astro',
] as const;

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
    const rulings = previewKeywordsFor({ keywords: ['Bounce'] });
    expect(rulings[0]?.definition).toBe(EXPECTED.Bounce);
  });
});

describe('reminderDefinitions', () => {
  it('Counter prints no card-text reminder', () => {
    expect(reminderDefinitions().has('Counter')).toBe(false);
  });

  it('Mill N still prints a card-text reminder', () => {
    expect(reminderDefinitions().has('Mill N')).toBe(true);
  });

  it('holds exactly the terms flagged reminder', () => {
    expect([...reminderDefinitions().keys()].sort()).toEqual(
      catalog.keywords
        .filter((keyword) => keyword.reminder)
        .map((keyword) => keyword.term)
        .sort(),
    );
  });
});

describe('every card route resolves reminders the same way', () => {
  // The card route and the version route render the *same* card. Building the
  // version route's definitions from the whole keyword list made
  // `/cards/effect-veiler/` print `Counter` bare while
  // `/cards/effect-veiler/versions/…/` appended a reminder to it.
  it.each(CARD_ROUTES)('%s uses reminderDefinitions()', (route) => {
    const source = readFileSync(new URL(route, import.meta.url), 'utf-8');
    expect(source).toContain('const ruleDefinitions = reminderDefinitions();');
  });

  it.each(CARD_ROUTES)('%s builds no map of its own', (route) => {
    const source = readFileSync(new URL(route, import.meta.url), 'utf-8');
    // The exact shape that regressed: `new Map(catalog.keywords.map(…))`.
    expect(source).not.toMatch(/new Map\(\s*catalog\.keywords/);
    expect(source).not.toMatch(/catalog\.keywords[\s\S]{0,80}definition/);
  });

  it.each(CARD_ROUTES)('%s passes that map to RichText', (route) => {
    const source = readFileSync(new URL(route, import.meta.url), 'utf-8');
    expect(source).toMatch(/definitions=\{ruleDefinitions\}/);
  });
});

describe('previewDefinitions', () => {
  it('holds exactly the terms flagged preview', () => {
    expect([...previewDefinitions().keys()].sort()).toEqual(
      catalog.keywords
        .filter((keyword) => keyword.preview)
        .map((keyword) => keyword.term)
        .sort(),
    );
  });

  it('is not the same set as origin === essentia', () => {
    // The mutation the published map used to survive: reverting the filter to
    // `origin === 'essentia'` left 522/522 green and `npm run build` at exit 0,
    // while 19 gallery links advertised `Mill N` the hover box could not find.
    const byOrigin = catalog.keywords
      .filter((keyword) => keyword.origin === 'essentia')
      .map((keyword) => keyword.term)
      .sort();
    expect([...previewDefinitions().keys()].sort()).not.toEqual(byOrigin);
    expect(previewDefinitions().has('Mill N')).toBe(true);
  });

  it('is the map the layout publishes', () => {
    const source = readFileSync(
      new URL('../../src/layouts/BaseLayout.astro', import.meta.url),
      'utf-8',
    );
    expect(source).toContain(
      'const keywordRulings = Object.fromEntries(previewDefinitions());',
    );
  });

  it('never previews a term that prints no reminder', () => {
    // `loadKeywordRegistry` enforces this upstream; the hover box and the
    // published-HTML gate both depend on it holding here too.
    for (const term of previewDefinitions().keys())
      expect(reminderDefinitions().has(term), term).toBe(true);
  });
});

import { describe, expect, it } from 'vitest';
import {
  cardKeywords,
  extractAbilityMetadata,
  extractSupertypeKeywords,
} from '../../scripts/content/keywords.mjs';
import {
  catalog,
  keywordsByTerm,
  previewDefinitions,
  previewKeywordsFor,
} from '../../src/lib/catalog';

/**
 * The eight rulings the user authored, verbatim from `feedback.md:10-19` with
 * only spelling and grammar corrected. Wording is load-bearing game-rules text:
 * change it here only when the authored source changes.
 */
const AUTHORED: Record<string, string> = {
  Resolution:
    'Effect when a non-permanent (Instant, Sorcery) card is resolving on the Stack.',
  Static:
    'Passive ability. Does not use the Stack. Active as soon as the card enters the required zone to take effect. Default zone is Field.',
  Triggered:
    'Ability is activated any time the condition is fulfilled after resolution of the trigger effect.',
  Activated:
    "Ability that you activate yourself when you have priority and timing. Sorcery means only activatable any time you can play a Sorcery. Flash is an MTG keyword: any time you have priority (even on the opponent's turn).",
  Soft: 'You can only use this ability once per turn on the Field. Other copies or new instances of the card (dies and reanimated) can activate or trigger the same ability.',
  Hard: 'You can use this ability of {Name of the Card} only once per turn. All other copies of the same card cannot activate or trigger their effect.',
  Linked:
    'All Soft abilities are grouped together. Same independently for Hard abilities. If one of the linked abilities is activated or triggered, all other abilities cannot be used this turn following the same Soft or Hard ruling.',
  Trap: 'Cannot be cast from Hand. Can only be Set face down.',
};

/** The seven that ride in the numbered italic ability prefix. `Trap` is a super type. */
const METADATA_TERMS = [
  'Resolution',
  'Static',
  'Triggered',
  'Activated',
  'Soft',
  'Hard',
  'Linked',
] as const;

const fixtureRegistry = new Map<string, { term: string; category: string }>(
  [
    ...METADATA_TERMS.map((term) => [term, 'ability-metadata'] as const),
    ['Trap', 'super-type'] as const,
    ['Summon', 'action'] as const,
    ['Target', 'action'] as const,
  ].map(([term, category]) => [term, { term, category }]),
);

describe('the eight authored ruling keywords', () => {
  it.each(Object.keys(AUTHORED))('%s is in the registry', (term) => {
    expect(keywordsByTerm.get(term), `missing keyword "${term}"`).toBeDefined();
  });

  it.each(Object.entries(AUTHORED))(
    '%s keeps the authored ruling',
    (term, definition) => {
      expect(keywordsByTerm.get(term)?.definition).toBe(definition);
    },
  );

  it.each(METADATA_TERMS)('%s is categorised as ability metadata', (term) => {
    expect(keywordsByTerm.get(term)?.category).toBe('ability-metadata');
  });

  it('Trap is a super-type keyword, not an ability keyword', () => {
    expect(keywordsByTerm.get('Trap')?.category).toBe('super-type');
  });

  it.each(Object.keys(AUTHORED))(
    '%s is published to the hover island',
    (term) => {
      expect(previewDefinitions().get(term)).toBe(AUTHORED[term]);
    },
  );

  it.each(Object.keys(AUTHORED))('%s resolves in the card preview', (term) => {
    expect(previewKeywordsFor({ keywords: [term] })).toEqual([
      { term, definition: AUTHORED[term] },
    ]);
  });
});

describe('ability-prefix metadata extraction', () => {
  it('reads every metadata token out of a numbered italic prefix', () => {
    expect(
      extractAbilityMetadata(
        '<i-auto>(2 - Activated Hard Linked)</i-auto> <b>Target</b> 1 Creature.',
        fixtureRegistry,
      ),
    ).toEqual(['Activated', 'Hard', 'Linked']);
  });

  it('sees through the nested keyword tag around Flash', () => {
    expect(
      extractAbilityMetadata(
        '<i-auto>(1 - Activated <kw-a>Flash</kw-a> Soft)</i-auto> Do a thing.',
        fixtureRegistry,
      ),
    ).toEqual(['Activated', 'Soft']);
  });

  it('ignores metadata tokens that have no ruling file', () => {
    // `Flash`, `Sorcery` and `Ritual` are documented metadata with no
    // `docs/keywords/{id}.md`. The prefix reader must skip them rather than
    // fail the build the way the closed bold taxonomy does.
    expect(
      extractAbilityMetadata(
        '<i-auto>(1 - Activated Sorcery Soft)</i-auto>',
        fixtureRegistry,
      ),
    ).toEqual(['Activated', 'Soft']);
  });

  it('collects across several prefixes on one card, deduped and sorted', () => {
    expect(
      extractAbilityMetadata(
        '<i-auto>(1 - Static)</i-auto> a\n<i-auto>(2 - Triggered Hard)</i-auto> b\n<i-auto>(3 - Triggered Hard Linked)</i-auto> c',
        fixtureRegistry,
      ),
    ).toEqual(['Hard', 'Linked', 'Static', 'Triggered']);
  });

  it('ignores an italic aside that is not an ability prefix', () => {
    expect(
      extractAbilityMetadata('<i-auto>(no target)</i-auto>', fixtureRegistry),
    ).toEqual([]);
  });

  it('never resolves a bold action keyword as metadata', () => {
    expect(
      extractAbilityMetadata('<b>Target</b> 1 Creature.', fixtureRegistry),
    ).toEqual([]);
  });
});

describe('super-type keyword extraction', () => {
  it('resolves Trap out of the super-type tokens', () => {
    expect(
      extractSupertypeKeywords(['Trap', 'Instant'], fixtureRegistry),
    ).toEqual(['Trap']);
  });

  it('never resolves a same-named action keyword from a super type', () => {
    // `Ritual Summon Sorcery` must not drag the `Summon` action keyword onto
    // the card — only entries categorised `super-type` may match here.
    expect(
      extractSupertypeKeywords(
        ['Ritual', 'Summon', 'Sorcery'],
        fixtureRegistry,
      ),
    ).toEqual([]);
  });
});

describe('cardKeywords merges all three invocation sites', () => {
  it('unions bold text, ability prefixes and super types', () => {
    expect(
      cardKeywords(
        {
          ruleText:
            '<i-auto>(1 - Activated <kw-a>Flash</kw-a> Soft)</i-auto> <b>Target</b> 1 Creature.',
          supertypes: ['Trap', 'Instant'],
        },
        fixtureRegistry,
        'fixture',
      ),
    ).toEqual(['Activated', 'Soft', 'Target', 'Trap']);
  });

  it('still fails the build on an undocumented bold phrase', () => {
    expect(() =>
      cardKeywords(
        { ruleText: '<b>Wibble</b>', supertypes: [] },
        fixtureRegistry,
        'bad-card',
      ),
    ).toThrow(/unknown keyword/);
  });
});

describe('published cards carry the new rulings', () => {
  /** Every published version whose rule text prints the given metadata token. */
  const versionsWithPrefix = (token: string) =>
    catalog.cardVersions.filter((version) =>
      new RegExp(`\\(\\d+ - [^)]*\\b${token}\\b`).test(version.ruleText),
    );

  it.each(METADATA_TERMS)('%s reaches the cards that print it', (term) => {
    const versions = versionsWithPrefix(term);
    expect(
      versions.length,
      `no published card prints "${term}"`,
    ).toBeGreaterThan(0);
    for (const version of versions) expect(version.keywords).toContain(term);
  });

  it('Trap reaches every Trap super-type card', () => {
    const traps = catalog.cardVersions.filter((version) =>
      version.supertypes.includes('Trap'),
    );
    expect(traps.length).toBeGreaterThan(0);
    for (const version of traps) expect(version.keywords).toContain('Trap');
  });

  it('never lifts Summon out of a Ritual Summon Sorcery super type', () => {
    const boldRuns = (text: string) =>
      [...text.matchAll(/<b>([\s\S]*?)<\/b>/g)].map((match) =>
        match[1]!
          .replace(/<[^>]*>/g, '')
          .replace(/\s+/g, ' ')
          .trim(),
      );
    const candidates = catalog.cardVersions.filter(
      (version) =>
        version.supertypes.includes('Summon') &&
        !boldRuns(version.ruleText).includes('Summon'),
    );
    expect(candidates.length).toBeGreaterThan(0);
    for (const version of candidates)
      expect(version.keywords).not.toContain('Summon');
  });

  it('shows the rulings in the hover box of a card that prints them', () => {
    const version = versionsWithPrefix('Static')[0]!;
    const card = catalog.cards.find((entry) => entry.id === version.id)!;
    expect(previewKeywordsFor(card).map((entry) => entry.term)).toContain(
      'Static',
    );
  });
});

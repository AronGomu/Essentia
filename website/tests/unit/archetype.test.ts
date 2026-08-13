import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  assertLinked,
  assertMembership,
  resolveSection,
} from '../../scripts/content/identity.mjs';
import {
  ARCHETYPE_BACKGROUND_SLUGS,
  catalog,
  sectionsBySlug,
} from '../../src/lib/catalog';

const content = (name: string) =>
  JSON.parse(
    readFileSync(new URL(`../../content/${name}`, import.meta.url), 'utf8'),
  );

const registry = {
  sectionsBySlug: new Map([
    [
      'burning-abyss',
      { slug: 'burning-abyss', namePatternRe: /Burning\s+Abyss/i },
    ],
  ]),
};

describe('membership cross-check', () => {
  it('accepts a named card authored as a member', () => {
    expect(() =>
      assertMembership(
        { stableId: 'x', archetype: 'burning-abyss', role: 'member' },
        'Burning Abyss - Cir',
        registry,
      ),
    ).not.toThrow();
  });

  it('accepts an unnamed card authored as support', () => {
    expect(() =>
      assertMembership(
        { stableId: 'x', archetype: 'burning-abyss', role: 'support' },
        'Tour Guide From the Underworld',
        registry,
      ),
    ).not.toThrow();
  });

  it('rejects a named card authored as support', () => {
    expect(() =>
      assertMembership(
        { stableId: 'x', archetype: 'burning-abyss', role: 'support' },
        'Burning Abyss - Cir',
        registry,
      ),
    ).toThrow(/name carries the burning-abyss pattern/);
  });

  it('rejects an unnamed card authored as a member', () => {
    expect(() =>
      assertMembership(
        { stableId: 'x', archetype: 'burning-abyss', role: 'member' },
        'Mathematician',
        registry,
      ),
    ).toThrow(/name does not carry its pattern/);
  });

  it('rejects a staple whose name carries an archetype string', () => {
    // Without this, a card can escape its archetype by declaring none.
    expect(() =>
      assertMembership(
        { stableId: 'x', archetype: null, role: 'staple' },
        'Burning Abyss - Cir',
        registry,
      ),
    ).toThrow(/name carries the burning-abyss pattern/);
  });

  it('rejects a member filed under the wrong archetype', () => {
    const twoArchetypes = {
      sectionsBySlug: new Map([
        ...registry.sectionsBySlug,
        ['nekroz', { slug: 'nekroz', namePatternRe: /Nekroz/i }],
      ]),
    };
    expect(() =>
      assertMembership(
        { stableId: 'x', archetype: 'nekroz', role: 'member' },
        'Burning Abyss - Cir',
        twoArchetypes,
      ),
    ).toThrow(/disagrees with authored archetype/);
  });

  it('rejects overlapping namePatterns as ambiguous', () => {
    const overlapping = {
      sectionsBySlug: new Map([
        ['burning-abyss', { slug: 'burning-abyss', namePatternRe: /Burning/i }],
        ['abyss', { slug: 'abyss', namePatternRe: /Abyss/i }],
      ]),
    };
    expect(() =>
      assertMembership(
        { stableId: 'x', archetype: 'abyss', role: 'member' },
        'Burning Abyss - Cir',
        overlapping,
      ),
    ).toThrow(/must be mutually exclusive/);
  });
});

describe('resolveSection', () => {
  const nonArchetype = { slug: 'non-archetype', kind: 'non-archetype' };
  const burningAbyss = { slug: 'burning-abyss', kind: 'archetype' };
  const sectionRegistry = {
    sectionsBySlug: new Map([
      ['burning-abyss', burningAbyss],
      ['non-archetype', nonArchetype],
    ]),
    nonArchetype,
  };

  it('keeps a named member in its archetype', () => {
    expect(
      resolveSection(
        {
          stableId: 'nekroz-trishula',
          role: 'member',
          archetype: 'burning-abyss',
        },
        sectionRegistry,
      ),
    ).toBe(burningAbyss);
  });

  it('moves an unlinked support card out', () => {
    expect(
      resolveSection(
        {
          stableId: 'tour-guide-from-the-underworld',
          role: 'support',
          archetype: 'burning-abyss',
        },
        sectionRegistry,
      ),
    ).toBe(nonArchetype);
  });

  it('keeps an explicitly linked support card', () => {
    expect(
      resolveSection(
        {
          stableId: 'tour-guide-from-the-underworld',
          role: 'support',
          archetype: 'burning-abyss',
          linked: true,
        },
        sectionRegistry,
      ),
    ).toBe(burningAbyss);
  });

  it('keeps staples in non-archetype', () => {
    expect(
      resolveSection({ role: 'staple', archetype: null }, sectionRegistry),
    ).toBe(nonArchetype);
  });
});

describe('assertLinked', () => {
  it('rejects linked on a member', () => {
    expect(() =>
      assertLinked({ stableId: 'x', role: 'member', linked: true }),
    ).toThrow('content: identity x: linked is support-only');
  });

  it('rejects a non-boolean linked', () => {
    expect(() =>
      assertLinked({ stableId: 'x', role: 'support', linked: 'yes' }),
    ).toThrow('content: identity x: linked must be a boolean');
  });

  it('allows linked absent', () => {
    expect(() =>
      assertLinked({ stableId: 'x', role: 'support' }),
    ).not.toThrow();
  });
});

describe('authored archetype registry', () => {
  it('every live archetype section has a background file when configured', () => {
    for (const slug of ARCHETYPE_BACKGROUND_SLUGS)
      expect(
        existsSync(
          new URL(`../../public/backgrounds/${slug}.webp`, import.meta.url),
        ),
      ).toBe(true);
  });

  it('gives every identity an explicit archetype and role', () => {
    const identities = content('identities.json');
    expect(identities.schemaVersion).toBe(3);
    for (const identity of identities.cards) {
      expect(Object.hasOwn(identity, 'archetype')).toBe(true);
      expect(['member', 'support', 'staple']).toContain(identity.role);
      if (identity.archetype === null) expect(identity.role).toBe('staple');
      else expect(identity.role).not.toBe('staple');
    }
  });

  it('gives every archetype section a namePattern', () => {
    const sections = content('sections.json');
    expect(sections.schemaVersion).toBe(2);
    for (const section of sections.sections)
      if (section.kind === 'archetype')
        expect(typeof section.namePattern).toBe('string');
      else expect(section.namePattern).toBeUndefined();
  });

  it('routes published cards into the section their archetype names or explicit links', () => {
    const identities = content('identities.json');
    const byId = new Map(
      identities.cards.map((identity: { stableId: string }) => [
        identity.stableId,
        identity,
      ]),
    );
    for (const card of catalog.cards) {
      const identity = byId.get(card.id) as
        | { role: string; linked?: boolean }
        | undefined;
      const inArchetype =
        identity?.role === 'member' || identity?.linked === true;
      expect(card.sectionSlug).toBe(
        inArchetype ? card.archetype : 'non-archetype',
      );
    }
  });

  it('archetype sections hold only members and linked support cards', () => {
    const identities = content('identities.json');
    const byId = new Map(
      identities.cards.map((identity: { stableId: string }) => [
        identity.stableId,
        identity,
      ]),
    );
    for (const section of catalog.sections) {
      if (section.kind !== 'archetype') continue;
      for (const cardId of section.cardIds) {
        const identity = byId.get(cardId) as
          | { role: string; linked?: boolean }
          | undefined;
        expect(identity?.role === 'member' || identity?.linked === true).toBe(
          true,
        );
      }
    }
  });
});

describe('colour overrides registry', () => {
  it('ships empty and every entry would name a published card', () => {
    const overrides = content('color-overrides.json');
    expect(overrides.schemaVersion).toBe(1);
    const ids = new Set(catalog.cards.map((card) => card.id));
    for (const entry of overrides.cards) expect(ids).toContain(entry.stableId);
  });

  it('records the colour source for every published card', () => {
    for (const version of catalog.cardVersions)
      expect(['cost', 'override']).toContain(version.colorSource);
  });
});

describe('section hero intros', () => {
  it('nekroz copy', () => {
    const introMarkdown = sectionsBySlug.get('nekroz')!.introMarkdown;
    expect(introMarkdown).toContain(
      'Nekroz is a Blue archetype built on Ritual creatures and Ritual Summon.',
    );
    expect(introMarkdown).toContain('- Ritual creatures');
  });

  it('burning abyss copy', () => {
    expect(sectionsBySlug.get('burning-abyss')!.introMarkdown).toContain(
      'Burning Abyss is a black aristocrats-based archetype.',
    );
  });

  it('hero renders markdown', () => {
    const source = readFileSync(
      new URL('../../src/pages/archetypes/[slug].astro', import.meta.url),
      'utf8',
    );
    expect(source).toContain('class="catalog-hero-intro"');
    expect(source).toContain('section.introMarkdown');
    // The old hero paragraph is gone; `description={section.intro}` on
    // BaseLayout is untouched — Requirements keep `intro` feeding the meta
    // description, so this checks the removed render, not every occurrence.
    expect(source).not.toMatch(/<p>\s*\{section\.intro\}\s*<\/p>/);
  });
});

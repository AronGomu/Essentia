import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { assertMembership } from '../../scripts/content/identity.mjs';
import { catalog } from '../../src/lib/catalog';

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

describe('authored archetype registry', () => {
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

  it('routes published cards into the section their archetype names', () => {
    for (const card of catalog.cards)
      expect(card.sectionSlug).toBe(card.archetype ?? 'non-archetype');
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

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// Comments are stripped so a comment sitting above a rule cannot be mistaken
// for part of its selector list.
const css = readFileSync(
  new URL('../../src/styles/global.css', import.meta.url),
  'utf-8',
).replace(/\/\*[\s\S]*?\*\//g, '');
const archetypePage = readFileSync(
  new URL('../../src/pages/archetypes/[slug].astro', import.meta.url),
  'utf-8',
);

// Matches the base rule, not a same-selector rule nested inside a
// `@media` block (the phone padding override adds one of those).
function ruleFor(selector: string): string {
  const rules = [...css.matchAll(/([^{}]*)\{([^{}]*)\}/g)].filter((rule) =>
    (rule[1] ?? '').split(',').some((part) => part.trim() === selector),
  );
  expect(rules.length, `no rule for ${selector}`).toBeGreaterThan(0);
  return rules[0]?.[2] ?? '';
}

describe('archetype hero panel', () => {
  it('declares a translucent background and a border', () => {
    const declarations = ruleFor('.catalog-hero-panel');
    expect(declarations).toMatch(/background:\s*color-mix\(/);
    expect(declarations).toMatch(/border:\s*1px solid var\(--ruleline\)/);
  });

  it('wraps the title, intro and stats', () => {
    const panelMatches = archetypePage.match(/catalog-hero-panel/g) ?? [];
    expect(panelMatches).toHaveLength(1);
    const panelIndex = archetypePage.indexOf('catalog-hero-panel');
    const artIndex = archetypePage.indexOf('catalog-hero-art');
    expect(panelIndex).toBeGreaterThan(-1);
    expect(artIndex).toBeGreaterThan(-1);
    expect(panelIndex).toBeLessThan(artIndex);
  });
});

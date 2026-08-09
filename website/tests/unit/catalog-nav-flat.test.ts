import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const navSource = readFileSync(
  path.join(__dirname, '../../src/components/Navigation.svelte'),
  'utf-8',
);
const cssSource = readFileSync(
  path.join(__dirname, '../../src/styles/global.css'),
  'utf-8',
);
const sectionsJson = JSON.parse(
  readFileSync(path.join(__dirname, '../../content/sections.json'), 'utf-8'),
);

describe('flat catalog rail', () => {
  it('the catalog rail has no group toggle', () => {
    expect(navSource).not.toMatch(/class="nav-group"/);
  });

  it('the catalog rail has no Non-Archetype heading', () => {
    expect(navSource).not.toMatch(/Non-Archetype/);
  });

  it('the drawer has no disclosure', () => {
    expect(navSource).not.toMatch(/<details/);
    expect(navSource).not.toMatch(/<summary/);
  });

  it('the archetype heading is gone', () => {
    expect(navSource).not.toMatch(/>Archetypes</);
  });

  it('both catalog lists iterate every section', () => {
    const matches = navSource.match(/#each sections as section/g) ?? [];
    expect(matches.length).toBe(2);
  });

  it('the split filters are gone', () => {
    expect(navSource).not.toMatch(/const nonArchetype =/);
    expect(navSource).not.toMatch(/const archetypes =/);
    expect(navSource).not.toMatch(/nonArchetypeOpen/);
  });

  it('the reading branch keeps its group headings', () => {
    expect(navSource).toMatch(/#each readingGroups as group/);
    const navLabelMatches = navSource.match(/class="nav-label"/g) ?? [];
    expect(navLabelMatches.length).toBe(2);
  });

  it('the group button style is gone', () => {
    expect(cssSource).not.toMatch(/^\s*\.nav-group\s*\{/m);
  });

  it('the section order still leads with non-archetype', () => {
    const sections = sectionsJson.sections;
    expect(sections[0].slug).toBe('non-archetype');
    const orders = sections.map((section: { order: number }) => section.order);
    const sorted = [...orders].sort((a, b) => a - b);
    expect(orders).toEqual(sorted);
  });
});

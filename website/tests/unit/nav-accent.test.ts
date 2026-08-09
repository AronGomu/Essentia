import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const read = (relative: string) =>
  readFileSync(fileURLToPath(new URL(relative, import.meta.url)), 'utf-8');

const baseLayout = read('../../src/layouts/BaseLayout.astro');
const navigation = read('../../src/components/Navigation.svelte');
const globalCss = read('../../src/styles/global.css');
const sectionsJson = JSON.parse(read('../../content/sections.json'));

describe('nav accent tint', () => {
  it('the layout forwards the accent', () => {
    expect(baseLayout).toMatch(
      /\{\s*slug,\s*label,\s*kind,\s*accent,\s*route,\s*count\s*\}/,
    );
  });

  it('the nav type carries the accent', () => {
    const pickMatch = navigation.match(/type NavSection = Pick<[\s\S]*?>;/);
    expect(pickMatch).not.toBeNull();
    expect(pickMatch![0]).toMatch(/'accent'/);
  });

  it('archetypes get a tint, non-archetypes do not', () => {
    const statementMatch = navigation.match(/const tintStyle[\s\S]*?;\n/);
    expect(statementMatch).not.toBeNull();
    const statement = statementMatch![0];
    expect(statement).toMatch(/kind === 'archetype'/);
    expect(statement).toMatch(/: null/);
  });

  // Bound via Svelte's `style:--nav-tint` directive (CSSOM `setProperty`),
  // not a plain `style={tintStyle(section)}` attribute string — see the
  // doc comment above `tintStyle` in Navigation.svelte for why: Chromium,
  // Firefox and WebKit all fail to resolve `var(--nav-tint, …)` inside the
  // stylesheet's `color-mix()` when `--nav-tint` arrives as raw
  // `style="--nav-tint: …"` markup, verified with a cross-engine e2e repro.
  it('both catalog lists bind the tint', () => {
    const matches = navigation.match(
      /style:--nav-tint=\{tintStyle\(section\)\}/g,
    );
    expect(matches?.length).toBe(2);
  });

  it('nav links rest on a faint tint', () => {
    expect(globalCss).toMatch(
      /color-mix\(\s*in oklch,\s*var\(--nav-tint, transparent\) 14%,\s*transparent\s*\)/,
    );
  });

  it('hover is more intense than rest', () => {
    const restMatch = globalCss.match(
      /var\(--nav-tint, transparent\)\s*(\d+)%/,
    );
    const hoverMatch = globalCss.match(
      /var\(--nav-tint, var\(--sleeve\)\)\s*(\d+)%/,
    );
    expect(restMatch).not.toBeNull();
    expect(hoverMatch).not.toBeNull();
    const restPct = Number(restMatch![1]);
    const hoverPct = Number(hoverMatch![1]);
    expect(hoverPct).toBeGreaterThan(restPct);
  });

  it("hover keeps today's look when there is no tint", () => {
    expect(globalCss).toMatch(/var\(--nav-tint, var\(--sleeve\)\)/);
    expect(globalCss).toMatch(/, var\(--sleeve\)\)/);
  });

  it('focus-visible is tinted too', () => {
    expect(globalCss).toMatch(/\.desktop-catalog li a:focus-visible/);
    expect(globalCss).toMatch(/\.mobile-drawer li a:focus-visible/);
  });

  it('Burning Abyss is orange and Nekroz is blue', () => {
    const abyss = sectionsJson.sections.find(
      (section: { slug: string }) => section.slug === 'burning-abyss',
    );
    const nekroz = sectionsJson.sections.find(
      (section: { slug: string }) => section.slug === 'nekroz',
    );
    expect(abyss.accent).toBe('ember');
    expect(nekroz.accent).toBe('ice');
    expect(globalCss).toMatch(/--ember:\s*oklch\([^)]*32[^)]*\)/);
    expect(globalCss).toMatch(/--ice:\s*oklch\([^)]*218[^)]*\)/);
  });

  it('non-archetype is not an archetype', () => {
    const plain = sectionsJson.sections.find(
      (section: { slug: string }) => section.slug === 'non-archetype',
    );
    expect(plain.kind).toBe('non-archetype');
  });
});

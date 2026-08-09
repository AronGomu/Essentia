import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const read = (relative: string) =>
  readFileSync(fileURLToPath(new URL(relative, import.meta.url)), 'utf-8');

const baseLayout = read('../../src/layouts/BaseLayout.astro');
const navigation = read('../../src/components/Navigation.svelte');
const globalCss = read('../../src/styles/global.css');
const sectionsJson = JSON.parse(read('../../content/sections.json'));

type Section = { slug: string; kind: string; accent: string };
const section = (slug: string): Section => {
  const found = sectionsJson.sections.find((s: Section) => s.slug === slug);
  if (!found) throw new Error(`sections.json has no section ${slug}`);
  return found;
};

/**
 * `tintStyle` is a pure expression over one section record, so run the real
 * source instead of pattern-matching it: lift the arrow function out of
 * Navigation.svelte, drop its TypeScript parameter annotation (`Function`
 * parses JavaScript), and evaluate it. Grepping for `kind === 'archetype'`
 * proved nothing — an implementation returning the same accent for every
 * archetype matched that grep. These assertions do not.
 */
const tintStyle: (input: Section) => string | null = (() => {
  const match = navigation.match(/const tintStyle =([\s\S]*?);\n/);
  if (!match?.[1])
    throw new Error('Navigation.svelte no longer defines tintStyle');
  return new Function(`return (${match[1].replace(/:\s*NavSection/g, '')});`)();
})();

/** The `oklch(L C H)` value authored for a `--token` in global.css `:root`. */
const accentValue = (token: string) => {
  const match = globalCss.match(
    new RegExp(`--${token}:\\s*(oklch\\([^)]*\\));`),
  );
  if (!match) throw new Error(`global.css has no --${token} token`);
  return match[1]!;
};
/** Hue is the third `oklch()` component — the one that makes ember orange. */
const hue = (value: string) => {
  const match = value.match(/oklch\(\s*[\d.]+\s+[\d.]+\s+([\d.]+)\s*\)/);
  if (!match) throw new Error(`cannot read a hue from ${value}`);
  return Number(match[1]);
};

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

  it('each archetype resolves its own accent, non-archetype gets none', () => {
    expect(tintStyle(section('burning-abyss'))).toBe('var(--ember)');
    expect(tintStyle(section('nekroz'))).toBe('var(--ice)');
    expect(tintStyle(section('shaddoll'))).toBe('var(--shadow)');
    expect(tintStyle(section('spellbook'))).toBe('var(--aether)');
    expect(tintStyle(section('non-archetype'))).toBeNull();
  });

  it('no two archetypes share a tint', () => {
    const tints = sectionsJson.sections
      .filter((s: Section) => s.kind === 'archetype')
      .map((s: Section) => tintStyle(s));
    expect(tints).toHaveLength(4);
    expect(new Set(tints).size).toBe(tints.length);
  });

  it('Burning Abyss is orange and Nekroz is blue', () => {
    expect(section('burning-abyss').accent).toBe('ember');
    expect(section('nekroz').accent).toBe('ice');
    // Exact hues, not a substring search: the previous
    // `/--ember:\s*oklch\([^)]*32[^)]*\)/` also accepted `oklch(0.32 0.1 250)`
    // — a blue — because `32` matched the lightness component.
    expect(accentValue('ember')).toBe('oklch(0.68 0.18 32)');
    expect(accentValue('ice')).toBe('oklch(0.78 0.13 218)');
    expect(hue(accentValue('ember'))).toBe(32);
    expect(hue(accentValue('ice'))).toBe(218);
    expect(hue(accentValue('ember'))).not.toBe(hue(accentValue('ice')));
  });

  it('non-archetype is not an archetype', () => {
    expect(section('non-archetype').kind).toBe('non-archetype');
  });

  // The delivered mechanism is the `onMount` CSSOM pass and nothing else.
  // BaseLayout's CSP `style-src` (hardened by scripts/harden-csp.mjs) carries
  // sha256 hashes for static <style> blocks and no `'unsafe-hashes'`, so a
  // per-element `style="--nav-tint: …"` attribute is refused by the browser
  // *and* logs a CSP error on every catalog page. (The earlier note here
  // blamed `var()` inside `color-mix()`; that resolves fine. The real causes
  // are the CSP block plus Svelte compiling `style:--nav-tint` to
  // `set_style(node, '', prev, next)`, which short-circuits during hydration
  // when the serialised value already equals the element's `style`
  // attribute — so Svelte never wrote to `element.style` either.)
  it('the tint is applied through the CSSOM, on both catalog lists', () => {
    const mountMatch = navigation.match(
      /onMount\(\(\) => \{[\s\S]*?\n {2}\}\);/,
    );
    expect(mountMatch).not.toBeNull();
    const mount = mountMatch![0];
    expect(mount).toContain("li.style.setProperty('--nav-tint', value)");
    expect(mount).toContain('tintStyle(sections[index])');
    expect(mount).toContain('#desktop-catalog-sections > li');
    expect(mount).toContain('#mobile-catalog-sections > li');
  });

  it('no <li> ships a CSP-blocked style attribute', () => {
    const markup = navigation.slice(navigation.indexOf('</script>'));
    expect(markup).not.toMatch(/style:--nav-tint=/);
    expect(markup).not.toMatch(/<li[^>]*\sstyle=/);
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
    // Also the with-JavaScript-disabled look: nothing sets --nav-tint until
    // the island hydrates, so these fallbacks are what a no-JS visitor sees.
    expect(globalCss).toMatch(/var\(--nav-tint, var\(--sleeve\)\)/);
    expect(globalCss).toMatch(/, var\(--sleeve\)\)/);
  });

  it('focus-visible is tinted too', () => {
    expect(globalCss).toMatch(/\.desktop-catalog li a:focus-visible/);
    expect(globalCss).toMatch(/\.mobile-drawer li a:focus-visible/);
  });
});

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync(
  new URL('../../src/styles/global.css', import.meta.url),
  'utf-8',
);

function sliceBlock(
  source: string,
  startMarker: string,
  endMarker: string,
): string {
  const start = source.indexOf(startMarker);
  if (start === -1) {
    throw new Error(`start marker not found: ${startMarker}`);
  }
  const end = source.indexOf(endMarker, start);
  if (end === -1) {
    throw new Error(`end marker not found: ${endMarker}`);
  }
  return source.slice(start, end);
}

const heroBlock = sliceBlock(css, '.catalog-hero-art {', '.catalog-stats {');

describe('catalog hero art hover reveal', () => {
  it('crops the hero at rest', () => {
    const restBlock = sliceBlock(heroBlock, '.catalog-hero img {', '}');
    expect(restBlock).toMatch(/object-fit:\s*cover/);
  });

  it('reveals the whole art on hover', () => {
    const hoverRule = sliceBlock(heroBlock, '.catalog-hero-art:hover img', '}');
    expect(hoverRule).toMatch(/object-fit:\s*contain/);
  });

  it('reveals the whole art on focus-within', () => {
    expect(heroBlock).toMatch(
      /\.catalog-hero-art:focus-within img\s*{[^}]*object-fit:\s*contain/,
    );
  });

  it('resets the resting zoom on hover', () => {
    const hoverRule = sliceBlock(heroBlock, '.catalog-hero-art:hover img', '}');
    expect(hoverRule).toMatch(/transform:\s*scale\(1\)/);
  });

  it('keeps the reveal under reduced motion', () => {
    const reducedMotionStart = css.indexOf('prefers-reduced-motion: reduce');
    expect(reducedMotionStart).toBeGreaterThan(-1);
    const reducedMotionBlock = css.slice(
      reducedMotionStart,
      css.indexOf('\n  }\n', reducedMotionStart) + 6,
    );
    // Take whole rules — selector list through closing brace — not the lines
    // that merely mention the selector. Prettier puts every declaration on its
    // own line, so a line filter keeps only selectors and can never see a
    // declaration: that is how `object-fit: cover` could be added here, killing
    // the hover reveal for every reduced-motion visitor, with this test green.
    const heroRules = [
      ...reducedMotionBlock.matchAll(/([^{}]*)\{([^{}]*)\}/g),
    ].filter((rule) => (rule[1] ?? '').includes('.catalog-hero-art'));
    expect(heroRules.length).toBeGreaterThan(0);
    for (const rule of heroRules) {
      // Reduced motion drops the resting zoom, and nothing else: the reveal is
      // a crop change, not motion.
      const declarations = rule[2] ?? '';
      expect(declarations).toMatch(/transform:\s*none/);
      expect(declarations).not.toMatch(/object-fit/);
    }
  });
});

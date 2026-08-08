import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// Comments are stripped so a comment sitting above a rule cannot be mistaken
// for part of its selector list.
const css = readFileSync(
  new URL('../../src/styles/global.css', import.meta.url),
  'utf-8',
).replace(/\/\*[\s\S]*?\*\//g, '');
const cardPicture = readFileSync(
  new URL('../../src/components/CardPicture.astro', import.meta.url),
  'utf-8',
);

/** Whole rules — selector list through closing brace — not lines that merely
 * mention the selector, so a declaration added inside the block is visible. */
function ruleFor(selector: string): string {
  const rules = [...css.matchAll(/([^{}]*)\{([^{}]*)\}/g)].filter((rule) =>
    (rule[1] ?? '').split(',').some((part) => part.trim() === selector),
  );
  expect(rules, `no rule for ${selector}`).toHaveLength(1);
  return rules[0]?.[2] ?? '';
}

describe('new card grid keeps the MSE card ratio', () => {
  it('lets the image height follow its intrinsic ratio', () => {
    const declarations = ruleFor('.new-card-grid img');
    expect(declarations).toMatch(/height:\s*auto/);
    expect(declarations).toMatch(/width:\s*100%/);
  });

  it('never pins the image to a second dimension', () => {
    const declarations = ruleFor('.new-card-grid img');
    // A `height: 100%`, a fixed height, or an `aspect-ratio` here would override
    // the intrinsic ratio and squash the render — the defect this rule fixes.
    const heights = [
      ...declarations.matchAll(/(?:^|[\s;])height:\s*([^;]+)/g),
    ].map((match) => (match[1] ?? '').trim());
    expect(heights).toEqual(['auto']);
    expect(declarations).not.toMatch(/aspect-ratio/);
  });

  it('keeps the intrinsic dimensions that height:auto depends on', () => {
    // Without width/height attributes on the <img>, `height: auto` has no ratio
    // to preserve and the grid reflows as each render decodes.
    expect(cardPicture).toMatch(/width=\{width\}/);
    expect(cardPicture).toMatch(/height=\{height\}/);
  });
});

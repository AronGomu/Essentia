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
function rulesFor(selector: string): string[] {
  const rules = [...css.matchAll(/([^{}]*)\{([^{}]*)\}/g)].filter((rule) =>
    (rule[1] ?? '').split(',').some((part) => part.trim() === selector),
  );
  return rules.map((rule) => rule[2] ?? '');
}

function ruleFor(selector: string): string {
  const rules = rulesFor(selector);
  expect(rules, `no rule for ${selector}`).toHaveLength(1);
  return rules[0] ?? '';
}

/** Whole `@media (...) { ... }` blocks, so a rule nested inside a specific
 * breakpoint can be told apart from the base rule with the same selector. */
function mediaBlock(mediaQuery: string): string {
  const escaped = mediaQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`@media\\s*\\(${escaped}\\)\\s*\\{([\\s\\S]*)`);
  const match = css.match(pattern);
  if (!match) return '';
  // Walk braces from the media query's opening `{` to find its matching `}`,
  // since the naive regex above would otherwise swallow every rule after it.
  const body = match[1] ?? '';
  let depth = 1;
  let end = 0;
  for (; end < body.length; end += 1) {
    if (body[end] === '{') depth += 1;
    else if (body[end] === '}') {
      depth -= 1;
      if (depth === 0) break;
    }
  }
  return body.slice(0, end);
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

describe('new card grid collapses to one column below 480px', () => {
  it('collapses to one column at 30rem', () => {
    const block = mediaBlock('max-width: 30rem');
    const rules = [...block.matchAll(/([^{}]*)\{([^{}]*)\}/g)].filter((rule) =>
      (rule[1] ?? '')
        .split(',')
        .some((part) => part.trim() === '.new-card-grid'),
    );
    expect(
      rules,
      'no .new-card-grid rule inside max-width: 30rem',
    ).toHaveLength(1);
    expect(rules[0]?.[2] ?? '').toMatch(/grid-template-columns:\s*1fr/);
  });

  it('keeps two columns between 30rem and 40rem', () => {
    const block = mediaBlock('max-width: 40rem');
    const rules = [...block.matchAll(/([^{}]*)\{([^{}]*)\}/g)].filter((rule) =>
      (rule[1] ?? '')
        .split(',')
        .some((part) => part.trim() === '.new-card-grid'),
    );
    expect(
      rules,
      'no .new-card-grid rule inside max-width: 40rem',
    ).toHaveLength(1);
    expect(rules[0]?.[2] ?? '').toMatch(
      /grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/,
    );
  });
});

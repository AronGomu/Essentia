/**
 * A deliberately small CSS reader for tests that need to know what a rule
 * *resolves to*, not merely that some block mentions it.
 *
 * `global.css` states its base rules at the top and overrides them in
 * `@media (max-width: …)` / `@media (min-width: …)` blocks, so a test that
 * greps for the first `.compact-brand { … }` block reads a value the browser
 * may never use. Appending `@media (min-width: 64rem) { .compact-brand {
 * display: none } }` hid the wordmark on every desktop while the old
 * `header-brand` test stayed green.
 *
 * Not a CSS parser: it handles the shapes `global.css` actually uses — flat
 * rules, `@layer` blocks, and single-condition width media queries.
 */

/** Root font size the `rem` widths in `global.css` are authored against. */
const ROOT_FONT_PX = 16;

interface Block {
  /** Selectors this block declares, already split on `,`. */
  selectors: string[];
  declarations: string;
  minWidthPx: number;
  maxWidthPx: number;
}

function toPx(value: string, unit: string): number {
  const n = Number.parseFloat(value);
  return unit === 'rem' || unit === 'em' ? n * ROOT_FONT_PX : n;
}

/** Strip comments so a commented-out declaration never counts as authored. */
function stripComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, '');
}

/**
 * Flatten `css` into declaration blocks, each tagged with the width range it
 * applies over. `@layer name { … }` is transparent; a media query narrows the
 * range; an at-rule whose condition is not a width query (`prefers-*`,
 * `forced-colors`, `print`) is dropped, because those are not viewport widths
 * and a test asking "what applies at 1280px" must not read them.
 */
export function flatten(css: string): Block[] {
  const source = stripComments(css);
  const blocks: Block[] = [];

  const walk = (body: string, minWidthPx: number, maxWidthPx: number) => {
    let index = 0;
    while (index < body.length) {
      const braceOpen = body.indexOf('{', index);
      if (braceOpen === -1) break;

      // Find the matching close brace for this block.
      let depth = 0;
      let braceClose = -1;
      for (let i = braceOpen; i < body.length; i += 1) {
        if (body[i] === '{') depth += 1;
        else if (body[i] === '}') {
          depth -= 1;
          if (depth === 0) {
            braceClose = i;
            break;
          }
        }
      }
      if (braceClose === -1) break;

      const prelude = body.slice(index, braceOpen).trim();
      const inner = body.slice(braceOpen + 1, braceClose);
      index = braceClose + 1;

      if (prelude.startsWith('@media')) {
        const min = prelude.match(/min-width:\s*([\d.]+)(px|rem|em)/);
        const max = prelude.match(/max-width:\s*([\d.]+)(px|rem|em)/);
        if (!min && !max) continue; // not a width query — out of scope
        walk(
          inner,
          Math.max(minWidthPx, min ? toPx(min[1]!, min[2]!) : 0),
          Math.min(maxWidthPx, max ? toPx(max[1]!, max[2]!) : Infinity),
        );
        continue;
      }
      if (prelude.startsWith('@layer') || prelude.startsWith('@supports')) {
        walk(inner, minWidthPx, maxWidthPx);
        continue;
      }
      if (prelude.startsWith('@')) continue; // keyframes, font-face, …

      blocks.push({
        selectors: prelude.split(',').map((selector) => selector.trim()),
        declarations: inner,
        minWidthPx,
        maxWidthPx,
      });
    }
  };

  walk(source, 0, Infinity);
  return blocks;
}

/**
 * The value `property` resolves to for `selector` at viewport width `widthPx`,
 * or `undefined` when nothing declares it. Last declaration wins, which is
 * how the cascade behaves for same-specificity rules in one stylesheet — and
 * every rule this helper is pointed at is a single class selector.
 */
export function resolve(
  css: string,
  selector: string,
  property: string,
  widthPx: number,
): string | undefined {
  let value: string | undefined;
  for (const block of flatten(css)) {
    if (widthPx < block.minWidthPx || widthPx > block.maxWidthPx) continue;
    if (!block.selectors.includes(selector)) continue;
    for (const match of block.declarations.matchAll(
      /(^|;)\s*([a-z-]+)\s*:\s*([^;]+)/g,
    )) {
      if (match[2] === property) value = match[3]!.trim();
    }
  }
  return value;
}

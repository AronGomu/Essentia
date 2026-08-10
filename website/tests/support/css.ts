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
 *
 * ## Blind spots — read these before writing an assertion against `resolve()`
 *
 * These are the reasons a `resolve()` assertion can be green while the browser
 * disagrees. Five test files depend on this helper (`header-brand`,
 * `header-priority`, `header-row`, `compact-header`, `catalog-hero-layout`,
 * `tile-badge`), so each one is a guard that can silently lose its teeth.
 *
 * 1. **Selectors are matched as exact strings, and specificity is ignored.**
 *    `resolve(css, '.breadcrumb', …)` reads blocks whose prelude is literally
 *    `.breadcrumb` (or a comma-list containing it). It does *not* know that
 *    `.site-header .breadcrumb`, `#id`, or `html[data-x] .breadcrumb` also
 *    apply, nor that they outrank a bare class. Last declaration in source
 *    order wins, full stop. Point it at single-class rules, or at a descendant
 *    selector you know is authored verbatim (`.compact-brand img`).
 * 2. **`@layer` is transparent, so layer order is not honoured.** A `@layer
 *    base` rule that loses to `@layer layout` in the browser will still
 *    overwrite it here if it is authored later in the file.
 * 3. **Media-query *range* syntax is dropped.** `flatten()` only reads
 *    `min-width:` / `max-width:` (see the two regexes below); a block written
 *    `@media (width <= 64rem)` matches neither, so the whole block is
 *    discarded and every declaration inside it becomes invisible.
 * 4. **`!important` is returned as part of the value.** `display: none
 *    !important` resolves to the string `'none !important'`, which `toBe('none')`
 *    does not match — and, worse, it does not raise the declaration's priority,
 *    so a later non-important declaration still wins here.
 * 5. **Nothing is evaluated.** `var()`, `calc()` and custom properties come
 *    back as written. `lengthPx()` below evaluates the static subset
 *    (`px`/`rem`/`em`/`vw`, `clamp()`/`min()`/`max()`) and throws on the rest,
 *    which is deliberate: a cross-check that silently skipped `var(--sidebar)`
 *    would be another toothless guard.
 * 6. **Logical properties are mapped as horizontal-tb LTR.** `padding-inline`
 *    expands to left/right and `padding-block` to top/bottom. True for this
 *    site; not true in general.
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

/** Physical sides a box shorthand fills, in `top right bottom left` order. */
const BOX_SHORTHANDS: Record<
  string,
  readonly [string, string, string, string]
> = {
  padding: ['padding-top', 'padding-right', 'padding-bottom', 'padding-left'],
  margin: ['margin-top', 'margin-right', 'margin-bottom', 'margin-left'],
  // `inset`'s longhands are the bare physical offsets.
  inset: ['top', 'right', 'bottom', 'left'],
};

/** Two-value logical shorthands, mapped as horizontal-tb LTR (blind spot 6). */
const AXIS_SHORTHANDS: Record<string, readonly [string, string]> = {
  'padding-block': ['padding-top', 'padding-bottom'],
  'padding-inline': ['padding-left', 'padding-right'],
  'margin-block': ['margin-top', 'margin-bottom'],
  'margin-inline': ['margin-left', 'margin-right'],
  'inset-block': ['top', 'bottom'],
  'inset-inline': ['left', 'right'],
};

/**
 * Split a declaration value on top-level whitespace, keeping function calls
 * whole: `0.7rem clamp(1rem, 3vw, 3rem)` is two parts, not four.
 */
function splitTopLevel(value: string, separator: RegExp): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = '';
  for (const character of value.trim()) {
    if (character === '(') depth += 1;
    else if (character === ')') depth -= 1;
    if (depth === 0 && separator.test(character)) {
      if (current) parts.push(current);
      current = '';
      continue;
    }
    current += character;
  }
  if (current) parts.push(current);
  return parts;
}

/**
 * The longhands `property: value` sets, for the box shorthands the suite
 * relies on. A shorthand *resets* every side it covers, so this is what makes
 * `padding: 0.7rem clamp(…)` visible to a `padding-left` assertion — and what
 * makes restoring `padding: … 8.8rem` visible to the test that exists to
 * catch exactly that.
 */
function expandShorthand(
  property: string,
  value: string,
): Record<string, string> {
  const box = BOX_SHORTHANDS[property];
  if (box) {
    const parts = splitTopLevel(value, /\s/);
    if (parts.length < 1 || parts.length > 4) return {};
    const top = parts[0]!;
    const right = parts[1] ?? top;
    const bottom = parts[2] ?? top;
    const left = parts[3] ?? right;
    return {
      [box[0]]: top,
      [box[1]]: right,
      [box[2]]: bottom,
      [box[3]]: left,
    };
  }
  const axis = AXIS_SHORTHANDS[property];
  if (axis) {
    const parts = splitTopLevel(value, /\s/);
    if (parts.length < 1 || parts.length > 2) return {};
    const start = parts[0]!;
    return { [axis[0]]: start, [axis[1]]: parts[1] ?? start };
  }
  return {};
}

/**
 * The value `property` resolves to for `selector` at viewport width `widthPx`,
 * or `undefined` when nothing declares it. Last declaration wins, which is
 * how the cascade behaves for same-specificity rules in one stylesheet — and
 * every rule this helper is pointed at is a single class selector.
 *
 * A longhand query also sees values supplied via `padding` / `margin` /
 * `inset` (and their `-block` / `-inline` forms), in declaration order, so a
 * later shorthand overwrites an earlier longhand exactly as the cascade does.
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
      const declared = match[2]!;
      const declaredValue = match[3]!.trim();
      if (declared === property) {
        value = declaredValue;
        continue;
      }
      const expanded = expandShorthand(declared, declaredValue)[property];
      if (expanded !== undefined) value = expanded;
    }
  }
  return value;
}

/**
 * `value` as pixels at viewport width `widthPx`, for the static subset of CSS
 * lengths: `0`, `px`, `rem`, `em`, `vw`, and `clamp()` / `min()` / `max()`
 * over those. Throws on anything it cannot evaluate — `var(--sidebar)`,
 * `auto`, `%`, `calc()`.
 *
 * The throw is the point. This exists so a test can recompute a hand-copied
 * constant from the stylesheet; a version that returned `NaN` or `undefined`
 * for the values it does not understand would let the constant drift right
 * back out of sync.
 */
export function lengthPx(value: string, widthPx: number): number {
  const text = value.trim();
  const call = text.match(/^(clamp|min|max)\(([\s\S]*)\)$/);
  if (call) {
    const args = splitTopLevel(call[2]!, /,/).map((argument) =>
      lengthPx(argument, widthPx),
    );
    if (call[1] === 'min') return Math.min(...args);
    if (call[1] === 'max') return Math.max(...args);
    if (args.length !== 3)
      throw new Error(`clamp() needs three arguments: ${value}`);
    return Math.min(Math.max(args[0]!, args[1]!), args[2]!);
  }
  const length = text.match(/^(-?\d*\.?\d+)(px|rem|em|vw)?$/);
  if (!length) throw new Error(`not a static CSS length: ${value}`);
  const amount = Number.parseFloat(length[1]!);
  switch (length[2]) {
    case 'px':
      return amount;
    case 'rem':
    case 'em':
      return amount * ROOT_FONT_PX;
    case 'vw':
      return (amount * widthPx) / 100;
    default:
      // A unitless length is only legal when it is zero.
      if (amount !== 0) throw new Error(`unitless non-zero length: ${value}`);
      return 0;
  }
}

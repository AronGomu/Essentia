import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from '../support/css';

const navigationSource = readFileSync(
  fileURLToPath(
    new URL('../../src/components/Navigation.svelte', import.meta.url),
  ),
  'utf-8',
);
const baseLayoutSource = readFileSync(
  fileURLToPath(new URL('../../src/layouts/BaseLayout.astro', import.meta.url)),
  'utf-8',
);
const globalCss = readFileSync(
  fileURLToPath(new URL('../../src/styles/global.css', import.meta.url)),
  'utf-8',
);

/** Widths worth checking: wide desktop, desktop, tablet, phone. */
const WIDTHS = [1440, 1280, 900, 704, 390];

/** `justify-content` values that pack the first flex child against the start. */
const START_LIKE = new Set([
  'flex-start',
  'start',
  'left',
  'normal',
  // `space-between` puts the *first* item at the start edge, so it belongs
  // here — and only here. It also puts the **last** item at the end edge,
  // which is why it is no longer in `END_LIKE`: the last header child is
  // `.search-trigger`, not `.utility-nav`, so `space-between` would leave the
  // utility nav floating mid-row while that test stayed green.
  'space-between',
]);
/** …and those that pack the last child against the end. */
const END_LIKE = new Set(['flex-end', 'end', 'right']);

const justify = (width: number) =>
  resolve(globalCss, '.site-header', 'justify-content', width) ?? 'normal';

/** A flex item's `order`, which decides visual position before DOM order does. */
const order = (selector: string, width: number) =>
  Number.parseInt(resolve(globalCss, selector, 'order', width) ?? '0', 10);

/**
 * Is the wordmark — `children[0]` in DOM order — actually painted at the left
 * edge of `.site-header` at `width`?
 *
 * The previous version returned `true` the moment `justify-content` was
 * start-like, which `.site-header` is authored to be, so it never looked at
 * the children at all: `.compact-brand { margin-left: auto }` (the documented
 * flush-right-wordmark bug) and `.compact-brand { order: 9 }` both kept it
 * green. Both of those are now caught, in this order:
 *
 * 1. `order` reshuffles flex items before anything else does, so a child with
 *    a lower `order` paints first no matter what the DOM says.
 * 2. An auto margin on the brand's own left edge absorbs the free space and
 *    pushes it right, whatever the justification.
 * 3. Only then does packing decide: start-like justification anchors it, and
 *    otherwise it takes `margin-right: auto` on the brand, or
 *    `margin-left: auto` on some later child, to hold it at the edge.
 */
function brandHoldsTheLeftEdge(children: string[], width: number): boolean {
  const [brand, ...rest] = children;
  const lowestOrder = Math.min(...children.map((child) => order(child, width)));
  if (order(brand!, width) > lowestOrder) return false;
  if (resolve(globalCss, brand!, 'margin-left', width) === 'auto') return false;
  if (START_LIKE.has(justify(width))) return true;
  if (resolve(globalCss, brand!, 'margin-right', width) === 'auto') return true;
  return rest.some(
    (child) => resolve(globalCss, child, 'margin-left', width) === 'auto',
  );
}

describe('header brand', () => {
  it('the nav carries no text brand', () => {
    expect(navigationSource).not.toMatch(/class="brand"/);
  });

  it('the brand is the first header child', () => {
    const brandIndex = baseLayoutSource.indexOf('class="compact-brand"');
    const breadcrumbIndex = baseLayoutSource.indexOf('<Breadcrumb');
    expect(brandIndex).toBeGreaterThan(-1);
    expect(breadcrumbIndex).toBeGreaterThan(-1);
    expect(brandIndex).toBeLessThan(breadcrumbIndex);
  });

  it('the brand shows at every width', () => {
    // Not "the first `.compact-brand` block says `display: block`": appending
    // `@media (min-width: 64rem) { .compact-brand { display: none } }` hid the
    // wordmark on every desktop while that check stayed green.
    for (const width of WIDTHS) {
      expect(
        resolve(globalCss, '.compact-brand', 'display', width),
        `at ${width}px`,
      ).not.toBe('none');
    }
    expect(resolve(globalCss, '.compact-brand', 'display', 1280)).toBe('block');
  });

  it('the header lays its children out in a row', () => {
    for (const width of WIDTHS) {
      expect(
        resolve(globalCss, '.site-header', 'display', width),
        `at ${width}px`,
      ).toBe('flex');
    }
  });

  it('the breadcrumb is optional, so the layout must not depend on it', () => {
    // `/` is the only page with no breadcrumb, which is precisely why the
    // flush-right wordmark hid there for a whole review pass.
    expect(baseLayoutSource).toContain('{breadcrumb && <Breadcrumb');
  });

  it('the brand holds the left edge on the home page, at every width', () => {
    // The home page header renders brand → hamburger → utility nav → Find,
    // with no breadcrumb between them. An auto margin parked on `.breadcrumb`
    // does nothing here, which is the exact shape of the bug.
    for (const width of WIDTHS) {
      expect(
        brandHoldsTheLeftEdge(
          [
            '.compact-brand',
            '.drawer-trigger',
            '.utility-nav',
            '.search-trigger',
          ],
          width,
        ),
        `home page at ${width}px`,
      ).toBe(true);
    }
  });

  it('the brand holds the left edge on a page with a breadcrumb', () => {
    for (const width of WIDTHS) {
      expect(
        brandHoldsTheLeftEdge(
          [
            '.compact-brand',
            '.drawer-trigger',
            '.breadcrumb',
            '.utility-nav',
            '.search-trigger',
          ],
          width,
        ),
        `inner page at ${width}px`,
      ).toBe(true);
    }
  });

  it('the utility nav holds the right edge', () => {
    // The counterweight: without it the header packs from the start and the
    // section links crowd the wordmark. Removing the auto margin fails here.
    for (const width of WIDTHS) {
      const pulledRight =
        resolve(globalCss, '.utility-nav', 'margin-left', width) === 'auto';
      expect(pulledRight || END_LIKE.has(justify(width)), `at ${width}px`).toBe(
        true,
      );
    }
  });

  it('the nav brand rule is gone', () => {
    expect(globalCss).not.toMatch(/^\s*\.brand\s*\{/m);
  });
});

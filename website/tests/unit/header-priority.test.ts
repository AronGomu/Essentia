import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from '../support/css';

const globalCss = readFileSync(
  fileURLToPath(new URL('../../src/styles/global.css', import.meta.url)),
  'utf-8',
);
const baseLayoutSource = readFileSync(
  fileURLToPath(new URL('../../src/layouts/BaseLayout.astro', import.meta.url)),
  'utf-8',
);

const WIDTHS = [1440, 1280, 900, 704, 390];

describe('header priority', () => {
  it('the header is never offset by the sidebar', () => {
    for (const width of WIDTHS) {
      const value = resolve(globalCss, '.site-header', 'margin-left', width);
      expect(
        value === undefined || value === '0',
        `at ${width}px, got ${value}`,
      ).toBe(true);
    }
  });

  it('the header paints above the rail', () => {
    expect(resolve(globalCss, '.site-header', 'z-index', 1280)).toBe(
      'calc(var(--z-sticky) + 2)',
    );
  });

  it('the rail docks under the header', () => {
    expect(resolve(globalCss, '.desktop-catalog', 'inset', 1280)).toBe(
      'var(--header) auto 0 0',
    );
  });

  it('the header is not a containing block for fixed children', () => {
    // `.desktop-catalog` is `position: fixed` and is a DOM descendant of the
    // header, so *any* of these on `.site-header` re-parents the rail onto the
    // header box: `inset: var(--header) auto 0 0` would then resolve against a
    // 64px-tall header instead of the viewport and collapse the rail.
    // `container-type` is the one that bites in review — it reads as a
    // harmless modernisation and creates a containing block for fixed
    // descendants all the same.
    const properties = [
      'transform',
      'filter',
      'backdrop-filter',
      'will-change',
      'contain',
      'container-type',
      'container',
      'perspective',
      'translate',
      'rotate',
      'scale',
    ];
    for (const property of properties) {
      for (const width of WIDTHS) {
        expect(
          resolve(globalCss, '.site-header', property, width),
          `${property} at ${width}px`,
        ).toBeUndefined();
      }
    }
  });

  it('the hamburger is in flow', () => {
    for (const width of WIDTHS) {
      expect(
        resolve(globalCss, '.drawer-trigger', 'position', width),
        `at ${width}px`,
      ).not.toBe('fixed');
    }
  });

  it('the header reserves no room for a floating hamburger', () => {
    // Not `padding-left === undefined`: the header has always had an inline
    // gutter, supplied by the `padding` shorthand, so that assertion was only
    // ever reading a longhand nobody authors. Restoring the deleted
    // reservation — `padding: 0.7rem clamp(1rem, 3vw, 3rem) 0.7rem 8.8rem` —
    // left it green with the brand pushed 141px right.
    //
    // A reservation is by definition asymmetric, so compare the two sides and
    // pin the gutter itself.
    for (const width of WIDTHS) {
      const left = resolve(globalCss, '.site-header', 'padding-left', width);
      const right = resolve(globalCss, '.site-header', 'padding-right', width);
      expect(left, `padding-left at ${width}px`).toBe(right);
      expect(left, `padding-left at ${width}px`).toBe('clamp(1rem, 3vw, 3rem)');
    }
  });

  it('the navigation island renders inside the header, after the brand', () => {
    const headerIndex = baseLayoutSource.indexOf('<header class="site-header"');
    const navigationIndex = baseLayoutSource.indexOf('<Navigation');
    const brandIndex = baseLayoutSource.indexOf('class="compact-brand"');
    const utilityNavIndex = baseLayoutSource.indexOf(
      '<nav class="utility-nav"',
    );
    expect(headerIndex).toBeLessThan(navigationIndex);
    expect(brandIndex).toBeLessThan(navigationIndex);
    expect(navigationIndex).toBeLessThan(utilityNavIndex);
  });

  it('the content column still clears the rail', () => {
    expect(resolve(globalCss, 'main', 'margin-left', 1280)).toBe(
      'var(--sidebar)',
    );
    expect(resolve(globalCss, 'main', 'margin-left', 390)).toBe('0');
  });
});

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { resolve } from '../support/css';

const root = join(__dirname, '..', '..');
const css = readFileSync(join(root, 'src/styles/global.css'), 'utf8');
const baseLayout = readFileSync(
  join(root, 'src/layouts/BaseLayout.astro'),
  'utf8',
);
const findPalette = readFileSync(
  join(root, 'src/components/FindPalette.svelte'),
  'utf8',
);
const navigation = readFileSync(
  join(root, 'src/components/Navigation.svelte'),
  'utf8',
);

describe('compact header overflow menu', () => {
  it('the overflow trigger hides on desktop', () => {
    expect(resolve(css, '.utility-more', 'display', 900)).toBe('none');
  });

  it('the overflow trigger shows on phones', () => {
    expect(resolve(css, '.utility-more', 'display', 390)).toBe('inline-flex');
  });

  it('the menu is a plain row on desktop', () => {
    expect(resolve(css, '.utility-menu', 'display', 900)).toBe('flex');
  });

  it('the menu is closed on phones', () => {
    expect(resolve(css, '.utility-menu', 'display', 390)).toBe('none');
  });

  it('the open menu is a panel', () => {
    expect(css).toMatch(/\.utility-menu:popover-open\s*\{[^}]*display:\s*grid/);
  });

  it('full labels hide on phones', () => {
    expect(resolve(css, '.label-full', 'display', 390)).toBe('none');
    const desktop = resolve(css, '.label-full', 'display', 900);
    expect(desktop === undefined || desktop !== 'none').toBe(true);
  });

  it('short labels hide on desktop', () => {
    expect(resolve(css, '.label-short', 'display', 900)).toBe('none');
    const phone = resolve(css, '.label-short', 'display', 390);
    expect(phone === undefined || phone !== 'none').toBe(true);
  });

  it('the popover is wired', () => {
    expect(baseLayout).toContain('popovertarget="utility-menu"');
    expect(baseLayout).toContain('id="utility-menu"');
    expect(baseLayout).toContain(' popover');
  });

  it('the docs link keeps a stable accessible name', () => {
    expect(baseLayout).toContain('aria-label="Learn about Essentia"');
  });

  it("check-chrome's literals survive", () => {
    expect(baseLayout).toContain('>Learn about Essentia</span>');
    expect(baseLayout).toContain('>Blog</span>');
    expect(baseLayout).toContain('>Decks</span>');
  });

  it('Find keeps its label element and a name', () => {
    expect(findPalette).toContain('<span class="label-full">Find</span>');
    expect(findPalette).toContain('aria-label="Find"');
  });

  it('Catalog keeps its label element and a name', () => {
    const drawerTrigger = navigation.slice(
      navigation.indexOf('class="drawer-trigger"') - 20,
      navigation.indexOf(
        '</button>',
        navigation.indexOf('class="drawer-trigger"'),
      ),
    );
    expect(drawerTrigger).toContain('class="label-full"');
    expect(drawerTrigger).toContain('aria-label={drawerLabel}');
  });

  it('the utility nav still holds the right edge', () => {
    for (const w of [1440, 1280, 900, 704, 390]) {
      expect(resolve(css, '.utility-nav', 'margin-left', w)).toBe('auto');
    }
  });
});

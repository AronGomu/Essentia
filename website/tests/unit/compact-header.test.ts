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

  // 900px used to be "desktop" for the labels, back when the single 44rem
  // breakpoint owned every stage. The label swap is stage 1 now and fires at
  // 64rem, so 900px is *inside* it — these two read 1440px instead.
  it('full labels hide on phones', () => {
    expect(resolve(css, '.label-full', 'display', 390)).toBe('none');
    const desktop = resolve(css, '.label-full', 'display', 1440);
    expect(desktop === undefined || desktop !== 'none').toBe(true);
  });

  it('short labels hide on desktop', () => {
    expect(resolve(css, '.label-short', 'display', 1440)).toBe('none');
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

/**
 * `feedback.md` line 8.6 asks for an *ordered* width budget, not one step:
 * first drop "about Essentia", then shrink Find to a square icon button, then
 * regroup the links into the `⋯` menu. T5 collapsed all three into a single
 * `@media (max-width: 44rem)`, so the shortened `Learn` label only ever
 * rendered inside the already-collapsed popover — never in the header row it
 * was meant to save space in.
 *
 * The table below is the contract. Each row is a viewport width and the value
 * every staged declaration must resolve to there; `undefined` means nothing
 * declares it, which is how `.label-full` reads above stage 1.
 */
const STAGES: Array<{
  width: number;
  stage: 0 | 1 | 2 | 3;
  labelFull: string | undefined;
  labelShort: string;
  searchMinWidth: string;
  utilityMore: string;
  utilityMenu: string;
}> = [
  // Stage 0 — desktop: full labels, wide Find, links inline.
  { width: 1440, stage: 0, labelFull: undefined, labelShort: 'none', searchMinWidth: 'min(22rem, 45vw)', utilityMore: 'none', utilityMenu: 'flex' }, // prettier-ignore
  { width: 1025, stage: 0, labelFull: undefined, labelShort: 'none', searchMinWidth: 'min(22rem, 45vw)', utilityMore: 'none', utilityMenu: 'flex' }, // prettier-ignore
  // Stage 1 — 64rem: short labels. `Learn` / `Blog` / `Decks` inline, no `⋯`.
  { width: 1024, stage: 1, labelFull: 'none', labelShort: 'inline', searchMinWidth: 'min(22rem, 45vw)', utilityMore: 'none', utilityMenu: 'flex' }, // prettier-ignore
  { width: 897, stage: 1, labelFull: 'none', labelShort: 'inline', searchMinWidth: 'min(22rem, 45vw)', utilityMore: 'none', utilityMenu: 'flex' }, // prettier-ignore
  // Stage 2 — 56rem: Find collapses to a square, links still inline.
  { width: 896, stage: 2, labelFull: 'none', labelShort: 'inline', searchMinWidth: '0', utilityMore: 'none', utilityMenu: 'flex' }, // prettier-ignore
  { width: 705, stage: 2, labelFull: 'none', labelShort: 'inline', searchMinWidth: '0', utilityMore: 'none', utilityMenu: 'flex' }, // prettier-ignore
  // Stage 3 — 44rem: exactly what T5 shipped, icons plus the `⋯` popover.
  { width: 704, stage: 3, labelFull: 'none', labelShort: 'inline', searchMinWidth: '0', utilityMore: 'inline-flex', utilityMenu: 'none' }, // prettier-ignore
  { width: 400, stage: 3, labelFull: 'none', labelShort: 'inline', searchMinWidth: '0', utilityMore: 'inline-flex', utilityMenu: 'none' }, // prettier-ignore
];

describe('staged header degradation', () => {
  for (const row of STAGES) {
    it(`stage ${row.stage} at ${row.width}px`, () => {
      expect(resolve(css, '.label-full', 'display', row.width)).toBe(
        row.labelFull,
      );
      expect(resolve(css, '.label-short', 'display', row.width)).toBe(
        row.labelShort,
      );
      expect(resolve(css, '.search-trigger', 'min-width', row.width)).toBe(
        row.searchMinWidth,
      );
      expect(resolve(css, '.utility-more', 'display', row.width)).toBe(
        row.utilityMore,
      );
      expect(resolve(css, '.utility-menu', 'display', row.width)).toBe(
        row.utilityMenu,
      );
    });
  }

  it('the stages are ordered — each one only ever adds to the last', () => {
    const stageOf = (width: number) =>
      STAGES.find((row) => row.width === width)!;
    // Stage 2 keeps stage 1's labels; stage 3 keeps stage 2's Find.
    expect(stageOf(896).labelShort).toBe(stageOf(897).labelShort);
    expect(stageOf(896).labelFull).toBe(stageOf(897).labelFull);
    expect(stageOf(704).searchMinWidth).toBe(stageOf(896).searchMinWidth);
    expect(stageOf(704).labelShort).toBe(stageOf(896).labelShort);
  });

  it('the `⌘ K` hint goes with the Find collapse, not before it', () => {
    expect(resolve(css, '.search-trigger kbd', 'display', 897)).toBeUndefined();
    expect(resolve(css, '.search-trigger kbd', 'display', 896)).toBe('none');
    expect(resolve(css, '.search-trigger kbd', 'display', 400)).toBe('none');
  });

  it('the `⋯` menu links keep the sizing `.utility-nav a` gives them', () => {
    // Unlayered, so it beats `.utility-menu a` in `@layer layout`. Deleting it
    // as "dead" would silently reflow the popover.
    expect(css).toMatch(
      /\.utility-nav a\s*\{[^}]*min-height:\s*2\.45rem[^}]*font-size:\s*0\.85rem/,
    );
  });
});

import { describe, expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  BREADCRUMB,
  COMPACT_VIEWPORT_PX,
  HEADER_CONTROLS,
  HEADER_GAP,
  HEADER_MEASUREMENTS,
  HEADER_PADDING_INLINE,
  headerRowBudget,
} from '../../shared/header-row.mjs';
import { lengthPx, resolve } from '../support/css';

const here = path.dirname(fileURLToPath(import.meta.url));
const websiteRoot = path.resolve(here, '../..');

const globalCss = await readFile(
  path.join(websiteRoot, 'src/styles/global.css'),
  'utf8',
);

/**
 * Run the real build guard. Resolves rather than rejects on a non-zero exit,
 * because "still exits 0 when it warns" is one of the things under test.
 */
function runGuard(
  env: Record<string, string> = {},
): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((done) => {
    execFile(
      process.execPath,
      ['scripts/check-header-row.mjs'],
      { cwd: websiteRoot, env: { ...process.env, ...env } },
      (error, stdout, stderr) => {
        const failure = error as (Error & { code?: number }) | null;
        done({ code: failure?.code ?? 0, stdout, stderr });
      },
    );
  });
}

/** The authored value of `selector { property }` at the compact viewport. */
function authored(selector: string, property: string): string {
  const value = resolve(globalCss, selector, property, COMPACT_VIEWPORT_PX);
  if (value === undefined)
    throw new Error(
      `global.css declares no ${property} for ${selector} at ${COMPACT_VIEWPORT_PX}px`,
    );
  return value;
}

/** Re-derive a measurement from global.css, ignoring the `px` it claims. */
function fromCss(measurement: {
  cssPx: readonly (readonly string[])[];
  intrinsicPx: number;
}): number {
  return measurement.cssPx.reduce(
    (total, pair) =>
      total + lengthPx(authored(pair[0]!, pair[1]!), COMPACT_VIEWPORT_PX),
    measurement.intrinsicPx,
  );
}

describe('header-row constants track global.css', () => {
  // The reviewer's finding: nothing cross-checked the hand-copied widths, so
  // `search-trigger` sat at 48 against a measured 39.8, `drawer-trigger` at 36
  // against 34, and `BREADCRUMB_MIN_PX` at 64 against `min-width: 0`. Growing
  // `.utility-more` to 6rem overflowed the real header with the guard silent.
  it.each(HEADER_MEASUREMENTS)(
    '$name is what global.css says it is',
    (measurement) => {
      expect(fromCss(measurement), measurement.name).toBeCloseTo(
        measurement.px,
        4,
      );
    },
  );

  it('budget covers exactly the rendered controls', () => {
    expect(HEADER_CONTROLS.map((control) => control.name)).toEqual([
      'compact-brand',
      'drawer-trigger',
      'utility-learn',
      'utility-blog',
      'utility-decks',
      'search-trigger',
    ]);
  });

  it('the budget is the sum of the CSS-derived widths, not of its own constants', () => {
    const controls = HEADER_CONTROLS.map(fromCss);
    const items = [...controls, fromCss(BREADCRUMB)];
    const expected =
      items.reduce((total, width) => total + width, 0) +
      fromCss(HEADER_GAP) * (items.length - 1);

    const budget = headerRowBudget(COMPACT_VIEWPORT_PX);
    expect(budget.contentPx).toBeCloseTo(expected, 1);
    expect(budget.availablePx).toBeCloseTo(
      COMPACT_VIEWPORT_PX - fromCss(HEADER_PADDING_INLINE),
      4,
    );
  });

  it('a width that stops being a static length is an error, not a skip', () => {
    // `.search-trigger { min-width }` is `min(22rem, 45vw)` until stage 2
    // drops it to 0 at 56rem. If that stage were deleted, the cross-check must
    // fail loudly rather than treat the term as zero.
    expect(() => lengthPx('var(--sidebar)', COMPACT_VIEWPORT_PX)).toThrow(
      /not a static CSS length/,
    );
    expect(lengthPx('min(22rem, 45vw)', COMPACT_VIEWPORT_PX)).toBe(180);
  });
});

describe('header-row', () => {
  it('the compact header fits 400px with a breadcrumb', () => {
    const budget = headerRowBudget(400);
    expect(budget.fits).toBe(true);
    expect(budget.overflowPx).toBe(0);
    expect(budget.contentPx).toBe(317.2);
  });

  it('fits at 400px with a breadcrumb', () => {
    const budget = headerRowBudget(400, { withBreadcrumb: true });
    expect(budget.fits).toBe(true);
  });

  it('the compact header fits 400px without one', () => {
    const budget = headerRowBudget(400, { withBreadcrumb: false });
    expect(budget.fits).toBe(true);
    expect(budget.contentPx).toBe(310);
  });

  it('a fatter control is reported, not thrown', () => {
    const budget = headerRowBudget(200);
    expect(budget.fits).toBe(false);
    expect(budget.overflowPx).toBeGreaterThan(0);
  });

  it('the budget subtracts the header padding', () => {
    expect(headerRowBudget(400).availablePx).toBe(368);
  });

  it('the build runs the guard', async () => {
    const pkg = JSON.parse(
      await readFile(path.join(websiteRoot, 'package.json'), 'utf8'),
    );
    expect(
      pkg.scripts.build.endsWith('node scripts/check-header-row.mjs'),
    ).toBe(true);
  });

  it('the guard is silent at the real compact viewport', async () => {
    const { code, stderr } = await runGuard();
    expect(code).toBe(0);
    expect(stderr).toBe('');
  });

  it('the guard warns — and still exits 0 — when the row overflows', async () => {
    // Runs the branch rather than grepping for `console.warn`. The greps this
    // replaces would have passed `process.exitCode = 1` unchanged, and never
    // executed a single line of the warning path.
    const { code, stderr } = await runGuard({ HEADER_ROW_VIEWPORT_PX: '200' });
    expect(code).toBe(0);
    expect(stderr).toMatch(/\[warn\] site-header may wrap at 200px/);
    expect(stderr).toMatch(/with a breadcrumb: needs [\d.]+px, has 168px/);
    expect(stderr).not.toMatch(/Error/);
  });

  it('the page ships the runtime guard', async () => {
    const source = await readFile(
      path.join(websiteRoot, 'src/layouts/BaseLayout.astro'),
      'utf8',
    );
    expect(source).toMatch(/site-header wraps to/);
    expect(source).toMatch(/console\.warn/);
    expect(source).not.toMatch(/console\.error/);
  });

  it('the breadcrumb can shrink', () => {
    expect(resolve(globalCss, '.breadcrumb', 'min-width', 390)).toBe('0');
  });

  it('the breadcrumb cannot wrap', () => {
    expect(resolve(globalCss, '.breadcrumb ol', 'flex-wrap', 390)).toBe(
      'nowrap',
    );
  });

  it('the last crumb ellipsises', () => {
    expect(globalCss).toMatch(
      /\.breadcrumb li\s*\{[^}]*text-overflow:\s*ellipsis/,
    );
  });
});

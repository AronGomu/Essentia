import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { headerRowBudget } from '../../shared/header-row.mjs';
import { resolve } from '../support/css';

const here = path.dirname(fileURLToPath(import.meta.url));
const websiteRoot = path.resolve(here, '../..');

describe('header-row', () => {
  it('the compact header fits 400px with a breadcrumb', () => {
    const budget = headerRowBudget(400);
    expect(budget.fits).toBe(true);
    expect(budget.overflowPx).toBe(0);
    expect(budget.contentPx).toBe(248);
  });

  it('the compact header fits 400px without one', () => {
    const budget = headerRowBudget(400, { withBreadcrumb: false });
    expect(budget.fits).toBe(true);
    expect(budget.contentPx).toBe(176.8);
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

  it('the guard script never fails the build', async () => {
    const source = await readFile(
      path.join(websiteRoot, 'scripts/check-header-row.mjs'),
      'utf8',
    );
    expect(source).not.toMatch(/process\.exit\(1\)/);
    expect(source).not.toMatch(/throw/);
  });

  it('the guard warns rather than errors', async () => {
    const source = await readFile(
      path.join(websiteRoot, 'scripts/check-header-row.mjs'),
      'utf8',
    );
    expect(source).toMatch(/console\.warn/);
    expect(source).not.toMatch(/console\.error/);
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

  it('the breadcrumb can shrink', async () => {
    const css = await readFile(
      path.join(websiteRoot, 'src/styles/global.css'),
      'utf8',
    );
    expect(resolve(css, '.breadcrumb', 'min-width', 390)).toBe('0');
  });

  it('the breadcrumb cannot wrap', async () => {
    const css = await readFile(
      path.join(websiteRoot, 'src/styles/global.css'),
      'utf8',
    );
    expect(resolve(css, '.breadcrumb ol', 'flex-wrap', 390)).toBe('nowrap');
  });

  it('the last crumb ellipsises', async () => {
    const css = await readFile(
      path.join(websiteRoot, 'src/styles/global.css'),
      'utf8',
    );
    expect(css).toMatch(/\.breadcrumb li\s*\{[^}]*text-overflow:\s*ellipsis/);
  });
});

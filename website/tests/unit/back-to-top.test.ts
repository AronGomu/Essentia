import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { shouldShowBackToTop } from '../../src/lib/back-to-top';

describe('shouldShowBackToTop', () => {
  it('hides at the top of the page', () => {
    expect(shouldShowBackToTop(0)).toBe(false);
  });

  it('hides just below the threshold', () => {
    expect(shouldShowBackToTop(479)).toBe(false);
  });

  it('shows at the threshold', () => {
    expect(shouldShowBackToTop(480)).toBe(true);
  });

  it('honours a custom threshold', () => {
    expect(shouldShowBackToTop(100, 50)).toBe(true);
  });

  it('ignores nonsense scroll positions', () => {
    expect(shouldShowBackToTop(-10)).toBe(false);
    expect(shouldShowBackToTop(Number.NaN)).toBe(false);
  });

  it('anchors the control bottom-right', () => {
    const css = readFileSync(
      path.resolve(__dirname, '../../src/styles/global.css'),
      'utf8',
    );
    const match = css.match(/\.back-to-top\s*\{[^}]*\}/);
    expect(match).not.toBeNull();
    const block = match ? match[0] : '';
    expect(block).toMatch(/position:\s*fixed/);
    expect(block).toMatch(/right:\s*clamp\(/);
    expect(block).toMatch(/bottom:\s*clamp\(/);
    expect(block).not.toMatch(/left:/);
  });

  it('the layout renders the control', () => {
    const source = readFileSync(
      path.resolve(__dirname, '../../src/layouts/BaseLayout.astro'),
      'utf8',
    );
    const controlIndex = source.indexOf('<BackToTop');
    const footerIndex = source.indexOf('<footer class="site-footer"');
    expect(controlIndex).toBeGreaterThan(-1);
    expect(footerIndex).toBeGreaterThan(-1);
    expect(controlIndex).toBeLessThan(footerIndex);
  });
});

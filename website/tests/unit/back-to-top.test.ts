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
    // The only input that distinguishes the `Number.isFinite` guard: `-10` and
    // `NaN` are both already below the threshold, so without this line the
    // guard could be deleted with the suite still green.
    expect(shouldShowBackToTop(Number.POSITIVE_INFINITY)).toBe(false);
    expect(shouldShowBackToTop(Number.NEGATIVE_INFINITY)).toBe(false);
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
    // Anchored, not a prefix match: `<BackToTop` also matches
    // `<BackToTopButton />`, so renaming the component kept this green.
    const control = /<BackToTop\s*\/>/.exec(source);
    const footerIndex = source.indexOf('<footer class="site-footer"');
    expect(control).not.toBeNull();
    expect(footerIndex).toBeGreaterThan(-1);
    expect(control!.index).toBeLessThan(footerIndex);
    expect(source).toContain(
      "import BackToTop from '../components/BackToTop.astro'",
    );
  });
});

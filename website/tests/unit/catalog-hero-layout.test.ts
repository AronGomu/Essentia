import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { resolve } from '../support/css';

const css = readFileSync(
  new URL('../../src/styles/global.css', import.meta.url),
  'utf-8',
);

describe('catalog hero layout tightening', () => {
  it('the row is not capped — it spans the shell, as it did before the pass', () => {
    // `width: min(100%, 72rem)` was inert at ordinary widths: at a 1440px
    // viewport with the rail expanded `.page-shell` resolves to 1136px, well
    // under the 1152px cap, so it only started binding above ~1456px. It is
    // gone; the row is the shell, exactly as at `main`.
    expect(resolve(css, '.catalog-hero', 'width', 1440)).toBeUndefined();
    expect(
      resolve(css, '.catalog-hero', 'margin-inline', 1440),
    ).toBeUndefined();
  });

  it('the columns sit closer together', () => {
    expect(resolve(css, '.catalog-hero', 'gap', 1440)).toBe(
      'var(--hero-gutter)',
    );
    expect(resolve(css, '.catalog-hero', '--hero-gutter', 1440)).toBe(
      'clamp(1.5rem, 2.5vw, 3rem)',
    );
  });

  it('padding, not the tracks, absorbs the gutter the row gave up', () => {
    // `fr` tracks swallow every pixel the gap releases, so shrinking the gap
    // alone grows both columns — the bug this replaces. The row keeps holding
    // `main`'s `clamp(2rem, 6vw, 7rem)` out of the track space and spends the
    // difference as symmetric padding, so the tracks resolve against the same
    // width as before while the visible gutter more than halves.
    expect(resolve(css, '.catalog-hero', '--hero-track-inset', 1440)).toBe(
      'clamp(2rem, 6vw, 7rem)',
    );
    expect(resolve(css, '.catalog-hero', 'padding-inline', 1440)).toBe(
      'calc((var(--hero-track-inset) - var(--hero-gutter)) / 2)',
    );
    // Stacked, there is no gutter to compensate for: the hero returns to the
    // shell edges so it lines up with the gallery below it.
    expect(resolve(css, '.catalog-hero', 'padding-inline', 900)).toBe('0');
  });

  it('the column ratio is untouched', () => {
    expect(resolve(css, '.catalog-hero', 'grid-template-columns', 1440)).toBe(
      'minmax(0, 1.25fr) minmax(18rem, 0.75fr)',
    );
  });

  it('the hero art is gone on phones', () => {
    expect(resolve(css, '.catalog-hero-art', 'display', 390)).toBe('none');
  });

  it('the hero art goes as soon as the hero stacks', () => {
    // The feedback stated the width as a layout condition: "when everything is
    // placed on 1 column and Title on page + description is placed before
    // hero-image". That condition starts at the single-column switch (64rem),
    // not at 44rem — across 704–1024px the hero was already stacked with the
    // art still under the prose. Both must flip at the same width.
    expect(resolve(css, '.catalog-hero', 'grid-template-columns', 1024)).toBe(
      '1fr',
    );
    expect(resolve(css, '.catalog-hero-art', 'display', 1024)).toBe('none');
    expect(resolve(css, '.catalog-hero-art', 'display', 900)).toBe('none');
    expect(resolve(css, '.catalog-hero-art', 'display', 1025)).not.toBe('none');
  });

  it('the stacked layout is untouched', () => {
    expect(resolve(css, '.catalog-hero-art', 'max-width', 900)).toBe('24rem');
  });

  it('the vertical rhythm is untouched', () => {
    expect(resolve(css, '.catalog-hero', 'padding-block', 1440)).toBe(
      'var(--space-2) var(--space-4)',
    );
  });
});

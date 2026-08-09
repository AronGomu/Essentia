import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { resolve } from '../support/css';

const css = readFileSync(
  new URL('../../src/styles/global.css', import.meta.url),
  'utf-8',
);

describe('catalog hero layout tightening', () => {
  it('the hero row is capped and centred', () => {
    expect(resolve(css, '.catalog-hero', 'width', 1440)).toBe(
      'min(100%, 72rem)',
    );
    expect(resolve(css, '.catalog-hero', 'margin-inline', 1440)).toBe('auto');
  });

  it('the columns sit closer together', () => {
    expect(resolve(css, '.catalog-hero', 'gap', 1440)).toBe(
      'clamp(1.5rem, 2.5vw, 3rem)',
    );
  });

  it('the column ratio is untouched', () => {
    expect(resolve(css, '.catalog-hero', 'grid-template-columns', 1440)).toBe(
      'minmax(0, 1.25fr) minmax(18rem, 0.75fr)',
    );
  });

  it('the hero art is gone on phones', () => {
    expect(resolve(css, '.catalog-hero-art', 'display', 390)).toBe('none');
  });

  it('the hero art survives on tablets', () => {
    expect(resolve(css, '.catalog-hero-art', 'display', 900)).not.toBe('none');
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

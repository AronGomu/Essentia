import { describe, expect, it } from 'vitest';
import { assertHeroImage } from '../../scripts/content/identity.mjs';

describe('assertHeroImage', () => {
  it('accepts a valid hero image', () => {
    expect(() =>
      assertHeroImage(
        { slug: 'nekroz', heroImage: '/art/nekroz-hero.webp' },
        new Set(['/art/nekroz-hero.webp']),
        () => true,
      ),
    ).not.toThrow();
  });

  it('rejects a missing heroImage', () => {
    expect(() =>
      assertHeroImage(
        { slug: 'nekroz' },
        new Set(['/art/nekroz-hero.webp']),
        () => true,
      ),
    ).toThrow('content: section nekroz: heroImage is required');
  });

  it('rejects a mismatched path', () => {
    expect(() =>
      assertHeroImage(
        { slug: 'nekroz', heroImage: '/art/trishula.webp' },
        new Set(['/art/nekroz-hero.webp']),
        () => true,
      ),
    ).toThrow('must match /art/nekroz-hero.webp');
  });

  it('rejects a missing file', () => {
    expect(() =>
      assertHeroImage(
        { slug: 'nekroz', heroImage: '/art/nekroz-hero.webp' },
        new Set(['/art/nekroz-hero.webp']),
        () => false,
      ),
    ).toThrow('heroImage file public/art/nekroz-hero.webp is missing');
  });

  it('rejects missing provenance', () => {
    expect(() =>
      assertHeroImage(
        { slug: 'nekroz', heroImage: '/art/nekroz-hero.webp' },
        new Set(),
        () => true,
      ),
    ).toThrow('no entry in content/art-provenance.json');
  });
});

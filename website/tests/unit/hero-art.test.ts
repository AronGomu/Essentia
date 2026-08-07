import { describe, expect, it } from 'vitest';
import {
  HD_ROOT,
  heroSourceFor,
  provenanceTool,
} from '../../scripts/make-hero-art.mjs';
import { HERO_SOURCES } from '../../scripts/check-preflight.mjs';

const never = () => false;
const always = () => true;

describe('heroSourceFor', () => {
  it('falls back to the committed 624 px original when no upscale exists', () => {
    expect(heroSourceFor('nekroz', never)).toEqual({
      path: 'original_images/Ritual/Nekroz of Trishula.jpg',
      hd: false,
    });
  });

  it('prefers the manual upscale at the mirrored path', () => {
    expect(heroSourceFor('nekroz', always)).toEqual({
      path: `${HD_ROOT}/Ritual/Nekroz of Trishula.jpg`,
      hd: true,
    });
  });

  it('mirrors the original layout for every section', () => {
    for (const [slug, original] of Object.entries(HERO_SOURCES)) {
      const upscaled = heroSourceFor(slug, always).path;
      expect(upscaled).toBe(
        original.replace('original_images/', `${HD_ROOT}/`),
      );
    }
  });

  it('only consults the upscaled path, never the original', () => {
    const asked: string[] = [];
    heroSourceFor('shaddoll', (path: string) => {
      asked.push(path);
      return false;
    });
    expect(asked).toEqual([`${HD_ROOT}/Fusion/El Shaddoll Construct.jpg`]);
  });

  it('rejects an unknown slug', () => {
    expect(() => heroSourceFor('not-a-section', always)).toThrow(
      'unknown hero slug not-a-section',
    );
  });
});

describe('provenanceTool', () => {
  it('records an HD upscale with its pixel size', () => {
    expect(provenanceTool({ hd: true }, 1920)).toBe(
      'sharp webp q90 (manual HD upscale, 1920 px)',
    );
  });

  it('marks a native conversion as still pending an upscale', () => {
    expect(provenanceTool({ hd: false }, 624)).toBe(
      'sharp webp q90 (native 624 px; HD upscale pending)',
    );
  });
});

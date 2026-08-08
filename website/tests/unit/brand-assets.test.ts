import { readdirSync, readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import sharp from 'sharp';
import {
  BRAND_ASSETS,
  BRAND_SOURCES,
  renderBrandAsset,
} from '../../scripts/make-brand-assets.mjs';

const brandDir = new URL('../../public/brand/', import.meta.url);

function assetPath(name: string): string {
  return fileURLToPath(new URL(name, brandDir));
}

const css = readFileSync(
  new URL('../../src/styles/global.css', import.meta.url),
  'utf-8',
);

const baseLayout = readFileSync(
  new URL('../../src/layouts/BaseLayout.astro', import.meta.url),
  'utf-8',
);

const seo = readFileSync(
  new URL('../../src/components/Seo.astro', import.meta.url),
  'utf-8',
);

const manifest = JSON.parse(
  readFileSync(
    new URL('../../public/site.webmanifest', import.meta.url),
    'utf-8',
  ),
);

const repoRoot = new URL('../../../', import.meta.url);

const trimmedMasters = new Map<string, Promise<Buffer>>();
function trimmedMaster(source: keyof typeof BRAND_SOURCES): Promise<Buffer> {
  let pending = trimmedMasters.get(source);
  if (!pending) {
    pending = sharp(fileURLToPath(new URL(BRAND_SOURCES[source], repoRoot)))
      .trim()
      .toBuffer();
    trimmedMasters.set(source, pending);
  }
  return pending;
}

function spec(name: string) {
  const asset = BRAND_ASSETS.find((entry) => entry.name === name);
  expect(asset, `no BRAND_ASSETS entry named ${name}`).toBeDefined();
  return asset!;
}

/**
 * `renderBrandAsset` is exported to be testable and the committed derivatives
 * alone cannot exercise it: they would keep passing after the renderer stopped
 * honouring `size`, `opaque`, or the fixed canvas. Re-derive from the masters
 * and assert the contract each spec field encodes.
 */
describe('renderBrandAsset', () => {
  it('renders a square icon at the requested size', async () => {
    const asset = spec('favicon-32.png');
    const bytes = await renderBrandAsset(
      await trimmedMaster('letter-mark'),
      asset,
    );
    const metadata = await sharp(bytes).metadata();
    expect(metadata.format).toBe('png');
    expect(metadata.width).toBe(32);
    expect(metadata.height).toBe(32);
  });

  it('flattens an opaque icon onto the blackfoil substrate', async () => {
    const asset = spec('apple-touch-icon-180.png');
    const bytes = await renderBrandAsset(
      await trimmedMaster('letter-mark'),
      asset,
    );
    const metadata = await sharp(bytes).metadata();
    expect(metadata.width).toBe(180);
    expect(metadata.height).toBe(180);
    // iOS composites the apple-touch icon over white, so any surviving
    // transparency reads as a white halo around the mark.
    expect((await sharp(bytes).stats()).isOpaque).toBe(true);
  });

  it('keeps transparency on the icons that are not flattened', async () => {
    const asset = spec('icon-192.png');
    expect(asset.opaque).toBeUndefined();
    const bytes = await renderBrandAsset(
      await trimmedMaster('letter-mark'),
      asset,
    );
    expect((await sharp(bytes).stats()).isOpaque).toBe(false);
  });

  it('renders the social card on its fixed opaque canvas', async () => {
    const asset = spec('og-default-1200x630.png');
    const bytes = await renderBrandAsset(
      await trimmedMaster('wordmark'),
      asset,
    );
    const metadata = await sharp(bytes).metadata();
    expect(metadata.width).toBe(1200);
    expect(metadata.height).toBe(630);
    expect((await sharp(bytes).stats()).isOpaque).toBe(true);
  });

  it('scales a width-only asset proportionally', async () => {
    const asset = spec('wordmark-320.png');
    const master = await trimmedMaster('wordmark');
    const source = await sharp(master).metadata();
    const bytes = await renderBrandAsset(master, asset);
    const metadata = await sharp(bytes).metadata();
    expect(metadata.width).toBe(320);
    // Proportional, not letterboxed into a square: the height follows the
    // master's aspect ratio to within a rounding pixel.
    const expectedHeight = Math.round((320 * source.height!) / source.width!);
    expect(Math.abs(metadata.height! - expectedHeight)).toBeLessThanOrEqual(1);
  });
});

describe('brand assets', () => {
  it('derives every public brand asset', () => {
    for (const asset of BRAND_ASSETS) {
      const bytes = readFileSync(assetPath(asset.name));
      expect(bytes.length).toBeGreaterThan(0);
    }
  });

  it('keeps icon assets small', () => {
    for (const asset of BRAND_ASSETS) {
      const bytes = readFileSync(assetPath(asset.name));
      expect(bytes.length).toBeLessThan(150 * 1024);
    }
  });

  it('apple-touch and og are opaque', async () => {
    for (const name of [
      'apple-touch-icon-180.png',
      'og-default-1200x630.png',
    ]) {
      const stats = await sharp(assetPath(name)).stats();
      expect(stats.isOpaque).toBe(true);
    }
  });

  it('icons are square', async () => {
    for (const name of [
      'favicon-32.png',
      'icon-192.png',
      'icon-512.png',
      'apple-touch-icon-180.png',
    ]) {
      const expectedSize = Number(name.match(/-(\d+)\.png$/)?.[1]);
      const metadata = await sharp(assetPath(name)).metadata();
      expect(metadata.width).toBe(expectedSize);
      expect(metadata.height).toBe(expectedSize);
    }
  });

  it('og card is exactly 1200x630', async () => {
    const metadata = await sharp(
      assetPath('og-default-1200x630.png'),
    ).metadata();
    expect(metadata.width).toBe(1200);
    expect(metadata.height).toBe(630);
  });

  it('head links icon, apple-touch and manifest', () => {
    expect(baseLayout).toContain('rel="icon"');
    expect(baseLayout).toContain('rel="apple-touch-icon"');
    expect(baseLayout).toContain('rel="manifest"');
  });

  it('manifest names the project and the dark substrate', () => {
    expect(manifest.name).toContain('Essentia');
    expect(manifest.theme_color).toBe('#020202');
  });

  it('never claims maskable for icons rendered without a safe zone', () => {
    // The icons come from renderBrandAsset with fit: 'contain' over a trimmed
    // master, so the glyph reaches the canvas edge on at least one axis.
    // Android's maskable contract reserves a 20% safe zone and would crop it.
    for (const icon of manifest.icons as Array<{ purpose?: string }>) {
      expect(icon.purpose ?? 'any').toBe('any');
    }
  });

  it('header brand keeps an accessible name', () => {
    const brandMatch = baseLayout.match(
      /<a class="compact-brand"[\s\S]*?<\/a>/,
    );
    expect(brandMatch).not.toBeNull();
    expect(brandMatch![0]).toContain('alt="Essentia"');
  });

  it('never renders the wordmark below the legibility floor', () => {
    // Every `.compact-brand img` rule, not just the first: the header swaps to
    // the square letter mark under 44rem, so the two rules style two different
    // images and each needs its own floor. Matching without /g inspected the
    // desktop rule alone and let the mobile one shrink unnoticed.
    const brandImgRules = [...css.matchAll(/\.compact-brand img\s*{([^}]*)}/g)];
    expect(brandImgRules).toHaveLength(2);

    // Below this breakpoint the <source> below swaps in `mark-*`, the square
    // 64×64 letter mark; above it the element is the wordmark raster.
    const narrowBreakpoint = css.indexOf('@media (max-width: 44rem)');
    expect(narrowBreakpoint).toBeGreaterThan(-1);

    for (const rule of brandImgRules) {
      const body = rule[1] ?? '';
      const stylesLetterMark = rule.index! > narrowBreakpoint;
      const widths = [
        ...body.matchAll(/(?:min-|max-)?width:\s*([\d.]+)(px|rem)/g),
      ].map(([, value, unit]) =>
        unit === 'rem' ? Number(value) * 16 : Number(value),
      );
      expect(widths.length).toBeGreaterThan(0);
      for (const width of widths) {
        // DESIGN.md: the wordmark renders no narrower than 160px; the letter
        // mark, being square, holds up down to its 32px tier.
        expect(width).toBeGreaterThanOrEqual(stylesLetterMark ? 32 : 160);
      }
      if (stylesLetterMark) {
        // Square source, so both axes are stated and must agree.
        expect(body).toMatch(/height:\s*2rem/);
        expect(body).toMatch(/width:\s*2rem/);
      } else {
        // A definite height would clamp the used width and draw 320×74 as
        // 160×28, defeating the floor asserted just above.
        expect(body).toMatch(/height:\s*auto/);
      }
    }

    const brandMatch = baseLayout.match(
      /<a class="compact-brand"[\s\S]*?<\/a>/,
    );
    const brandBlock = brandMatch![0];
    const sourceMatch = brandBlock.match(
      /<source[^>]*media="\(max-width:\s*44rem\)"[^>]*srcset=(?:"([^"]*)"|\{`([^`]*)`\})/,
    );
    expect(sourceMatch).not.toBeNull();
    expect(sourceMatch![1] ?? sourceMatch![2]).toContain('mark-');
  });

  it('seo defaults the social image', () => {
    expect(seo).toContain('og-default-1200x630.png');
  });

  it('masters stay out of public', () => {
    // Identify the masters by what is actually committed under website/brand/,
    // not by a guessed filename: the old pattern (`essentia-*-logo.png`)
    // matched neither master, so copying a 2 MB master into public/ shipped it
    // to every visitor with this test green. Name is the first gate; the size
    // ceiling is the second, for a master copied in under another name.
    const masterNames = readdirSync(
      fileURLToPath(new URL('../../brand/', import.meta.url)),
    ).filter((name) => name.endsWith('.png'));
    expect(masterNames.length).toBeGreaterThan(0);

    const publicDir = new URL('../../public/', import.meta.url);
    function walk(
      dir: URL,
      prefix = '',
    ): Array<{ name: string; relative: string; path: string }> {
      const entries = readdirSync(dir, { withFileTypes: true });
      let files: Array<{ name: string; relative: string; path: string }> = [];
      for (const entry of entries) {
        const childUrl = new URL(
          entry.isDirectory() ? `${entry.name}/` : entry.name,
          dir,
        );
        const relative = `${prefix}${entry.name}`;
        if (entry.isDirectory())
          files = files.concat(walk(childUrl, `${relative}/`));
        else
          files.push({
            name: entry.name,
            relative,
            path: fileURLToPath(childUrl),
          });
      }
      return files;
    }

    const files = walk(publicDir);
    expect(files.length).toBeGreaterThan(0);
    expect(
      files
        .filter((file) => masterNames.includes(file.name))
        .map((file) => file.relative),
    ).toEqual([]);

    // The largest hand-authored PNG is icon-512.png at ~66 KiB; both masters
    // are over 1 MB. `public/generated/` is card art the content pipeline
    // writes and `scripts/content/shared.mjs` already bounds, so it is not part
    // of the surface a stray master could hide in.
    const PNG_CEILING = 256 * 1024;
    expect(
      files
        .filter(
          (file) =>
            file.name.endsWith('.png') &&
            !file.relative.startsWith('generated/'),
        )
        .map((file) => ({
          file: file.relative,
          bytes: statSync(file.path).size,
        }))
        .filter((file) => file.bytes >= PNG_CEILING),
    ).toEqual([]);
  });
});

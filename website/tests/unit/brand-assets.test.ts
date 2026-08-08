import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import sharp from 'sharp';
import { BRAND_ASSETS } from '../../scripts/make-brand-assets.mjs';

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
    const brandImgBlock = css.match(/\.compact-brand img\s*{[^}]*}/);
    expect(brandImgBlock).not.toBeNull();
    const widthDeclarations = [
      ...brandImgBlock![0].matchAll(/(?:min-)?width:\s*([\d.]+)px/g),
    ].map((match) => Number(match[1]));
    for (const width of widthDeclarations) {
      expect(width).toBeGreaterThanOrEqual(160);
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
    const publicDir = new URL('../../public/', import.meta.url);
    function walk(dir: URL): string[] {
      const entries = readdirSync(dir, { withFileTypes: true });
      let names: string[] = [];
      for (const entry of entries) {
        const childUrl = new URL(
          entry.isDirectory() ? `${entry.name}/` : entry.name,
          dir,
        );
        if (entry.isDirectory()) names = names.concat(walk(childUrl));
        else names.push(entry.name);
      }
      return names;
    }
    const names = walk(publicDir);
    for (const name of names) {
      expect(name).not.toMatch(/^essentia-.*-logo\.png$/);
    }
  });
});

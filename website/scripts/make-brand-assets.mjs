import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

// ADR 0022: two brand masters — a letter mark and a wordmark — are committed
// under `website/brand/` and derived, by this script, into every public icon
// and social-card asset. Not part of `npm run build`: the derivatives are
// committed like the hero art precedent in `make-hero-art.mjs`, so the build
// stays reproducible without regenerating binaries.

/** Repo-root-relative path of each master, keyed by the name used below. */
export const BRAND_SOURCES = {
  'letter-mark': 'website/brand/letter-mark.png',
  wordmark: 'website/brand/wordmark.png',
};

/** The resolved `--blackfoil` token — substrate for every opaque derivative. */
export const BLACKFOIL_HEX = '#020202';

/**
 * Every public brand derivative. `size` yields a square icon; `width`/`height`
 * together yield a fixed-canvas asset (the OG card); `width` alone yields a
 * proportionally scaled mark. `opaque: true` flattens onto `BLACKFOIL_HEX`.
 */
export const BRAND_ASSETS = [
  { name: 'favicon-32.png', source: 'letter-mark', size: 32 },
  { name: 'favicon-16.png', source: 'letter-mark', size: 16 },
  { name: 'icon-192.png', source: 'letter-mark', size: 192 },
  { name: 'icon-512.png', source: 'letter-mark', size: 512 },
  {
    name: 'apple-touch-icon-180.png',
    source: 'letter-mark',
    size: 180,
    opaque: true,
  },
  { name: 'mark-64.png', source: 'letter-mark', size: 64 },
  { name: 'mark-128.png', source: 'letter-mark', size: 128 },
  { name: 'wordmark-320.png', source: 'wordmark', width: 320 },
  { name: 'wordmark-640.png', source: 'wordmark', width: 640 },
  {
    name: 'og-default-1200x630.png',
    source: 'wordmark',
    width: 1200,
    height: 630,
    opaque: true,
  },
];

/**
 * Derive one buffer for one asset spec from its already-trimmed master
 * buffer.
 *
 * @param {Buffer} trimmedSource output of `sharp(master).trim()`, buffered
 * @param {(typeof BRAND_ASSETS)[number]} asset
 * @returns {Promise<Buffer>}
 */
export async function renderBrandAsset(trimmedSource, asset) {
  const background = asset.opaque
    ? BLACKFOIL_HEX
    : { r: 0, g: 0, b: 0, alpha: 0 };

  if (asset.size) {
    // Square icon: contain the trimmed glyph inside an exact square,
    // padding with the background rather than cropping the frame.
    let pipeline = sharp(trimmedSource).resize(asset.size, asset.size, {
      fit: 'contain',
      background,
    });
    if (asset.opaque)
      pipeline = pipeline.flatten({ background: BLACKFOIL_HEX });
    return pipeline
      .png({ compressionLevel: 9, palette: true, effort: 10 })
      .toBuffer();
  }

  if (asset.width && asset.height) {
    // Fixed canvas (the OG card): scale the mark to fit inside the canvas
    // with margin, then composite it centred on an opaque backdrop.
    const scaled = await sharp(trimmedSource)
      .resize({
        width: Math.round(asset.width * 0.75),
        height: Math.round(asset.height * 0.75),
        fit: 'inside',
      })
      .toBuffer();
    const canvas = sharp({
      create: {
        width: asset.width,
        height: asset.height,
        channels: 3,
        background: BLACKFOIL_HEX,
      },
    }).composite([{ input: scaled, gravity: 'center' }]);
    return canvas
      .flatten({ background: BLACKFOIL_HEX })
      .png({ compressionLevel: 9, palette: true, effort: 10 })
      .toBuffer();
  }

  // Proportional width only (the header/footer wordmark sizes).
  return sharp(trimmedSource)
    .resize({ width: asset.width, fit: 'inside', background })
    .png({ compressionLevel: 9, palette: true, effort: 10 })
    .toBuffer();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const repoRoot = new URL('../../', import.meta.url);
  const outDir = new URL('website/public/brand/', repoRoot);
  await mkdir(outDir, { recursive: true });

  const trimmedBySource = {};
  for (const [key, relPath] of Object.entries(BRAND_SOURCES)) {
    const input = fileURLToPath(new URL(relPath, repoRoot));
    trimmedBySource[key] = await sharp(input).trim().toBuffer();
  }

  for (const asset of BRAND_ASSETS) {
    const buffer = await renderBrandAsset(trimmedBySource[asset.source], asset);
    const outPath = fileURLToPath(new URL(asset.name, outDir));
    await writeFile(outPath, buffer);
    process.stdout.write(`${asset.name}: written from ${asset.source}\n`);
  }

  process.stdout.write(
    `brand assets: ${BRAND_ASSETS.length} files written to website/public/brand/\n`,
  );
}

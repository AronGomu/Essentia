import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { HERO_SOURCES } from './check-preflight.mjs';

// ADR 0018: hero art is converted once, by hand, and committed. This script is
// that hand — it is deliberately NOT part of `npm run build`. It never resizes
// and never calls a network service; the only way a hero image gets more pixels
// is a higher-resolution file dropped under `original_images_hd/`.

/** Repo-root-relative directory holding manually upscaled illustrations. */
export const HD_ROOT = 'original_images_hd';

/**
 * Resolve the best available source for one section's hero image: the manually
 * upscaled illustration when it exists, otherwise the committed 624 px original.
 *
 * @param {string} slug section slug, a key of HERO_SOURCES
 * @param {(repoRelativePath: string) => boolean} exists
 * @returns {{ path: string, hd: boolean }}
 */
export function heroSourceFor(slug, exists) {
  const original = HERO_SOURCES[slug];
  if (!original) throw new Error(`unknown hero slug ${slug}`);
  const upscaled = original.replace(/^original_images\//, `${HD_ROOT}/`);
  return exists(upscaled)
    ? { path: upscaled, hd: true }
    : { path: original, hd: false };
}

/**
 * The provenance `tool` line for one converted image. Records the pixel size so
 * a reader can tell an HD swap from the native conversion without opening the
 * binary.
 *
 * @param {{ hd: boolean }} source
 * @param {number} width
 * @returns {string}
 */
export function provenanceTool(source, width) {
  return source.hd
    ? `sharp webp q90 (manual HD upscale, ${width} px)`
    : `sharp webp q90 (native ${width} px; HD upscale pending)`;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const repoRoot = new URL('../../', import.meta.url);
  const generatedOn = process.env.HERO_ART_DATE;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(generatedOn ?? ''))
    throw new Error(
      'set HERO_ART_DATE=YYYY-MM-DD so the provenance date is explicit, not implicit',
    );

  const provenancePath = new URL(
    'website/content/art-provenance.json',
    repoRoot,
  );
  const provenance = JSON.parse(await readFile(provenancePath, 'utf8'));

  for (const slug of Object.keys(HERO_SOURCES)) {
    const source = heroSourceFor(slug, (rel) =>
      existsSync(new URL(rel, repoRoot)),
    );
    const input = fileURLToPath(new URL(source.path, repoRoot));
    const output = fileURLToPath(
      new URL(`website/public/art/${slug}-hero.webp`, repoRoot),
    );
    const { width } = await sharp(input).webp({ quality: 90 }).toFile(output);

    const entry = provenance.art.find(
      (item) => item.key === `/art/${slug}-hero.webp`,
    );
    if (!entry) throw new Error(`no provenance entry for ${slug}`);
    entry.source = source.path;
    entry.tool = provenanceTool(source, width);
    entry.generatedOn = generatedOn;
    process.stdout.write(`${slug}: ${source.path} -> ${width} px\n`);
  }

  await writeFile(provenancePath, `${JSON.stringify(provenance, null, 2)}\n`);
  process.stdout.write('hero art: 5 images written, provenance updated\n');
}

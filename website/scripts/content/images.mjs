import { existsSync } from 'node:fs';
import {
  mkdir,
  readFile,
  readdir,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import {
  GENERATED_PUBLIC,
  LIMITS,
  fail,
  renderName,
  safeFile,
  sha,
} from './shared.mjs';

/**
 * Derivative tiers. `print` is the export-template master (1500 × 2092, 600 DPI
 * at 63.5 × 88.9 mm); everything else is generated locally from it, or from the
 * 1× render while masters do not exist yet.
 */
export const TIERS = [
  { name: 'thumb', width: 240, formats: ['avif', 'webp'] },
  { name: 'display', width: 750, formats: ['avif', 'webp'] },
];

export const PRINT_MASTER = { width: 1500, height: 2092, dpi: 600 };
export const ENCODER_REVISION = 1;
export const AVIF_OPTIONS = { quality: 60, effort: 2 };
export const WEBP_OPTIONS = { quality: 86, effort: 5 };
export const PNG_OPTIONS = { compressionLevel: 9, adaptiveFiltering: true };
export const MANIFEST_PATH = path.join(
  GENERATED_PUBLIC,
  '.derivative-manifest.json',
);
export const MANIFEST_SCHEMA_VERSION = 1;

const OPTIONS_BY_FORMAT = {
  avif: AVIF_OPTIONS,
  webp: WEBP_OPTIONS,
  png: PNG_OPTIONS,
};

export function derivativeKeyInput({ sourceHash, tier, format, width }) {
  return {
    sourceHash,
    tier,
    format,
    width,
    rev: ENCODER_REVISION,
    options: OPTIONS_BY_FORMAT[format],
  };
}

export function derivativeKey(input) {
  return sha(JSON.stringify(derivativeKeyInput(input)));
}

export async function loadDerivativeManifest() {
  try {
    const parsed = JSON.parse(await readFile(MANIFEST_PATH, 'utf8'));
    if (parsed.schemaVersion !== MANIFEST_SCHEMA_VERSION) return new Map();
    return new Map(Object.entries(parsed.entries));
  } catch {
    return new Map();
  }
}

export async function writeDerivativeManifest(entries) {
  const value = {
    schemaVersion: MANIFEST_SCHEMA_VERSION,
    entries: Object.fromEntries([...entries].sort()),
  };
  await writeFile(MANIFEST_PATH, `${JSON.stringify(value, null, 2)}\n`);
}

async function pruneDirectory(directory, claimed) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await pruneDirectory(absolute, claimed);
      if ((await readdir(absolute)).length === 0)
        await rm(absolute, { recursive: true });
      continue;
    }
    const relative = path
      .relative(GENERATED_PUBLIC, absolute)
      .split(path.sep)
      .join('/');
    if (relative !== path.basename(MANIFEST_PATH) && !claimed.has(relative))
      await rm(absolute);
  }
}

export async function pruneOrphans(claimed) {
  await pruneDirectory(GENERATED_PUBLIC, claimed);
}

async function writeDerivative(input, output, format, width) {
  await mkdir(path.dirname(output), { recursive: true });
  const pipeline = sharp(input, {
    limitInputPixels: 80_000_000,
    failOn: 'warning',
  })
    .rotate()
    .resize({ width, withoutEnlargement: true });
  if (format === 'png') await pipeline.png(PNG_OPTIONS).toFile(output);
  else if (format === 'webp') await pipeline.webp(WEBP_OPTIONS).toFile(output);
  else await pipeline.avif(AVIF_OPTIONS).toFile(output);
}

/**
 * Locate the print master for a card. Absent `renders_print/` is not a failure:
 * the print tier falls back to the 1× render and is flagged draft resolution.
 */
export async function findPrintMaster(packageRoot, cardName) {
  const directory = path.join(packageRoot, 'renders_print');
  try {
    if (!(await stat(directory)).isDirectory()) return null;
  } catch {
    return null;
  }
  try {
    return await safeFile(directory, renderName(cardName), LIMITS.image);
  } catch {
    return null;
  }
}

/**
 * Build every derivative for one card and return the catalog `images` record.
 * `checkOnly` skips writing bytes but still computes the shape the catalog needs.
 */
export async function buildCardImages({
  id,
  assetRoot,
  canonical,
  printMaster,
  width,
  height,
  checkOnly,
  cache,
}) {
  const source = printMaster ?? canonical;
  const sourceHash = sha(await readFile(source));
  const draftResolution = !printMaster;
  const images = {};
  const work = [];
  for (const tier of TIERS) {
    const record = {};
    for (const format of tier.formats) {
      const relative = `${assetRoot}/${id}-${tier.name}.${format}`;
      const publicRelative = `/generated/${relative}`;
      const absoluteTarget = path.join(GENERATED_PUBLIC, relative);
      record[format] = publicRelative;
      if (!checkOnly) {
        const key = derivativeKey({
          sourceHash,
          tier: tier.name,
          format,
          width: tier.width,
        });
        cache.next.set(relative, key);
        if (cache.previous.get(relative) !== key || !existsSync(absoluteTarget))
          work.push(
            writeDerivative(source, absoluteTarget, format, tier.width),
          );
      }
    }
    record.width = Math.min(
      tier.width,
      printMaster ? PRINT_MASTER.width : width,
    );
    images[tier.name] = record;
  }

  const printWidth = printMaster ? PRINT_MASTER.width : width;
  const printCacheRelative = `${assetRoot}/${id}-print.png`;
  const printRelative = `/generated/${printCacheRelative}`;
  const printTarget = path.join(GENERATED_PUBLIC, printCacheRelative);
  if (!checkOnly) {
    const key = derivativeKey({
      sourceHash,
      tier: 'print',
      format: 'png',
      width: printWidth,
    });
    cache.next.set(printCacheRelative, key);
    if (
      cache.previous.get(printCacheRelative) !== key ||
      !existsSync(printTarget)
    )
      work.push(writeDerivative(source, printTarget, 'png', printWidth));
  }
  await Promise.all(work);

  images.print = {
    url: printRelative,
    width: printWidth,
    height: printMaster ? PRINT_MASTER.height : height,
    dpi: printMaster ? PRINT_MASTER.dpi : Math.round(width / 2.5 || 150),
    draftResolution,
  };
  images.width = width;
  images.height = height;
  return images;
}

export function assertPrintMasterDimensions(metadata, cardName) {
  if (
    metadata.width !== PRINT_MASTER.width ||
    metadata.height !== PRINT_MASTER.height
  )
    fail(
      `print master for ${cardName} is ${metadata.width}×${metadata.height}, expected ${PRINT_MASTER.width}×${PRINT_MASTER.height}`,
    );
}

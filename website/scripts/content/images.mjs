import { mkdir, stat } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import {
  GENERATED_PUBLIC,
  LIMITS,
  fail,
  renderName,
  safeFile,
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

async function writeDerivative(input, output, format, width) {
  await mkdir(path.dirname(output), { recursive: true });
  const pipeline = sharp(input, {
    limitInputPixels: 80_000_000,
    failOn: 'warning',
  })
    .rotate()
    .resize({ width, withoutEnlargement: true });
  if (format === 'png')
    await pipeline
      .png({ compressionLevel: 9, adaptiveFiltering: true })
      .toFile(output);
  else if (format === 'webp')
    await pipeline.webp({ quality: 86, effort: 5 }).toFile(output);
  else await pipeline.avif({ quality: 60, effort: 4 }).toFile(output);
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
}) {
  const source = printMaster ?? canonical;
  const draftResolution = !printMaster;
  const images = {};
  const work = [];
  for (const tier of TIERS) {
    const record = {};
    for (const format of tier.formats) {
      const relative = `/generated/${assetRoot}/${id}-${tier.name}.${format}`;
      record[format] = relative;
      if (!checkOnly)
        work.push(
          writeDerivative(
            source,
            path.join(
              GENERATED_PUBLIC,
              assetRoot,
              `${id}-${tier.name}.${format}`,
            ),
            format,
            tier.width,
          ),
        );
    }
    record.width = Math.min(
      tier.width,
      printMaster ? PRINT_MASTER.width : width,
    );
    images[tier.name] = record;
  }

  const printRelative = `/generated/${assetRoot}/${id}-print.png`;
  if (!checkOnly)
    work.push(
      writeDerivative(
        source,
        path.join(GENERATED_PUBLIC, assetRoot, `${id}-print.png`),
        'png',
        printMaster ? PRINT_MASTER.width : width,
      ),
    );
  await Promise.all(work);

  images.print = {
    url: printRelative,
    width: printMaster ? PRINT_MASTER.width : width,
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

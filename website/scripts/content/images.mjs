import { constants, existsSync } from 'node:fs';
import {
  lstat,
  mkdir,
  open,
  readFile,
  readdir,
  realpath,
  rmdir,
  stat,
  unlink,
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

const GENERATED_PUBLIC_PARENT = path.dirname(GENERATED_PUBLIC);
const NO_FOLLOW_WRITE_FLAGS =
  constants.O_NOFOLLOW |
  constants.O_CREAT |
  constants.O_TRUNC |
  constants.O_WRONLY;

function generatedRelative(target) {
  const relative = path.relative(GENERATED_PUBLIC, target);
  if (
    relative.startsWith(`..${path.sep}`) ||
    relative === '..' ||
    path.isAbsolute(relative)
  )
    fail(`generated path escape ${target}`);
  return relative;
}

/**
 * Defend static generated-path ancestry. Concurrent same-user mutation is
 * outside the local build threat model; final files still use O_NOFOLLOW.
 */
async function assertGeneratedPathSafe(target = GENERATED_PUBLIC) {
  const relative = generatedRelative(target);
  const paths = [GENERATED_PUBLIC_PARENT, GENERATED_PUBLIC];
  let cursor = GENERATED_PUBLIC;
  for (const segment of relative ? relative.split(path.sep) : []) {
    cursor = path.join(cursor, segment);
    paths.push(cursor);
  }

  for (let index = 0; index < paths.length; index += 1) {
    const candidate = paths[index];
    try {
      const info = await lstat(candidate);
      if (info.isSymbolicLink())
        fail(
          candidate === GENERATED_PUBLIC_PARENT
            ? 'linked generated ancestry forbidden'
            : candidate === GENERATED_PUBLIC
              ? 'linked generated root forbidden'
              : `linked generated path forbidden ${relative}`,
        );
      if (index < paths.length - 1 && !info.isDirectory())
        fail(`invalid generated path ${relative}`);
      if (
        candidate === GENERATED_PUBLIC &&
        candidate === target &&
        !info.isDirectory()
      )
        fail('invalid generated root');
    } catch (error) {
      if (error?.code === 'ENOENT') return;
      throw error;
    }
  }
}

async function canonicalGeneratedRoot() {
  await assertGeneratedPathSafe();
  const info = await lstat(GENERATED_PUBLIC);
  if (!info.isDirectory()) fail('invalid generated root');
  const [canonicalParent, canonicalRoot] = await Promise.all([
    realpath(GENERATED_PUBLIC_PARENT),
    realpath(GENERATED_PUBLIC),
  ]);
  if (
    canonicalRoot !==
    path.join(canonicalParent, path.basename(GENERATED_PUBLIC))
  )
    fail('generated root containment failure');
  return canonicalRoot;
}

async function assertContainedDirectory(directory, canonicalRoot) {
  await assertGeneratedPathSafe(directory);
  const info = await lstat(directory);
  if (!info.isDirectory()) fail(`invalid generated directory ${directory}`);
  const canonical = await realpath(directory);
  const relative = path.relative(canonicalRoot, canonical);
  if (
    relative === '..' ||
    relative.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relative)
  )
    fail(`generated directory escape ${directory}`);
  return canonical;
}

async function writeNoFollow(target, bytes) {
  const parent = path.dirname(target);
  await assertGeneratedPathSafe(parent);
  const canonicalRoot = await canonicalGeneratedRoot();
  await assertContainedDirectory(parent, canonicalRoot);
  let file;
  try {
    file = await open(target, NO_FOLLOW_WRITE_FLAGS, 0o666);
  } catch (error) {
    if (error?.code === 'ELOOP')
      fail(`linked generated path forbidden ${generatedRelative(target)}`);
    throw error;
  }
  try {
    await file.writeFile(bytes);
  } finally {
    await file.close();
  }
}

export async function ensureGeneratedRoot() {
  await assertGeneratedPathSafe();
  await mkdir(GENERATED_PUBLIC, { recursive: true });
  await canonicalGeneratedRoot();
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
  await assertGeneratedPathSafe(path.dirname(MANIFEST_PATH));
  const value = {
    schemaVersion: MANIFEST_SCHEMA_VERSION,
    entries: Object.fromEntries([...entries].sort()),
  };
  await writeNoFollow(
    MANIFEST_PATH,
    Buffer.from(`${JSON.stringify(value, null, 2)}\n`),
  );
}

async function pruneDirectory(directory, claimed, canonicalRoot) {
  await assertContainedDirectory(directory, canonicalRoot);
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    const info = await lstat(absolute);
    if (info.isSymbolicLink()) {
      await unlink(absolute);
      continue;
    }
    if (info.isDirectory()) {
      await pruneDirectory(absolute, claimed, canonicalRoot);
      await assertContainedDirectory(absolute, canonicalRoot);
      if ((await readdir(absolute)).length === 0) await rmdir(absolute);
      continue;
    }
    const relative = generatedRelative(absolute).split(path.sep).join('/');
    if (relative !== path.basename(MANIFEST_PATH) && !claimed.has(relative))
      await unlink(absolute);
  }
}

export async function pruneOrphans(claimed) {
  const canonicalRoot = await canonicalGeneratedRoot();
  await pruneDirectory(GENERATED_PUBLIC, claimed, canonicalRoot);
}

async function writeDerivative(input, output, format, width) {
  await assertGeneratedPathSafe(output);
  await mkdir(path.dirname(output), { recursive: true });
  await assertGeneratedPathSafe(output);
  const pipeline = sharp(input, {
    limitInputPixels: 80_000_000,
    failOn: 'warning',
  })
    .rotate()
    .resize({ width, withoutEnlargement: true });
  let bytes;
  if (format === 'png') bytes = await pipeline.png(PNG_OPTIONS).toBuffer();
  else if (format === 'webp')
    bytes = await pipeline.webp(WEBP_OPTIONS).toBuffer();
  else bytes = await pipeline.avif(AVIF_OPTIONS).toBuffer();
  await writeNoFollow(output, bytes);
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
        await assertGeneratedPathSafe(absoluteTarget);
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
    await assertGeneratedPathSafe(printTarget);
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

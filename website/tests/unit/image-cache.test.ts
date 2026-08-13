// @vitest-environment node
import { createHash } from 'node:crypto';
import {
  access,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  stat,
  symlink,
  writeFile,
} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

let generatedRoot: string;
let images: typeof import('../../scripts/content/images.mjs');

beforeAll(async () => {
  generatedRoot = await mkdtemp(
    path.join(os.tmpdir(), 'essentia-image-cache-'),
  );
  vi.doMock('../../scripts/content/shared.mjs', async () => ({
    ...(await vi.importActual('../../scripts/content/shared.mjs')),
    GENERATED_PUBLIC: generatedRoot,
  }));
  images = await import('../../scripts/content/images.mjs');
});

afterAll(async () => {
  vi.doUnmock('../../scripts/content/shared.mjs');
  await rm(generatedRoot, { recursive: true, force: true });
});

async function sourceImage(file: string, background: string) {
  await sharp({
    create: { width: 60, height: 84, channels: 3, background },
  })
    .png()
    .toFile(file);
}

async function outputMtimes(assetRoot: string, id: string) {
  const names = [
    `${id}-thumb.avif`,
    `${id}-thumb.webp`,
    `${id}-display.avif`,
    `${id}-display.webp`,
    `${id}-print.png`,
  ];
  return new Map(
    await Promise.all(
      names.map(
        async (name) =>
          [
            name,
            (await stat(path.join(generatedRoot, assetRoot, name))).mtimeMs,
          ] as const,
      ),
    ),
  );
}

async function build(source: string, assetRoot: string, previous = new Map()) {
  const cache = { previous, next: new Map<string, string>() };
  await images.buildCardImages({
    id: 'test-card',
    assetRoot,
    canonical: source,
    printMaster: null,
    width: 60,
    height: 84,
    checkOnly: false,
    cache,
  });
  expect(cache.next.size).toBe(5);
  return cache.next;
}

describe('image derivative cache', () => {
  const keyInput = {
    sourceHash: 'source-a',
    tier: 'thumb',
    format: 'avif',
    width: 240,
  };

  it('derivativeKey changes with the source hash', () => {
    expect(images.derivativeKey(keyInput)).not.toBe(
      images.derivativeKey({ ...keyInput, sourceHash: 'source-b' }),
    );
  });

  it('derivativeKey changes with the tier', () => {
    expect(images.derivativeKey(keyInput)).not.toBe(
      images.derivativeKey({ ...keyInput, tier: 'display' }),
    );
  });

  it('derivativeKey changes with the format', () => {
    expect(images.derivativeKey(keyInput)).not.toBe(
      images.derivativeKey({ ...keyInput, format: 'webp' }),
    );
  });

  it('derivativeKey changes with the width', () => {
    expect(images.derivativeKey(keyInput)).not.toBe(
      images.derivativeKey({ ...keyInput, width: 750 }),
    );
  });

  it('derivativeKey hashes the encoder revision and options', () => {
    const input = images.derivativeKeyInput(keyInput);
    const expected = createHash('sha256')
      .update(JSON.stringify(input))
      .digest('hex');
    const sourceOnly = createHash('sha256')
      .update(keyInput.sourceHash)
      .digest('hex');

    expect(input).toEqual({
      ...keyInput,
      rev: images.ENCODER_REVISION,
      options: images.AVIF_OPTIONS,
    });
    expect(images.derivativeKey(keyInput)).toBe(expected);
    expect(images.derivativeKey(keyInput)).not.toBe(sourceOnly);
    expect(
      createHash('sha256')
        .update(JSON.stringify({ ...input, rev: input.rev + 1 }))
        .digest('hex'),
    ).not.toBe(expected);
    expect(
      createHash('sha256')
        .update(
          JSON.stringify({
            ...input,
            options: { ...input.options, quality: input.options.quality + 1 },
          }),
        )
        .digest('hex'),
    ).not.toBe(expected);
  });

  it('buildCardImages skips a derivative whose key already matches', async () => {
    const directory = await mkdtemp(path.join(generatedRoot, 'skip-'));
    const source = path.join(directory, 'source.png');
    await sourceImage(source, '#402010');
    const assetRoot = path.basename(directory);
    const manifest = await build(source, assetRoot);
    const before = await outputMtimes(assetRoot, 'test-card');
    await new Promise((resolve) => setTimeout(resolve, 20));
    await build(source, assetRoot, manifest);
    expect(await outputMtimes(assetRoot, 'test-card')).toEqual(before);
  });

  it('buildCardImages re-encodes when the source bytes change', async () => {
    const directory = await mkdtemp(path.join(generatedRoot, 'change-'));
    const source = path.join(directory, 'source.png');
    await sourceImage(source, '#402010');
    const assetRoot = path.basename(directory);
    const manifest = await build(source, assetRoot);
    const before = await outputMtimes(assetRoot, 'test-card');
    await new Promise((resolve) => setTimeout(resolve, 20));
    await sourceImage(source, '#104020');
    await build(source, assetRoot, manifest);
    const after = await outputMtimes(assetRoot, 'test-card');
    for (const [name, mtime] of before)
      expect(after.get(name), name).toBeGreaterThan(mtime);
  });

  it('buildCardImages re-encodes a missing derivative with a matching key', async () => {
    const directory = await mkdtemp(path.join(generatedRoot, 'missing-'));
    const source = path.join(directory, 'source.png');
    await sourceImage(source, '#402010');
    const assetRoot = path.basename(directory);
    const manifest = await build(source, assetRoot);
    const before = await outputMtimes(assetRoot, 'test-card');
    const missing = 'test-card-thumb.avif';
    await rm(path.join(generatedRoot, assetRoot, missing));
    await new Promise((resolve) => setTimeout(resolve, 20));

    await build(source, assetRoot, manifest);

    const after = await outputMtimes(assetRoot, 'test-card');
    expect(after.get(missing)).toBeGreaterThan(before.get(missing) ?? 0);
    for (const [name, mtime] of before)
      if (name !== missing) expect(after.get(name), name).toBe(mtime);
  });

  it('refuses a symlinked manifest without changing its external target', async () => {
    const external = await mkdtemp(
      path.join(os.tmpdir(), 'essentia-manifest-sentinel-'),
    );
    const sentinel = path.join(external, 'sentinel.json');
    await writeFile(sentinel, 'external sentinel\n');
    await symlink(sentinel, images.MANIFEST_PATH);

    try {
      await expect(
        images.writeDerivativeManifest(new Map([['a.webp', 'key']])),
      ).rejects.toThrow('content: linked generated path forbidden');
      await expect(readFile(sentinel, 'utf8')).resolves.toBe(
        'external sentinel\n',
      );
    } finally {
      await rm(images.MANIFEST_PATH, { force: true });
      await rm(external, { recursive: true, force: true });
    }
  });

  it('refuses a symlinked generated root before pruning external files', async () => {
    const external = await mkdtemp(
      path.join(os.tmpdir(), 'essentia-root-sentinel-'),
    );
    const sentinel = path.join(external, 'sentinel.txt');
    await writeFile(sentinel, 'external sentinel\n');
    await rm(generatedRoot, { recursive: true });
    await symlink(external, generatedRoot, 'dir');

    try {
      await expect(images.pruneOrphans(new Set())).rejects.toThrow(
        'content: linked generated root forbidden',
      );
      await expect(readFile(sentinel, 'utf8')).resolves.toBe(
        'external sentinel\n',
      );
    } finally {
      await rm(generatedRoot, { force: true });
      await mkdir(generatedRoot);
      await rm(external, { recursive: true, force: true });
    }
  });

  it('pruneOrphans deletes unclaimed files and keeps claimed ones', async () => {
    await sharp({
      create: {
        width: 1,
        height: 1,
        channels: 3,
        background: '#402010',
      },
    })
      .webp()
      .toFile(path.join(generatedRoot, 'a.webp'));
    await readFile(path.join(generatedRoot, 'a.webp')).then((bytes) =>
      sharp(bytes).toFile(path.join(generatedRoot, 'b.webp')),
    );

    await images.pruneOrphans(new Set(['a.webp']));

    await expect(
      access(path.join(generatedRoot, 'a.webp')),
    ).resolves.toBeUndefined();
    await expect(access(path.join(generatedRoot, 'b.webp'))).rejects.toThrow();
  });
});

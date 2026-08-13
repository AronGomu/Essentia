// @vitest-environment node
import { access, mkdtemp, readFile, rm, stat } from 'node:fs/promises';
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
      names.map(async (name) => [
        name,
        (await stat(path.join(generatedRoot, assetRoot, name))).mtimeMs,
      ]),
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
  it('derivativeKeyInput carries the encoder revision and options', () => {
    const input = images.derivativeKeyInput({
      sourceHash: 'a',
      tier: 'thumb',
      format: 'avif',
      width: 240,
    });
    expect(input.rev).toBe(images.ENCODER_REVISION);
    expect(input.options.effort).toBe(2);
  });

  it('derivativeKey changes with the source hash', () => {
    const common = { tier: 'thumb', format: 'avif', width: 240 };
    expect(images.derivativeKey({ ...common, sourceHash: 'a' })).not.toBe(
      images.derivativeKey({ ...common, sourceHash: 'b' }),
    );
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

import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { writeAtomic } from '../../scripts/content/orchestrator.mjs';

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe('generated content writes', () => {
  it('atomically replaces an existing generated module', async () => {
    const directory = await mkdtemp(path.join(tmpdir(), 'essentia-content-'));
    temporaryDirectories.push(directory);
    const target = path.join(directory, 'catalog.ts');
    await writeFile(target, 'old content', 'utf8');

    await writeAtomic(target, 'new content');

    expect(await readFile(target, 'utf8')).toBe('new content');
    expect(await readdir(directory)).toEqual(['catalog.ts']);
  });
});

import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { loadDocs } from '../../scripts/content/docs.mjs';

const tempRoots: string[] = [];

async function fixture(files: Record<string, string>): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), 'essentia-docs-corpus-'));
  tempRoots.push(root);
  for (const [relative, content] of Object.entries(files)) {
    const target = path.join(root, relative);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, content, 'utf8');
  }
  return root;
}

afterEach(async () => {
  await Promise.all(
    tempRoots
      .splice(0)
      .map((root) => rm(root, { recursive: true, force: true })),
  );
});

describe('loadDocs', () => {
  it('root docs come first in alphabetical order', async () => {
    const root = await fixture({
      'docs/B.md': '# B\n',
      'docs/A.md': '# A\n',
      'docs/01_x/01_C.md': '# C\n',
    });

    const docs = await loadDocs(root);

    expect(docs.map((doc) => doc.title)).toEqual(['A', 'B', 'C']);
    expect(docs.slice(0, 2).map((doc) => doc.group)).toEqual(['', '']);
    expect(docs.map((doc) => doc.order)).toEqual([0, 1, 0]);
  });

  it('the alphabetically first root doc serves /docs/', async () => {
    const root = await fixture({
      'docs/B.md': '# B\n',
      'docs/A.md': '# A\n',
      'docs/01_x/01_C.md': '# C\n',
    });

    const docs = await loadDocs(root);
    const a = docs.find((doc) => doc.title === 'A');
    const b = docs.find((doc) => doc.title === 'B');

    expect(a?.route).toBe('/docs/');
    expect(b?.route).toBe('/docs/b/');
  });

  it('directories become groups in raw name order', async () => {
    const root = await fixture({
      'docs/A.md': '# Landing\n',
      'docs/02_b/01_X.md': '# X\n',
      'docs/01_a/01_Y.md': '# Y\n',
    });

    const groups = (await loadDocs(root)).filter((doc) => doc.group !== '');

    expect(groups.map((doc) => doc.group)).toEqual(['01_a', '02_b']);
    expect(groups.map((doc) => doc.groupLabel)).toEqual(['A', 'B']);
  });

  it('sorts docs inside a directory by raw filename', async () => {
    const root = await fixture({
      'docs/A.md': '# Landing\n',
      'docs/01_rules/02_A.md': '# A title\n',
      'docs/01_rules/01_Z.md': '# Z title\n',
    });

    const rules = (await loadDocs(root)).filter(
      (doc) => doc.group === '01_rules',
    );

    expect(rules.map((doc) => doc.path)).toEqual([
      'docs/01_rules/01_Z.md',
      'docs/01_rules/02_A.md',
    ]);
    expect(rules.map((doc) => doc.order)).toEqual([0, 1]);
  });

  it('a doc in a new folder needs no configuration', async () => {
    const root = await fixture({
      'docs/A.md': '# Landing\n',
      'docs/01_a/01_X.md': '# X\n',
      'docs/02_b/01_Y.md': '# Y\n',
      'docs/03_c/01_Z.md': '# Z\n',
    });

    const docs = await loadDocs(root);

    expect(docs.at(-1)).toMatchObject({
      title: 'Z',
      group: '03_c',
      groupLabel: 'C',
    });
  });

  it('keeps ADR and per-keyword ruling exclusions', async () => {
    const root = await fixture({
      'docs/A.md': '# Landing\n',
      'docs/ADR/README.md': 'not a published doc\n',
      'docs/keywords/action-name.md': 'registry front matter\n',
      'docs/keywords/ACTIONS.md': '# Actions\n',
    });

    const docs = await loadDocs(root);

    expect(docs.map((doc) => doc.path)).toEqual([
      'docs/A.md',
      'docs/keywords/ACTIONS.md',
    ]);
  });

  it('a doc without a first heading still fails', async () => {
    const root = await fixture({ 'docs/D.md': 'text\n' });

    await expect(loadDocs(root)).rejects.toThrow(/D\.md/);
  });

  it('fails when no root doc can serve /docs/', async () => {
    const root = await fixture({ 'docs/rules/A.md': '# A\n' });

    await expect(loadDocs(root)).rejects.toThrow(
      /no root-level doc to serve \/docs\//,
    );
  });

  it('still rejects duplicate routes', async () => {
    const root = await fixture({
      'docs/00.md': '# Landing\n',
      'docs/A B.md': '# A B\n',
      'docs/A-B.md': '# A-B\n',
    });

    await expect(loadDocs(root)).rejects.toThrow(/duplicate doc route/);
  });
});

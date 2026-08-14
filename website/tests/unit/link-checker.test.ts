import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { collectBrokenInternalLinks } from '../../scripts/check-links.mjs';

const roots: string[] = [];

async function fixture(files: Record<string, string>) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'essentia-links-'));
  roots.push(root);
  for (const [name, contents] of Object.entries(files)) {
    const target = path.join(root, name);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, contents);
  }
  return root;
}

afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

describe('collectBrokenInternalLinks', () => {
  it('accepts href src and srcset candidates under repository base', async () => {
    const dist = await fixture({
      'index.html': `
        <a href="/YGO-x-MTG/docs/">Docs</a>
        <img src="/YGO-x-MTG/images/card.webp">
        <source srcset="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw== 1x, /YGO-x-MTG/images/card.webp 2x, /YGO-x-MTG/images/card.avif 3x">
      `,
      'docs/index.html': 'docs',
      'images/card.webp': 'webp',
      'images/card.avif': 'avif',
    });

    await expect(
      collectBrokenInternalLinks({ dist, base: '/YGO-x-MTG/' }),
    ).resolves.toEqual([]);
  });

  it('accepts the repository base root', async () => {
    const dist = await fixture({
      'index.html': '<a href="/YGO-x-MTG/">Home</a>',
    });

    await expect(
      collectBrokenInternalLinks({ dist, base: '/YGO-x-MTG/' }),
    ).resolves.toEqual([]);
  });

  it('rejects a root-relative URL outside repository base', async () => {
    const dist = await fixture({
      'index.html': '<img src="/generated/card.webp">',
    });

    await expect(
      collectBrokenInternalLinks({ dist, base: '/YGO-x-MTG/' }),
    ).resolves.toEqual([
      'index.html → /generated/card.webp (outside BASE_PATH /YGO-x-MTG/)',
    ]);
  });

  it('reports a missing srcset candidate after a descriptorless data URL', async () => {
    const dist = await fixture({
      'index.html':
        '<source srcset="data:image/gif;base64,AAAA, /YGO-x-MTG/images/missing.webp 2x">',
    });

    await expect(
      collectBrokenInternalLinks({ dist, base: '/YGO-x-MTG/' }),
    ).resolves.toEqual(['index.html → /YGO-x-MTG/images/missing.webp']);
  });

  it('preserves commas inside srcset URLs', async () => {
    const dist = await fixture({
      'index.html': '<source srcset="/YGO-x-MTG/images/card,name.webp 2x">',
      'images/card,name.webp': 'webp',
    });

    await expect(
      collectBrokenInternalLinks({ dist, base: '/YGO-x-MTG/' }),
    ).resolves.toEqual([]);
  });

  it('resolves relative links from nested HTML', async () => {
    const dist = await fixture({
      'docs/guide/index.html':
        '<a href="../">Docs</a><img src="../../images/card.webp?size=2#preview">',
      'docs/index.html': 'docs',
      'images/card.webp': 'webp',
    });

    await expect(
      collectBrokenInternalLinks({ dist, base: '/YGO-x-MTG/' }),
    ).resolves.toEqual([]);
  });

  it('does not resolve a root-clamped URL against a file outside dist', async () => {
    const root = await fixture({
      'dist/deep/index.html': '<a href="../../outside.txt">Outside</a>',
      'outside.txt': 'must not satisfy a URL inside dist',
    });
    const dist = path.join(root, 'dist');

    await expect(
      collectBrokenInternalLinks({ dist, base: '/' }),
    ).resolves.toEqual(['deep/index.html → ../../outside.txt']);
  });

  it('rejects links that escape through a symlink inside dist', async () => {
    const root = await fixture({
      'dist/index.html': '<a href="/escape.txt">Outside</a>',
      'outside.txt': 'must not satisfy a URL inside dist',
    });
    const dist = path.join(root, 'dist');
    await symlink(
      path.join(root, 'outside.txt'),
      path.join(dist, 'escape.txt'),
    );

    await expect(
      collectBrokenInternalLinks({ dist, base: '/' }),
    ).resolves.toEqual(['index.html → /escape.txt']);
  });

  it('requires index.html inside dotted directory paths', async () => {
    const dist = await fixture({
      'index.html': '<a href="/v1.0/">Version</a>',
      'v1.0/placeholder.txt': 'not an index',
    });

    await expect(
      collectBrokenInternalLinks({ dist, base: '/' }),
    ).resolves.toEqual(['index.html → /v1.0/']);
  });

  it('ignores attributes whose names only end in src', async () => {
    const dist = await fixture({
      'index.html': '<img data-src="/missing.webp">',
    });

    await expect(
      collectBrokenInternalLinks({ dist, base: '/' }),
    ).resolves.toEqual([]);
  });

  it('ignores attribute-like text, comments, and quoted values', async () => {
    const dist = await fixture({
      'index.html': `
        <p>Example: href="/missing-text.webp"</p>
        <!-- <img src="/missing-comment.webp"> -->
        <p title='Example: src="/missing-value.webp"'>Safe</p>
        <script>const example = '<img src="/missing-script.webp">';</script>
      `,
    });

    await expect(
      collectBrokenInternalLinks({ dist, base: '/' }),
    ).resolves.toEqual([]);
  });

  it('recognizes alternate HTML comment endings', async () => {
    const dist = await fixture({
      'index.html': `
        <!-- <img src="/missing-comment.webp"> --!>
        <img src="/missing-real.webp">
      `,
    });

    await expect(
      collectBrokenInternalLinks({ dist, base: '/' }),
    ).resolves.toEqual(['index.html → /missing-real.webp']);
  });

  it('requires exact raw-text closing tags', async () => {
    const dist = await fixture({
      'index.html': `
        <script>const example = '</scriptx><img src="/missing-script.webp">';</script>
        <iframe><img src="/missing-frame.webp"></iframe>
      `,
    });

    await expect(
      collectBrokenInternalLinks({ dist, base: '/' }),
    ).resolves.toEqual([]);
  });
});

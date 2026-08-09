import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolve } from '../support/css';

const here = path.dirname(fileURLToPath(import.meta.url));
const websiteRoot = path.resolve(here, '../..');

describe('tile-badge', () => {
  it.each([1440, 1280, 900, 704, 390])(
    'the "New" badge sits at top: 2rem at %dpx',
    async (widthPx) => {
      const css = await readFile(
        path.join(websiteRoot, 'src/styles/global.css'),
        'utf8',
      );
      expect(resolve(css, '.tile-badge', 'top', widthPx)).toBe('2rem');
    },
  );
});

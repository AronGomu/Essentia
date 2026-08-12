import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const cssPath = fileURLToPath(
  new URL('../../src/styles/global.css', import.meta.url),
);
const css = readFileSync(cssPath, 'utf-8');

describe('markdown image scale ladder', () => {
  it('ladder covers 5 to 100 in fives', () => {
    for (let scale = 5; scale <= 100; scale += 5) {
      expect(css).toMatch(
        new RegExp(
          `\\.md-image-scale-${scale}\\s*\\{\\s*width:\\s*${scale}%;?\\s*\\}`,
        ),
      );
    }
    const matches = css.match(/\.md-image-scale-\d+\s*\{/g) ?? [];
    expect(matches).toHaveLength(20);
  });
});

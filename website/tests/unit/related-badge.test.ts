import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

describe('gallery badge is opt-out', () => {
  it('CardGallery declares showNewBadge with default true', () => {
    const source = readFileSync(
      fileURLToPath(
        new URL('../../src/components/CardGallery.astro', import.meta.url),
      ),
      'utf8',
    );
    expect(source).toContain('showNewBadge');
    expect(source).toContain('showNewBadge = true');
  });

  it('card page passes showNewBadge={false} to all related galleries', () => {
    const source = readFileSync(
      fileURLToPath(
        new URL('../../src/pages/cards/[id].astro', import.meta.url),
      ),
      'utf8',
    );
    const matches = source.match(/showNewBadge={false}/g) ?? [];
    expect(matches.length).toBe(3);
  });
});

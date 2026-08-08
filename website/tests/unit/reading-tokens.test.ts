import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const globalCss = readFileSync(
  new URL('../../src/styles/global.css', import.meta.url),
  'utf-8',
);
const designMd = readFileSync(
  new URL('../../DESIGN.md', import.meta.url),
  'utf-8',
);

const TOKENS = [
  '--reading-surface',
  '--reading-surface-raised',
  '--reading-ink',
  '--reading-ink-muted',
  '--reading-rule',
  '--reading-measure',
  '--reading-rail',
  '--reading-toc',
] as const;

describe('reading surface tokens', () => {
  it('declares every reading token exactly once', () => {
    for (const token of TOKENS) {
      const matches = globalCss.match(
        new RegExp(`${token}:`.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g'),
      );
      expect(matches?.length, `expected ${token} to appear exactly once`).toBe(
        1,
      );
    }
  });

  it('declares reading tokens inside :root', () => {
    const rootStart = globalCss.indexOf(':root {');
    expect(rootStart).toBeGreaterThan(-1);
    const rootEnd = globalCss.indexOf('\n  }', rootStart);
    expect(rootEnd).toBeGreaterThan(rootStart);
    const rootBlock = globalCss.slice(rootStart, rootEnd);
    for (const token of TOKENS) {
      expect(
        rootBlock.includes(`${token}:`),
        `${token} should be inside :root`,
      ).toBe(true);
    }
  });

  it('documents every reading token', () => {
    expect(designMd).toContain('## Reading Surfaces (Docs & Blog)');
    for (const token of TOKENS) {
      expect(
        designMd.includes(token),
        `DESIGN.md should mention ${token}`,
      ).toBe(true);
    }
  });

  it('keeps ink above surface lightness', () => {
    const inkMatch = globalCss.match(/--reading-ink:\s*oklch\(([\d.]+)/);
    const surfaceMatch = globalCss.match(
      /--reading-surface:\s*oklch\(([\d.]+)/,
    );
    expect(inkMatch).not.toBeNull();
    expect(surfaceMatch).not.toBeNull();
    const inkL = Number(inkMatch![1]);
    const surfaceL = Number(surfaceMatch![1]);
    expect(inkL).toBeGreaterThan(surfaceL + 0.5);
  });

  it('does not consume the tokens yet', () => {
    const matches = globalCss.match(/var\(--reading-/g);
    expect(matches ?? []).toHaveLength(0);
  });
});

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const navigationSource = readFileSync(
  fileURLToPath(
    new URL('../../src/components/Navigation.svelte', import.meta.url),
  ),
  'utf-8',
);
const globalCss = readFileSync(
  fileURLToPath(new URL('../../src/styles/global.css', import.meta.url)),
  'utf-8',
);

describe('rail toggle', () => {
  it('renders two toggles', () => {
    const matches = navigationSource.match(/class="rail-toggle/g) ?? [];
    expect(matches.length).toBe(2);
  });

  it('both toggles live inside the nav', () => {
    const navStart = navigationSource.indexOf('<nav id="desktop-catalog"');
    const navEnd = navigationSource.indexOf('</nav>');
    expect(navStart).toBeGreaterThan(-1);
    expect(navEnd).toBeGreaterThan(-1);

    const toggleIndexes: number[] = [];
    const re = /class="rail-toggle/g;
    let match: RegExpExecArray | null;
    while ((match = re.exec(navigationSource)) !== null) {
      toggleIndexes.push(match.index);
    }
    expect(toggleIndexes.length).toBe(2);
    for (const index of toggleIndexes) {
      expect(index).toBeGreaterThan(navStart);
      expect(index).toBeLessThan(navEnd);
    }
  });

  it('the collapsed rail keeps a visible strip', () => {
    expect(globalCss).toMatch(
      /html\[data-catalog='collapsed'\]\s*\{[^}]*--sidebar:\s*3\.25rem/,
    );
  });

  it('the collapsed rail no longer slides away', () => {
    expect(globalCss).not.toMatch(
      /data-catalog='collapsed'\]\s*\.desktop-catalog\s*\{[^}]*translateX/,
    );
  });

  it('the collapsed rail hides everything but the toggles', () => {
    expect(globalCss).toMatch(
      /html\[data-catalog='collapsed'\]\s*\.desktop-catalog\s*>\s*:not\(\.rail-toggle\)\s*\{[^}]*display:\s*none/,
    );
  });

  it('the toggle is no longer fixed-position', () => {
    const match = globalCss.match(/\.rail-toggle\s*\{[^}]*\}/);
    expect(match).not.toBeNull();
    const block = match?.[0] ?? '';
    expect(block).not.toMatch(/position:\s*fixed/);
  });
});

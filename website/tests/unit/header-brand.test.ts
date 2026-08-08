import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const navigationSource = readFileSync(
  fileURLToPath(
    new URL('../../src/components/Navigation.svelte', import.meta.url),
  ),
  'utf-8',
);
const baseLayoutSource = readFileSync(
  fileURLToPath(new URL('../../src/layouts/BaseLayout.astro', import.meta.url)),
  'utf-8',
);
const globalCss = readFileSync(
  fileURLToPath(new URL('../../src/styles/global.css', import.meta.url)),
  'utf-8',
);

describe('header brand', () => {
  it('the nav carries no text brand', () => {
    expect(navigationSource).not.toMatch(/class="brand"/);
  });

  it('the brand is the first header child', () => {
    const brandIndex = baseLayoutSource.indexOf('class="compact-brand"');
    const breadcrumbIndex = baseLayoutSource.indexOf('<Breadcrumb');
    expect(brandIndex).toBeGreaterThan(-1);
    expect(breadcrumbIndex).toBeGreaterThan(-1);
    expect(brandIndex).toBeLessThan(breadcrumbIndex);
  });

  it('the brand shows at every width', () => {
    const match = globalCss.match(/\.compact-brand\s*\{[^}]*\}/);
    expect(match).not.toBeNull();
    const block = match?.[0] ?? '';
    expect(block).toMatch(/display:\s*block/);
    expect(block).not.toMatch(/display:\s*none/);
  });

  it('the nav brand rule is gone', () => {
    expect(globalCss).not.toMatch(/^\s*\.brand\s*\{/m);
  });
});

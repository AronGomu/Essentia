import { test, expect } from '@playwright/test';

const basePath = process.env.E2E_BASE_PATH?.replace(/\/$/, '') ?? '';
const urlFor = (path: string) => `${basePath}${path}`;

test('panel exists on an archetype page', async ({ page }) => {
  await page.goto(urlFor('/archetypes/burning-abyss/'));
  const panel = page.locator('.catalog-hero-panel');
  await expect(panel).toBeVisible();
  await expect(panel.locator('h1')).toBeVisible();
  await expect(panel.locator('.catalog-stats')).toBeVisible();
});

test('panel background is translucent', async ({ page }) => {
  await page.goto(urlFor('/archetypes/burning-abyss/'));
  const backgroundColor = await page
    .locator('.catalog-hero-panel')
    .evaluate((el) => getComputedStyle(el).backgroundColor);
  // `color-mix(in oklab, ...)` resolves to either `rgba(r, g, b, a)` or
  // `oklab(l a b / alpha)` depending on the engine; alpha is always the
  // trailing number, comma- or slash-separated from the rest.
  const match = backgroundColor.match(/[\d.]+\s*\)\s*$/);
  expect(match, `unparseable color: ${backgroundColor}`).not.toBeNull();
  const hasAlpha = /[,/]\s*[\d.]+\s*\)\s*$/.test(backgroundColor);
  const alpha = hasAlpha ? Number(match![0].replace(')', '').trim()) : 1;
  expect(alpha).toBeLessThan(1);
});

test('panel has a visible border', async ({ page }) => {
  await page.goto(urlFor('/archetypes/burning-abyss/'));
  const panel = page.locator('.catalog-hero-panel');
  await expect(panel).toHaveCSS('border-top-width', '1px');
  await expect(panel).toHaveCSS('border-top-style', 'solid');
});

test('non-archetype section is untouched', async ({ page }) => {
  await page.goto(urlFor('/sections/non-archetype/non-archetype/'));
  await expect(page.locator('.catalog-hero-panel')).toHaveCount(0);
});

import { test, expect } from '@playwright/test';

const basePath = process.env.E2E_BASE_PATH?.replace(/\/$/, '') ?? '';
const urlFor = (path: string) => `${basePath}${path}`;

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
});

test('shows exactly ten new cards', async ({ page }) => {
  await page.goto(urlFor('/'));
  expect(await page.locator('.new-card-grid > li').count()).toBe(10);
});

test('has no blurb under the New cards heading', async ({ page }) => {
  await page.goto(urlFor('/'));
  const pCount = await page
    .locator('#new-cards-heading')
    .locator('xpath=..')
    .locator('p')
    .count();
  expect(pCount).toBe(0);
});

test('the view-all link is a primary button', async ({ page }) => {
  await page.goto(urlFor('/'));
  const link = page.locator('.new-card-more a');
  await expect(link).toHaveClass(/primary-link/);
  const text = (await link.textContent())?.trim() ?? '';
  expect(text).toMatch(/^View all \d+ new cards$/);
  const box = await link.boundingBox();
  expect(box?.height).toBeGreaterThanOrEqual(40);
});

test('the hero secondary button reads View new cards', async ({ page }) => {
  await page.goto(urlFor('/'));
  const link = page.locator('.hero-actions .secondary-link');
  await expect(link).toHaveText('View new cards');
  const href = await link.getAttribute('href');
  expect(href?.endsWith('/updates/')).toBe(true);
});

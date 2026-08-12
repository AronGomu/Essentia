import { test, expect } from '@playwright/test';

const basePath = process.env.E2E_BASE_PATH?.replace(/\/$/, '') ?? '';
const urlFor = (path: string) => `${basePath}${path}`;

test('full size link points at the print master', async ({ page }) => {
  await page.goto(urlFor('/cards/nekroz-trishula/'));
  const link = page.locator('a.full-size-link');
  await expect(link).toBeVisible();
  const href = await link.getAttribute('href');
  expect(href).toMatch(/-print\.png$/);
  await expect(link).toHaveAttribute('target', '_blank');
  const rel = await link.getAttribute('rel');
  expect(rel).toContain('noopener');
});

test('full size target is a real image', async ({ page, request }) => {
  await page.goto(urlFor('/cards/nekroz-trishula/'));
  const href = await page.locator('a.full-size-link').getAttribute('href');
  const response = await request.get(href!);
  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toMatch(/^image\/png/);
});

test('render is wider than the old cap on desktop', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(urlFor('/cards/nekroz-trishula/'));
  const box = await page
    .locator('.card-detail .render-column picture')
    .boundingBox();
  expect(box).not.toBeNull();
  expect(box!.width).toBeGreaterThan(400);
  expect(box!.width).toBeLessThanOrEqual(640);
});

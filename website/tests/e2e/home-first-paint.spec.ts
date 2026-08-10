import { test, expect } from '@playwright/test';

const basePath = process.env.E2E_BASE_PATH?.replace(/\/$/, '') ?? '';
const urlFor = (path: string) => `${basePath}${path}`;

test.use({ viewport: { width: 1920, height: 1080 } });

test('the New cards heading is visible on first load at 1920x1080', async ({
  page,
}) => {
  await page.goto(urlFor('/'));
  const box = await page.locator('#new-cards-heading').boundingBox();
  expect(box).not.toBeNull();
  expect(box!.y + box!.height).toBeLessThanOrEqual(1080);
});

test('the page has not been scrolled to achieve it', async ({ page }) => {
  await page.goto(urlFor('/'));
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
});

test('the heading sits close to the first card', async ({ page }) => {
  await page.goto(urlFor('/'));
  const headingBox = await page.locator('#new-cards-heading').boundingBox();
  const cardBox = await page
    .locator('.new-card-grid > li')
    .first()
    .boundingBox();
  expect(headingBox).not.toBeNull();
  expect(cardBox).not.toBeNull();
  expect(cardBox!.y - (headingBox!.y + headingBox!.height)).toBeLessThanOrEqual(
    40,
  );
});

test('the archetype heading sits close to its tiles', async ({ page }) => {
  await page.goto(urlFor('/'));
  const headingBox = await page.locator('#catalog-heading').boundingBox();
  const tileBox = await page.locator('.section-tile').first().boundingBox();
  expect(headingBox).not.toBeNull();
  expect(tileBox).not.toBeNull();
  expect(tileBox!.y - (headingBox!.y + headingBox!.height)).toBeLessThanOrEqual(
    40,
  );
});

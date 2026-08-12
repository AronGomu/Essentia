import { test, expect } from '@playwright/test';

const basePath = process.env.E2E_BASE_PATH?.replace(/\/$/, '') ?? '';
const urlFor = (path: string) => `${basePath}${path}`;

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(urlFor('/archetypes/burning-abyss/'));
});

test('preview overlaps the hovered tile', async ({ page }) => {
  const tile = page.locator('a.gallery-card').first();
  await tile.hover();
  const preview = page.locator('.card-hover-preview');
  await expect(preview).toHaveClass(/is-visible/);

  const tileBox = await tile.boundingBox();
  const previewBox = await preview.boundingBox();
  expect(tileBox).toBeTruthy();
  expect(previewBox).toBeTruthy();
  if (!tileBox || !previewBox) return;

  const overlapLeft = Math.max(tileBox.x, previewBox.x);
  const overlapTop = Math.max(tileBox.y, previewBox.y);
  const overlapRight = Math.min(
    tileBox.x + tileBox.width,
    previewBox.x + previewBox.width,
  );
  const overlapBottom = Math.min(
    tileBox.y + tileBox.height,
    previewBox.y + previewBox.height,
  );
  const overlapWidth = Math.max(0, overlapRight - overlapLeft);
  const overlapHeight = Math.max(0, overlapBottom - overlapTop);
  const overlapArea = overlapWidth * overlapHeight;
  const tileArea = tileBox.width * tileBox.height;

  expect(overlapArea / tileArea).toBeGreaterThanOrEqual(0.6);
});

test('preview is about 75% of the viewport height', async ({ page }) => {
  const tile = page.locator('a.gallery-card').first();
  await tile.hover();
  const preview = page.locator('.card-hover-preview');
  await expect(preview).toHaveClass(/is-visible/);

  const previewBox = await preview.boundingBox();
  expect(previewBox).toBeTruthy();
  if (!previewBox) return;

  expect(previewBox.height).toBeGreaterThanOrEqual(0.7 * 900);
  expect(previewBox.height).toBeLessThanOrEqual(0.76 * 900);
});

test('hover zone stays on the tile', async ({ page }) => {
  const tile = page.locator('a.gallery-card').first();
  await tile.hover();
  const preview = page.locator('.card-hover-preview');
  await expect(preview).toHaveClass(/is-visible/);

  const pointerEvents = await preview.evaluate(
    (el) => getComputedStyle(el).pointerEvents,
  );
  expect(pointerEvents).toBe('none');

  await page.locator('body').hover({ position: { x: 5, y: 5 } });
  await expect(preview).not.toHaveClass(/is-visible/);
});

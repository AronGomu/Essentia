import { test, expect } from '@playwright/test';

const basePath = process.env.E2E_BASE_PATH?.replace(/\/$/, '') ?? '';
const urlFor = (path: string) => `${basePath}${path}`;

test.use({ viewport: { width: 1440, height: 900 } });

test('related band sits below the card grid', async ({ page }) => {
  await page.goto(urlFor('/cards/burning-abyss-graff/'));
  const detailBox = await page.locator('.card-detail').boundingBox();
  const bandBox = await page.locator('.related-band').boundingBox();
  expect(detailBox).toBeTruthy();
  expect(bandBox).toBeTruthy();
  expect(bandBox!.y).toBeGreaterThan(detailBox!.y + detailBox!.height - 1);
});

test('related band is wider than the transcription column', async ({
  page,
}) => {
  await page.goto(urlFor('/cards/burning-abyss-graff/'));
  const bandBox = await page.locator('.related-band').boundingBox();
  const transcriptionBox = await page
    .locator('.card-transcription')
    .boundingBox();
  expect(bandBox).toBeTruthy();
  expect(transcriptionBox).toBeTruthy();
  expect(bandBox!.width).toBeGreaterThan(transcriptionBox!.width);
});

test('render unsticks at the end of the detail block', async ({ page }) => {
  await page.goto(urlFor('/cards/burning-abyss-graff/'));
  await page.evaluate(() =>
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' }),
  );
  await page.waitForTimeout(150);
  const imgBox = await page.locator('.render-column img').boundingBox();
  const bandBox = await page.locator('.related-band').boundingBox();
  expect(imgBox).toBeTruthy();
  expect(bandBox).toBeTruthy();
  expect(imgBox!.y + imgBox!.height).toBeLessThan(bandBox!.y);
});

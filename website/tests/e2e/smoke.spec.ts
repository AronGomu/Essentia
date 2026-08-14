import { test, expect } from '@playwright/test';

const basePath = process.env.E2E_BASE_PATH?.replace(/\/$/, '') ?? '';
const urlFor = (path: string) => `${basePath}${path}`;

// Same stale assertion showcase.spec.ts carried: this required
// `index.astro`'s `.empty-publication` branch, which stopped rendering once
// LOTA-0001-Alpha_0.1 published its sections. The home now takes the
// section-tile branch. What the smoke test is actually for — the preview
// server answers 200 and the home is the published archive, not a card
// gallery — is unchanged.
test('production preview serves the published section archive', async ({
  page,
  request,
}) => {
  await page.setViewportSize({ width: 400, height: 800 });
  const failedRequests: string[] = [];
  const failedResponses: string[] = [];
  page.on('requestfailed', (req) => {
    if (
      new URL(req.url()).origin === 'http://127.0.0.1:4201' &&
      req.failure()?.errorText !== 'net::ERR_ABORTED'
    )
      failedRequests.push(`${req.failure()?.errorText} ${req.url()}`);
  });
  page.on('response', (response) => {
    if (
      new URL(response.url()).origin === 'http://127.0.0.1:4201' &&
      response.status() >= 400
    )
      failedResponses.push(`${response.status()} ${response.url()}`);
  });

  const response = await page.goto(urlFor('/'));
  expect(response?.ok()).toBe(true);
  await expect(page.locator('.empty-publication')).toHaveCount(0);
  await expect(
    page.getByRole('heading', { name: 'Archetypes', exact: true }),
  ).toBeVisible();
  expect(await page.locator('.section-tile').count()).toBeGreaterThan(0);
  // The home links into the sections; it never lists individual cards.
  await expect(page.locator('.gallery-card')).toHaveCount(0);

  await page.locator('.section-tile').first().click();
  const card = page.locator('.gallery-card').first();
  await card.scrollIntoViewIfNeeded();
  await expect(card).toBeVisible();
  const candidate = await card
    .locator('source[srcset]')
    .first()
    .getAttribute('srcset')
    .then((srcset) => srcset?.trim().split(/\s+/)[0]);
  expect(candidate).toBeTruthy();
  const pathname = new URL(candidate!, page.url()).pathname;
  expect(pathname.startsWith(`${basePath || ''}/`)).toBe(true);
  expect((await request.get(candidate!)).status()).toBe(200);
  await expect
    .poll(() =>
      card.locator('img').evaluate((image) => {
        const img = image as HTMLImageElement;
        return img.complete && img.naturalWidth > 0;
      }),
    )
    .toBe(true);
  expect(failedRequests).toEqual([]);
  expect(failedResponses).toEqual([]);
});

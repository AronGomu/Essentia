import { test, expect } from '@playwright/test';

const basePath = process.env.E2E_BASE_PATH?.replace(/\/$/, '') ?? '';
const urlFor = (path: string) => `${basePath}${path}`;

test('archetype page paints the photo backdrop', async ({ page }) => {
  await page.goto(urlFor('/archetypes/nekroz/'));
  await expect(page.locator('html')).toHaveAttribute('data-page', 'archetype');
  const backgroundImage = await page.evaluate(
    () => getComputedStyle(document.body, '::before').backgroundImage,
  );
  expect(backgroundImage).toContain('backgrounds/nekroz');
});

test('card page of the same theme has no photo backdrop', async ({ page }) => {
  await page.goto(urlFor('/cards/nekroz-trishula/'));
  const backgroundImage = await page.evaluate(
    () => getComputedStyle(document.body, '::before').backgroundImage,
  );
  expect(backgroundImage).not.toContain('backgrounds/');
});

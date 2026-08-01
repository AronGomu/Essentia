import { test, expect } from '@playwright/test';

const basePath = process.env.E2E_BASE_PATH?.replace(/\/$/, '') ?? '';
const urlFor = (path: string) => `${basePath}${path}`;

test('production preview serves draft-only empty archive', async ({ page }) => {
  const response = await page.goto(urlFor('/'));
  expect(response?.ok()).toBe(true);
  await expect(
    page.getByRole('heading', {
      name: 'No release packages published yet.',
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByText(/Legend of the Alpha (LOTA-0001) Alpha_0.1 is open under alpha/),
  ).toBeVisible();
  await expect(page.locator('.gallery-card')).toHaveCount(0);
});

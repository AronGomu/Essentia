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
}) => {
  const response = await page.goto(urlFor('/'));
  expect(response?.ok()).toBe(true);
  await expect(page.locator('.empty-publication')).toHaveCount(0);
  await expect(
    page.getByRole('heading', { name: 'Archetypes', exact: true }),
  ).toBeVisible();
  expect(await page.locator('.section-tile').count()).toBeGreaterThan(0);
  // The home links into the sections; it never lists individual cards.
  await expect(page.locator('.gallery-card')).toHaveCount(0);
});

import { test, expect } from '@playwright/test';

const basePath = process.env.E2E_BASE_PATH?.replace(/\/$/, '') ?? '';
const urlFor = (path: string) => `${basePath}${path}`;

/**
 * A card mention in prose is the same hover contract as a gallery tile — the
 * overlay is one element in the shell, driven by `data-card-preview`. These
 * tests assert prose reaches it, because nothing in the renderer would fail
 * loudly if the attributes were dropped from the anchor.
 */
const DECKLIST = '/docs/rules/decklists-alpha-0-1/';

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
});

test('a decklist links every card it names', async ({ page }) => {
  await page.goto(urlFor(DECKLIST));
  const mentions = page.locator('.decklist .card-mention');
  await expect(mentions.first()).toBeVisible();
  expect(await mentions.count()).toBeGreaterThan(20);

  // Basic lands are in no package, so they are the one unlinked entry kind.
  const lands = page.locator('.decklist .decklist-land');
  expect(await lands.count()).toBe(2);
});

test('hovering a mention shows the card render and its rulings', async ({
  page,
}) => {
  await page.goto(urlFor(DECKLIST));
  const mention = page.locator('.decklist .card-mention').first();
  await mention.hover();

  const preview = page.locator('.card-hover-preview');
  await expect(preview).toHaveClass(/is-visible/);
  await expect(preview.locator('img')).toHaveAttribute(
    'src',
    /burning-abyss-graff-display\.webp$/,
  );
  await expect(preview.locator('.keyword-ruling').first()).toBeVisible();
});

test('a mention navigates to the card page', async ({ page }) => {
  await page.goto(urlFor(DECKLIST));
  await page.locator('.decklist .card-mention').first().click();
  await expect(page).toHaveURL(new RegExp('/cards/burning-abyss-graff/$'));
  await expect(page.locator('h1')).toHaveText('Burning Abyss - Graff');
});

test('a keyboard user gets the preview on focus', async ({ page }) => {
  await page.goto(urlFor(DECKLIST));
  const mention = page.locator('.decklist .card-mention').first();
  await mention.focus();
  await expect(page.locator('.card-hover-preview')).toHaveClass(/is-visible/);
});

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

// Each theme contributes its own number of `--page-atmosphere` layers, and a
// per-layer size list cycles: the photo landed on `auto` whenever the layer
// count and the list length disagreed.
for (const slug of ['nekroz', 'burning-abyss']) {
  test(`${slug} backdrop covers the viewport`, async ({ page }) => {
    await page.goto(urlFor(`/archetypes/${slug}/`));
    const backdrop = await page.evaluate(() => {
      const style = getComputedStyle(document.body, '::before');
      return { image: style.backgroundImage, size: style.backgroundSize };
    });
    expect(backdrop.image).toContain(`backgrounds/${slug}`);
    expect(backdrop.size).toContain('cover');
    expect(backdrop.size).not.toContain('auto');
  });
}

test('card page of the same theme has no photo backdrop', async ({ page }) => {
  await page.goto(urlFor('/cards/nekroz-trishula/'));
  const backgroundImage = await page.evaluate(
    () => getComputedStyle(document.body, '::before').backgroundImage,
  );
  expect(backgroundImage).not.toContain('backgrounds/');
});

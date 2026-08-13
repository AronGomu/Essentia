import { expect, test } from '@playwright/test';

test.describe('blog landing', () => {
  test('/blog/ renders the latest post body', async ({ page }) => {
    await page.goto('/blog/');
    const firstRailItem = page
      .locator('.desktop-catalog .reading-nav-item')
      .first();
    const latestTitle = await firstRailItem
      .locator('.nav-item-title')
      .innerText();

    await expect(page.locator('h1')).toHaveText(latestTitle);
    await expect(page.locator('.post-body')).toBeVisible();
    await expect(page.locator('.post-list')).toHaveCount(0);
  });

  test('/blog/ points its canonical at the post URL', async ({ page }) => {
    await page.goto('/blog/');
    const latestHref = await page
      .locator('.desktop-catalog .reading-nav-item')
      .first()
      .getAttribute('href');
    const canonicalHref = await page
      .locator('link[rel="canonical"]')
      .getAttribute('href');

    expect(latestHref).not.toBeNull();
    expect(canonicalHref).not.toBeNull();
    expect(new URL(canonicalHref!).pathname).toBe(
      new URL(latestHref!, page.url()).pathname,
    );
  });

  test('post routes remain self-canonical', async ({ page }) => {
    await page.goto('/blog/lota-alpha-v0-1-presentation/');
    const canonicalHref = await page
      .locator('link[rel="canonical"]')
      .getAttribute('href');

    expect(canonicalHref).not.toBeNull();
    expect(new URL(canonicalHref!).pathname).toBe(
      '/blog/lota-alpha-v0-1-presentation/',
    );
  });

  test('the rail lists posts with a numeric date below each title', async ({
    page,
  }) => {
    await page.goto('/blog/');
    const firstRailItem = page
      .locator('.desktop-catalog .reading-nav-item')
      .first();
    const title = firstRailItem.locator('.nav-item-title');
    const meta = firstRailItem.locator('.nav-item-meta');

    await expect(meta).toHaveText(/^\d{2}\/\d{2}\/\d{4}$/);
    await expect(title).toHaveCSS('display', 'block');
    await expect(meta).toHaveCSS('display', 'block');
    const titleBox = await title.boundingBox();
    const metaBox = await meta.boundingBox();
    expect(titleBox).not.toBeNull();
    expect(metaBox).not.toBeNull();
    expect(metaBox!.y).toBeGreaterThanOrEqual(titleBox!.y + titleBox!.height);

    await page.setViewportSize({ width: 390, height: 800 });
    await page.getByRole('button', { name: 'Docs & blog' }).click();
    const drawerItems = page.locator('.mobile-drawer .reading-nav-item');
    await expect(drawerItems).toHaveCount(2);
    await expect(drawerItems.first().locator('.nav-item-meta')).toHaveText(
      '08/08/2026',
    );
    await expect(drawerItems.nth(1).locator('.nav-item-meta')).toHaveText(
      '01/08/2026',
    );
  });
});

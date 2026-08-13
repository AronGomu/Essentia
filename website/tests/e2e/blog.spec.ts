import { expect, test, type Page } from '@playwright/test';

async function expectChapterNavigation(page: Page, route: string) {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(route);

  const article = page.locator('.reading-body');
  const summary = page.locator('.chapter-summary');
  const articleBox = await article.boundingBox();
  const summaryBox = await summary.boundingBox();
  expect(articleBox).not.toBeNull();
  expect(summaryBox).not.toBeNull();
  expect(summaryBox!.x).toBeGreaterThanOrEqual(
    articleBox!.x + articleBox!.width,
  );

  await summary.getByRole('link', { name: 'Archetypes', exact: true }).click();
  await expect(page).toHaveURL(/#archetypes$/);

  let settledOffset: number | null = null;
  await expect
    .poll(
      async () => {
        const headerBox = await page.locator('.site-header').boundingBox();
        const targetBox = await page.locator('#archetypes').boundingBox();
        if (!headerBox || !targetBox) return false;
        settledOffset = targetBox.y - (headerBox.y + headerBox.height);
        return settledOffset >= 0 && settledOffset <= 32;
      },
      { intervals: [16] },
    )
    .toBe(true);
  expect(settledOffset).not.toBeNull();
  expect(settledOffset!).toBeGreaterThanOrEqual(0);
  expect(settledOffset!).toBeLessThanOrEqual(32);

  const headerBox = await page.locator('.site-header').boundingBox();
  const targetBox = await page.locator('#archetypes').boundingBox();
  expect(headerBox).not.toBeNull();
  expect(targetBox).not.toBeNull();
  expect(targetBox!.y - (headerBox!.y + headerBox!.height)).toBeLessThanOrEqual(
    32,
  );
}

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

  test('blog landing chapter links scroll to their sections', async ({
    page,
  }) => {
    await expectChapterNavigation(page, '/blog/');
  });

  test('blog post chapter links scroll to their sections', async ({ page }) => {
    await expectChapterNavigation(page, '/blog/lota-alpha-v0-1-presentation/');
  });

  test('blog chapter summary moves above prose below 64rem', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 900, height: 900 });
    await page.goto('/blog/lota-alpha-v0-1-presentation/');

    const summaryBox = await page.locator('.chapter-summary').boundingBox();
    const articleBox = await page.locator('.reading-body').boundingBox();
    expect(summaryBox).not.toBeNull();
    expect(articleBox).not.toBeNull();
    expect(summaryBox!.y + summaryBox!.height).toBeLessThanOrEqual(
      articleBox!.y,
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

import { expect, test } from '@playwright/test';

const basePath = process.env.E2E_BASE_PATH?.replace(/\/$/, '') ?? '';
const urlFor = (path: string) => `${basePath}${path}`;

const docsRail = (page: import('@playwright/test').Page) =>
  page.getByRole('navigation', { name: 'Documentation and blog' });

test('the active group is open and others are closed', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 900 });
  await page.goto(urlFor('/docs/rules/zones/'));

  const groups = docsRail(page).locator('details');
  await expect(
    groups.filter({ has: page.getByRole('link', { name: 'Zones' }) }),
  ).toHaveAttribute('open', '');
  await expect(groups).toHaveCount(await groups.count());
  expect(
    await groups.evaluateAll((nodes) =>
      nodes.some((node) => !node.hasAttribute('open')),
    ),
  ).toBe(true);
});

test('toggling a group persists across navigation', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 900 });
  await page.goto(urlFor('/docs/rules/zones/'));

  const rail = docsRail(page);
  const label = await rail
    .locator('details:not([open]) summary')
    .first()
    .textContent();
  const toggled = rail
    .locator('details')
    .filter({ has: page.getByText(label!, { exact: true }) });
  await toggled.locator('summary').click();
  await expect(toggled).toHaveAttribute('open', '');

  await page.goto(urlFor('/docs/'));
  await page.goBack();
  await expect(
    docsRail(page)
      .locator('details')
      .filter({ has: page.getByText(label!, { exact: true }) }),
  ).toHaveAttribute('open', '');

  const active = docsRail(page).locator('details').filter({ hasText: 'Zones' });
  await active.locator('summary').click();
  await expect(active).not.toHaveAttribute('open', '');
  await page.reload();
  await expect(
    docsRail(page).locator('details').filter({ hasText: 'Zones' }),
  ).toHaveAttribute('open', '');
});

test('the rail has no Docs/Blog switch', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 900 });
  await page.goto(urlFor('/docs/'));
  await expect(page.locator('.reading-switch')).toHaveCount(0);
});

test('the mobile drawer has no Docs/Blog switch', async ({ page }) => {
  await page.setViewportSize({ width: 400, height: 800 });
  await page.goto(urlFor('/docs/'));
  await page.getByRole('button', { name: 'Docs & blog' }).click();
  await expect(page.getByRole('dialog', { name: 'Docs & blog' })).toBeVisible();
  await expect(page.locator('.reading-switch')).toHaveCount(0);
});

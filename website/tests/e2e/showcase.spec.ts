import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const basePath = process.env.E2E_BASE_PATH?.replace(/\/$/, '') ?? '';
const urlFor = (path: string) => `${basePath}${path}`;

test('empty publication home is English and accessible', async ({ page }) => {
  await page.goto(urlFor('/'));
  await expect(page).toHaveTitle('Essentia — The Blackfoil Archive');
  await expect(page.locator('.brand')).toHaveText('Essentia');
  await expect(page.locator('.compact-brand')).toHaveText('Essentia');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(
    page.getByRole('heading', { name: 'No release packages published yet.' }),
  ).toBeVisible();
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test('mobile drawer traps entry and restores focus', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(urlFor('/'));
  const trigger = page.getByRole('button', { name: 'Catalog' });
  await trigger.click();
  const dialog = page.getByRole('dialog', { name: 'Catalog' });
  await expect(dialog).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Close catalog' }),
  ).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect
    .poll(() =>
      page.evaluate(() => document.activeElement?.closest('dialog')?.open),
    )
    .toBe(true);
  await page.getByRole('button', { name: 'Close catalog' }).click();
  await expect(trigger).toBeFocused();
});

test('static routes pass automated accessibility scans', async ({
  page,
  browserName,
}) => {
  test.skip(browserName !== 'chromium', 'full route coverage runs once');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const route of [
    '/',
    '/updates/',
    '/rules/',
    '/philosophy/',
    '/legal/',
  ]) {
    await page.goto(urlFor(route));
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations, route).toEqual([]);
  }
});

test('empty search remains keyboard accessible', async ({ page }) => {
  await page.goto(urlFor('/'));
  await page.getByRole('button', { name: /Find a card/ }).click();
  await page.getByRole('button', { name: 'Close search' }).click();
  await page.keyboard.press(
    process.platform === 'darwin' ? 'Meta+K' : 'Control+K',
  );
  const search = page.getByRole('combobox', {
    name: /Search current or former card name/i,
  });
  await expect(search).toBeFocused();
  await search.fill('Trishula');
  await expect(
    page.getByText('No card name matches “Trishula”.'),
  ).toBeVisible();
});

test('rules and philosophy expose chapter summaries', async ({ page }) => {
  await page.goto(urlFor('/rules/'));
  const rulesToc = page.getByRole('navigation', { name: 'Chapter summary' });
  await expect(rulesToc.getByRole('link', { name: 'Traps' })).toHaveAttribute(
    'href',
    '#traps',
  );
  await page.goto(urlFor('/philosophy/'));
  const philosophyToc = page.getByRole('navigation', {
    name: 'Chapter summary',
  });
  await expect(
    philosophyToc.getByRole('link', { name: 'What the cube avoids' }),
  ).toHaveAttribute('href', '#avoids');
});

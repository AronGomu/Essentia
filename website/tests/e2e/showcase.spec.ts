import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const basePath = process.env.E2E_BASE_PATH?.replace(/\/$/, '') ?? '';
const urlFor = (path: string) => `${basePath}${path}`;

test('empty publication home is English and accessible', async ({ page }) => {
  await page.goto(urlFor('/'));
  await expect(page).toHaveTitle('Essentia — The Blackfoil Archive');
  await expect(page.locator('.compact-brand img')).toHaveAttribute(
    'alt',
    'Essentia',
  );
  await expect(page.locator('.brand')).toHaveCount(0);
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

const findHotkey = process.platform === 'darwin' ? 'Meta+K' : 'Control+K';
const findInput = (page: import('@playwright/test').Page) =>
  page.getByRole('combobox', {
    name: /Search cards, docs, blog posts and decks/i,
  });

test('empty search remains keyboard accessible', async ({ page }) => {
  await page.goto(urlFor('/'));
  await page.getByRole('button', { name: /Find/ }).click();
  await page.getByRole('button', { name: 'Close search' }).click();
  await page.keyboard.press(findHotkey);
  const search = findInput(page);
  await expect(search).toBeFocused();
  // Four z's cannot be a subsequence of any indexed title, so every kind drops.
  await search.fill('zzzz');
  await expect(page.getByText('Nothing matches “zzzz”.')).toBeVisible();
});

/**
 * `page.goto` resolves on `load`, which can land before a `client:load` island
 * has hydrated. The Find hotkey rides `<svelte:window on:keydown>`, so a press
 * sent before hydration is dropped — and `keyboard.press` is one-shot, with no
 * actionability retry to save it. Press until the palette answers.
 */
async function openFindWithHotkey(page: import('@playwright/test').Page) {
  await expect
    .poll(async () => {
      await page.keyboard.press(findHotkey);
      return findInput(page).isVisible();
    })
    .toBe(true);
}

test('Find reaches a doc and navigates to it', async ({ page }) => {
  await page.goto(urlFor('/'));
  await openFindWithHotkey(page);
  await findInput(page).fill('zones');
  const row = page
    .locator('#find-results li[data-find-kind="doc"]')
    .filter({ hasText: 'Zones' })
    .first();
  await expect(
    page.locator('.find-group-label', { hasText: 'Docs' }),
  ).toBeVisible();
  await expect(row).toBeVisible();
  await row.click();
  await expect(page).toHaveURL(new RegExp(`${urlFor('/docs/rules/zones/')}$`));
});

test('Find lists this browser’s own decks and opens one', async ({ page }) => {
  await page.goto(urlFor('/decks/'));
  await page.getByLabel('New deck name').fill('E2E Private Deck');
  await page.getByRole('button', { name: 'New deck' }).click();

  await page.keyboard.press(findHotkey);
  await findInput(page).fill('private');
  const row = page
    .locator('#find-results li[data-find-kind="deck"]')
    .filter({ hasText: 'Saved in this browser' })
    .first();
  await expect(row).toContainText('E2E Private Deck');
  await row.click();

  await expect(page).toHaveURL(/\/decks\/#deck-/);
  await expect(
    page.getByRole('heading', { name: 'Editing E2E Private Deck' }),
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

test('catalog rail collapses to a strip that keeps both toggles', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1400, height: 900 });
  await page.goto(urlFor('/'));

  const collapseButtons = page.getByRole('button', {
    name: 'Collapse catalog',
  });
  await expect(collapseButtons).toHaveCount(2);
  await expect(collapseButtons.first()).toBeVisible();
  await expect(collapseButtons.last()).toBeVisible();

  await collapseButtons.first().click();
  await expect(page.locator('html')).toHaveAttribute(
    'data-catalog',
    'collapsed',
  );

  const expandButtons = page.getByRole('button', { name: 'Expand catalog' });
  await expect(expandButtons).toHaveCount(2);
  await expect(expandButtons.first()).toBeVisible();
  await expect(expandButtons.last()).toBeVisible();

  await expandButtons.last().click();
  await expect(page.locator('html')).toHaveAttribute(
    'data-catalog',
    'expanded',
  );
});

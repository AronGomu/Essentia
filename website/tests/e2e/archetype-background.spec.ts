import { test, expect } from '@playwright/test';

const basePath = process.env.E2E_BASE_PATH?.replace(/\/$/, '') ?? '';
const urlFor = (path: string) => `${basePath}${path}`;

const backdropStyles = () => {
  const main = document.querySelector('main')!;
  const style = getComputedStyle(main, '::before');
  return {
    backgroundImage: style.backgroundImage,
    filter: style.filter,
    transform: style.transform,
    position: style.position,
    top: Number.parseFloat(style.top),
    right: Number.parseFloat(style.right),
    bottom: Number.parseFloat(style.bottom),
    left: Number.parseFloat(style.left),
    width: Number.parseFloat(style.width),
    height: Number.parseFloat(style.height),
    mainTop: main.getBoundingClientRect().top,
    mainWidth: main.clientWidth,
    mainHeight: main.clientHeight,
    mainOverflow: getComputedStyle(main).overflow,
    documentWidth: document.documentElement.scrollWidth,
    viewportWidth: document.documentElement.clientWidth,
  };
};

test('archetype page paints the photo inside main', async ({ page }) => {
  await page.goto(urlFor('/archetypes/nekroz/'));
  await expect(page.locator('html')).toHaveAttribute('data-page', 'archetype');
  const backdrop = await page.evaluate(backdropStyles);
  expect(backdrop.backgroundImage).toContain('backgrounds/nekroz');
});

test('the photo is unblurred and dimmed', async ({ page }) => {
  await page.goto(urlFor('/archetypes/nekroz/'));
  const backdrop = await page.evaluate(backdropStyles);
  expect(backdrop.filter).toBe('none');
  expect(backdrop.backgroundImage).toContain('linear-gradient');
  expect(backdrop.transform).not.toBe('none');
});

test('body carries no atmosphere on an archetype page', async ({ page }) => {
  await page.goto(urlFor('/archetypes/burning-abyss/'));
  const backgroundImage = await page.evaluate(
    () => getComputedStyle(document.body, '::before').backgroundImage,
  );
  expect(
    backgroundImage === 'none' || !backgroundImage.includes('backgrounds/'),
  ).toBe(true);
});

test('the backdrop covers main and is clipped to it', async ({ page }) => {
  await page.setViewportSize({ width: 400, height: 800 });
  await page.goto(urlFor('/archetypes/nekroz/'));
  const backdrop = await page.evaluate(backdropStyles);
  expect(backdrop.position).toBe('absolute');
  expect([
    backdrop.top,
    backdrop.right,
    backdrop.bottom,
    backdrop.left,
  ]).toEqual([0, 0, 0, 0]);
  expect(backdrop.mainTop + backdrop.top).toBeGreaterThanOrEqual(
    backdrop.mainTop,
  );
  expect(Math.abs(backdrop.width - backdrop.mainWidth)).toBeLessThanOrEqual(2);
  expect(Math.abs(backdrop.height - backdrop.mainHeight)).toBeLessThanOrEqual(
    2,
  );
  expect(backdrop.mainOverflow).toBe('hidden');
  expect(backdrop.documentWidth).toBe(backdrop.viewportWidth);
});

test('card page of the same theme has no photo backdrop', async ({ page }) => {
  await page.goto(urlFor('/cards/nekroz-trishula/'));
  const backgrounds = await page.evaluate(() => ({
    body: getComputedStyle(document.body, '::before').backgroundImage,
    main: getComputedStyle(document.querySelector('main')!, '::before')
      .backgroundImage,
  }));
  expect(backgrounds.body).not.toContain('backgrounds/');
  expect(backgrounds.main).not.toContain('backgrounds/');
});

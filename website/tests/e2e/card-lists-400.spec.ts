import { test, expect } from '@playwright/test';

const basePath = process.env.E2E_BASE_PATH?.replace(/\/$/, '') ?? '';
const urlFor = (path: string) => `${basePath}${path}`;

/** Rounded `x` of every matched element's bounding box, dropping elements
 * that are not rendered (0-size / detached) at this viewport. */
const boxXs = async (
  page: import('@playwright/test').Page,
  selector: string,
) => {
  const boxes = await page
    .locator(selector)
    .evaluateAll((elements) =>
      elements.map((element) => element.getBoundingClientRect()),
    );
  return boxes.map((box) => Math.round(box.x));
};

const boxYs = async (
  page: import('@playwright/test').Page,
  selector: string,
) => {
  const boxes = await page
    .locator(selector)
    .evaluateAll((elements) =>
      elements.map((element) => element.getBoundingClientRect()),
    );
  return boxes.map((box) => Math.round(box.y));
};

test('homepage new cards are one per row at 400px', async ({ page }) => {
  await page.setViewportSize({ width: 400, height: 800 });
  await page.goto(urlFor('/'));
  const xs = await boxXs(page, '.new-card-grid > li');
  const ys = await boxYs(page, '.new-card-grid > li');
  expect(xs.length).toBeGreaterThan(0);
  expect(new Set(xs).size).toBe(1);
  expect(new Set(ys).size).toBe(xs.length);
});

test('the archetype gallery is one per row at 400px', async ({ page }) => {
  await page.setViewportSize({ width: 400, height: 800 });
  await page.goto(urlFor('/archetypes/burning-abyss/'));
  const xs = await boxXs(page, '.gallery-card');
  expect(xs.length).toBeGreaterThan(0);
  expect(new Set(xs).size).toBe(1);
});

test('two per row at 560px', async ({ page }) => {
  await page.setViewportSize({ width: 560, height: 800 });
  await page.goto(urlFor('/'));
  const xs = await boxXs(page, '.new-card-grid > li');
  expect(xs.length).toBeGreaterThan(0);
  expect(new Set(xs).size).toBe(2);
});

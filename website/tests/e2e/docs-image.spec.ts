import { test, expect } from '@playwright/test';

const basePath = process.env.E2E_BASE_PATH?.replace(/\/$/, '') ?? '';
const urlFor = (path: string) => `${basePath}${path}`;

test('docs index shows the scaled card image', async ({ page }) => {
  await page.goto(urlFor('/docs/'));
  const image = page.locator('img.md-image');
  await expect(image).toBeVisible();
  await expect(image).toHaveClass(/md-image-scale-60/);
  // The image is `loading="lazy" decoding="async"` and sits below the fold, so
  // Firefox and WebKit only fetch it once it is scrolled near the viewport, and
  // `naturalWidth` stays 0 until the decode lands. Scroll first, then poll.
  await image.scrollIntoViewIfNeeded();
  await expect
    .poll(() => image.evaluate((node: HTMLImageElement) => node.naturalWidth))
    .toBeGreaterThan(0);

  const imageBox = await image.boundingBox();
  const readingBody = page.locator('.reading-body');
  const readingContentWidth = await readingBody.evaluate((el) => {
    const style = getComputedStyle(el);
    return (
      el.clientWidth -
      parseFloat(style.paddingLeft) -
      parseFloat(style.paddingRight)
    );
  });
  expect(imageBox).not.toBeNull();
  const ratio = imageBox!.width / readingContentWidth;
  expect(ratio).toBeGreaterThan(0.58);
  expect(ratio).toBeLessThan(0.62);
});

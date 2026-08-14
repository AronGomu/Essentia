import { expect, test } from '@playwright/test';

const basePath = process.env.E2E_BASE_PATH?.replace(/\/$/, '') ?? '';
const urlFor = (path: string) => `${basePath}${path}`;

test('docs tables and inline code reflow inside a 320px viewport', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto(urlFor('/docs/releases/'));

  const body = page.locator('.reading-body');
  const table = body.locator('table').first();
  const inlineCodes = body.locator('code:not(pre code)');
  const pre = body.locator('pre').first();
  await expect(table).toBeVisible();
  expect(await inlineCodes.count()).toBeGreaterThan(0);
  await expect(pre).toBeVisible();

  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    await page.evaluate(() => document.documentElement.clientWidth),
  );

  const contentRight = await body.evaluate((element) => {
    const style = getComputedStyle(element);
    return (
      element.getBoundingClientRect().right - parseFloat(style.paddingRight)
    );
  });
  expect(
    (await table.boundingBox())!.x + (await table.boundingBox())!.width,
  ).toBeLessThanOrEqual(contentRight + 0.5);

  const longestCodeIndex = await inlineCodes.evaluateAll((nodes) => {
    let longest = 0;
    for (let index = 1; index < nodes.length; index += 1)
      if (
        (nodes[index]!.textContent?.length ?? 0) >
        (nodes[longest]!.textContent?.length ?? 0)
      )
        longest = index;
    return longest;
  });
  const longestCode = inlineCodes.nth(longestCodeIndex);
  const codeBox = await longestCode.boundingBox();
  expect(codeBox).not.toBeNull();
  expect(codeBox!.x + codeBox!.width).toBeLessThanOrEqual(contentRight + 0.5);
  await expect(longestCode).toHaveCSS('overflow-wrap', 'anywhere');
  await expect(longestCode).toHaveCSS('word-break', 'break-word');
  await expect(pre).toHaveCSS('overflow-x', 'auto');
});

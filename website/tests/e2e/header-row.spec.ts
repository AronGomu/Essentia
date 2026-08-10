import { test, expect } from '@playwright/test';

const basePath = process.env.E2E_BASE_PATH?.replace(/\/$/, '') ?? '';
const urlFor = (path: string) => `${basePath}${path}`;

// The compact header's controls carry different authored heights (T5: 32px
// brand, ~36-44px drawer trigger, ~39px utility-more, ~48-49px search
// trigger) and are vertically centered, so `top` differs by up to ~17px
// even within one visual row. Cluster sorted tops instead of an exact
// rounded match, matching the tolerance used by BaseLayout's runtime guard.
const rowCount = (page: import('@playwright/test').Page) =>
  page.evaluate(() => {
    const header = document.querySelector('.site-header')!;
    const items = header.querySelectorAll(
      '.compact-brand, .drawer-trigger, .breadcrumb, .utility-nav, .search-trigger',
    );
    const tops: number[] = [];
    for (const item of items) {
      if (!item.getClientRects().length) continue;
      tops.push(item.getBoundingClientRect().top);
    }
    tops.sort((a, b) => a - b);
    let rows = tops.length ? 1 : 0;
    for (let i = 1; i < tops.length; i++) {
      if (tops[i]! - tops[i - 1]! > 20) rows++;
    }
    return rows;
  });

/**
 * The three stages `feedback.md` 8.6 asks for, at the width each one starts.
 * Stage 1 sits on the rail→drawer breakpoint: that is the width the header
 * gains a `.drawer-trigger` and loses the rail's column, so it is where the
 * width budget actually breaks.
 */
const STAGE_BOUNDARIES = [
  { width: 1024, stage: 1 },
  { width: 896, stage: 2 },
  { width: 704, stage: 3 },
  { width: 400, stage: 3 },
] as const;

test('the header holds one row at 400px', async ({ page }) => {
  await page.setViewportSize({ width: 400, height: 800 });
  for (const path of ['/', '/archetypes/burning-abyss/']) {
    await page.goto(urlFor(path));
    expect(await rowCount(page), path).toBe(1);
  }
});

test('the header holds one row at every stage boundary', async ({ page }) => {
  for (const { width } of STAGE_BOUNDARIES) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of ['/', '/archetypes/burning-abyss/']) {
      await page.goto(urlFor(path));
      expect(await rowCount(page), `${path} @ ${width}px`).toBe(1);
      // Above 44rem `.site-header` is `flex-wrap: nowrap`, so it *cannot*
      // report a second row — it overflows sideways instead, and the row
      // check alone would be vacuous in stages 1 and 2. Measure the overflow
      // too: before the stages existed this read up to 95px on inner pages.
      const overflowPx = await page.evaluate(() => {
        const header = document.querySelector('.site-header')!;
        return header.scrollWidth - header.clientWidth;
      });
      expect(overflowPx, `${path} @ ${width}px overflow`).toBeLessThanOrEqual(
        0,
      );
    }
  }
});

test('`Learn` renders inline in the header row above the `⋯` stage', async ({
  page,
}) => {
  // Stage 1 and stage 2 both keep the links inline; only stage 3 folds them
  // into the popover. This is the assertion T5 never had — it is why
  // `feedback.md` 8.2's shortened label existed only inside the popover.
  for (const width of [1024, 960, 896, 705]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(urlFor('/archetypes/burning-abyss/'));
    const learn = page.locator(
      '.utility-menu a[aria-label="Learn about Essentia"]',
    );
    await expect(learn, `@ ${width}px`).toBeVisible();
    await expect(learn.locator('.label-short'), `@ ${width}px`).toBeVisible();
    await expect(learn.locator('.label-full'), `@ ${width}px`).toBeHidden();
    await expect(page.locator('.utility-more'), `@ ${width}px`).toBeHidden();
    // Inline in the header row, not floating in a popover over it.
    const boxes = await page.evaluate(() => {
      const header = document
        .querySelector('.site-header')!
        .getBoundingClientRect();
      const link = document
        .querySelector('.utility-menu a[aria-label="Learn about Essentia"]')!
        .getBoundingClientRect();
      return { header, link };
    });
    expect(boxes.link.top, `@ ${width}px`).toBeGreaterThanOrEqual(
      boxes.header.top,
    );
    expect(boxes.link.bottom, `@ ${width}px`).toBeLessThanOrEqual(
      boxes.header.bottom,
    );
  }
});

test('Find keeps its reserved width in stage 1 and squares off in stage 2', async ({
  page,
}) => {
  const findBox = async (width: number) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(urlFor('/archetypes/burning-abyss/'));
    return (await page.locator('.search-trigger').boundingBox())!;
  };

  const wide = await findBox(960);
  expect(wide.width).toBeGreaterThan(wide.height * 3);
  await expect(page.locator('.search-trigger kbd')).toBeVisible();

  const square = await findBox(896);
  // "Square" to within the control's own vertical padding, which this ticket
  // does not touch: the reserved width is gone, so the box is the ⌕ glyph plus
  // `.search-trigger`'s padding, and it comes out ~40 × ~49. Measured
  // width−height on the built site: 9.39 chromium, 9.43 firefox, 9.42 webkit.
  // 12 is those plus slack. The structural assertion is the one below it —
  // 352px of reserved width is gone.
  expect(Math.abs(square.width - square.height)).toBeLessThanOrEqual(12);
  expect(square.width).toBeLessThan(wide.width / 4);
  await expect(page.locator('.search-trigger kbd')).toBeHidden();
  // …and the section links have not folded away yet. That ordering is the
  // whole point of 8.6.
  await expect(page.locator('.utility-more')).toBeHidden();
  await expect(
    page.locator('.utility-menu a[aria-label="Learn about Essentia"]'),
  ).toBeVisible();
});

test('no console error or wrap warning at 400px', async ({ page }) => {
  const messages: Array<{ type: string; text: string }> = [];
  page.on('console', (message) =>
    messages.push({ type: message.type(), text: message.text() }),
  );
  await page.setViewportSize({ width: 400, height: 800 });
  await page.goto(urlFor('/archetypes/burning-abyss/'));
  await page.waitForLoadState('load');
  // No filter. This assertion used to exempt every `style-src` CSP error as
  // "pre-existing, out of scope" — it was neither: Navigation.svelte's SSR
  // `style="--nav-tint: …"` attribute was introduced on this branch and was
  // the sole source of that noise. It is gone now (the tint is applied
  // through the CSSOM in onMount), so the built site raises no CSP error at
  // all. The exemption was also far wider than the thing it excused: its
  // predicate never mentioned `--nav-tint`, so it equally swallowed a
  // harden-csp.mjs hash mismatch on a real <style> block — the whole
  // stylesheet refused, the page rendering unstyled, this test still green.
  // This is the only console-error assertion in the e2e suite; it has to be
  // able to fail.
  expect(messages.filter((m) => m.type === 'error')).toEqual([]);
  expect(messages.filter((m) => /site-header wraps/.test(m.text))).toEqual([]);
});

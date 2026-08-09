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

test('the header holds one row at 400px', async ({ page }) => {
  await page.setViewportSize({ width: 400, height: 800 });
  for (const path of ['/', '/archetypes/burning-abyss/']) {
    await page.goto(urlFor(path));
    expect(await rowCount(page), path).toBe(1);
  }
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

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
  // Navigation.svelte's SSR `style="--nav-tint: …"` attribute is inert under
  // the hashed CSP (see its onMount comment) and every engine reports that
  // as a CSP violation console error; T4 already accepted this and reapplies
  // the tint via CSSOM instead. Pre-existing, out of scope for this ticket
  // (T2-T4, not touched here) — filtered so this test targets header-row
  // regressions specifically.
  // Chromium: "... Content Security Policy directive 'style-src ...'".
  // Firefox: "Refused to apply a stylesheet because its hash, its nonce, or
  // 'unsafe-inline' does not appear in the style-src directive ...".
  // WebKit: "Content-Security-Policy: ... blocked an inline style
  // (style-src-attr) ... Source: --nav-tint: ...".
  const isKnownCspNoise = (text: string) =>
    /style-src/i.test(text) &&
    /(content[ -]security[ -]policy|refused to apply)/i.test(text);
  const unexpectedErrors = messages.filter(
    (m) => m.type === 'error' && !isKnownCspNoise(m.text),
  );
  expect(unexpectedErrors).toEqual([]);
  expect(messages.filter((m) => /site-header wraps/.test(m.text))).toEqual([]);
});

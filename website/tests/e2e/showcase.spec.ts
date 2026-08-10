import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const basePath = process.env.E2E_BASE_PATH?.replace(/\/$/, '') ?? '';
const urlFor = (path: string) => `${basePath}${path}`;

// `index.astro` has two home branches: the `.empty-publication` hero when no
// section publishes, and the section-tile grid when at least one does. The
// sole release (LOTA-0001-Alpha_0.1) publishes three sections, so this build
// renders the grid — the empty-state heading this test used to require has
// not existed in `dist` since sections started publishing. Assert the branch
// the site actually ships; the language, brand and accessibility checks are
// branch-independent and stay.
test('published home is English and accessible', async ({ page }) => {
  await page.goto(urlFor('/'));
  await expect(page).toHaveTitle('Essentia — The Blackfoil Archive');
  await expect(page.locator('.compact-brand img')).toHaveAttribute(
    'alt',
    'Essentia',
  );
  await expect(page.locator('.brand')).toHaveCount(0);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('.empty-publication')).toHaveCount(0);
  expect(await page.locator('.section-tile').count()).toBeGreaterThan(0);
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

test('docs pages navigate from the catalog rail', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 900 });
  await page.goto(urlFor('/docs/'));

  const rail = page.getByRole('navigation', { name: 'Documentation and blog' });
  // `true`, not `page`: the switcher marks the active section, and the group
  // list below it marks the active page.
  await expect(
    rail.getByRole('link', { name: 'Docs', exact: true }),
  ).toHaveAttribute('aria-current', 'true');
  await expect(
    rail.getByRole('link', { name: 'Blog', exact: true }),
  ).toBeVisible();
  // The in-page rail is gone: the article owns the freed column.
  await expect(page.locator('.reading-rail')).toHaveCount(0);

  await rail.getByRole('link', { name: 'Zones', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`${urlFor('/docs/rules/zones/')}$`));
  await expect(
    page.getByRole('navigation', { name: 'Documentation and blog' }),
  ).toBeVisible();

  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test('blog pages swap the catalog for the blog list', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 900 });
  await page.goto(urlFor('/blog/'));

  const rail = page.getByRole('navigation', { name: 'Documentation and blog' });
  await expect(
    rail.getByRole('link', { name: 'Blog', exact: true }),
  ).toHaveAttribute('aria-current', 'true');
  // The card catalog is not rendered here — none of its sections appear.
  await expect(rail.getByRole('link', { name: /Nekroz/ })).toHaveCount(0);
  await expect(page.locator('.reading-rail')).toHaveCount(0);
});

test('catalog rail collapses to a strip that keeps its toggle', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1400, height: 900 });
  await page.goto(urlFor('/'));

  const collapse = page.getByRole('button', { name: 'Collapse catalog' });
  await expect(collapse).toHaveCount(1);
  await expect(collapse).toBeVisible();

  const rail = (await page.locator('.desktop-catalog').boundingBox())!;
  const box = (await collapse.boundingBox())!;
  expect(Math.abs(box.width - box.height)).toBeLessThanOrEqual(1);
  // 17px is structural and out of this ticket's scope: `.desktop-catalog`
  // has `padding: 1rem` (16px) + `border-right: 1px`, and the toggle sits
  // flush at that content edge. 20px is that plus slack; a toggle that is
  // not corner-anchored would be hundreds of px off on a ~272px rail.
  expect(rail.x + rail.width - (box.x + box.width)).toBeLessThanOrEqual(20);

  // Same `client:load` race the other rail tests guard against: a click
  // that lands before hydration is dropped with no actionability retry.
  await expect
    .poll(async () => {
      await collapse.click();
      return page.locator('html').getAttribute('data-catalog');
    })
    .toBe('collapsed');

  const expand = page.getByRole('button', { name: 'Expand catalog' });
  await expect(expand).toHaveCount(1);
  await expect(expand).toBeVisible();
  await expand.click();
  await expect(page.locator('html')).toHaveAttribute(
    'data-catalog',
    'expanded',
  );
});

test('back to top returns the visitor to the top', async ({ page }) => {
  await page.goto(urlFor('/docs/'));
  const control = page.getByRole('button', { name: 'Back to top' });
  await expect(control).toBeHidden();
  // Not `mouse.wheel`: at the default pointer position (0,0) the cursor sits
  // over `.desktop-catalog`, a `position: fixed`, `overflow-y: auto` rail that
  // is itself scrollable at 1280×720 — Chromium latches the wheel to that
  // innermost scroller and `window.scrollY` never leaves 0. Scroll the
  // document itself, and poll because `<BackToTop>` is a `client:load` island
  // that may not have hydrated when `goto` resolved.
  await expect
    .poll(async () => {
      await page.evaluate(() => window.scrollTo(0, 2000));
      return control.isVisible();
    })
    .toBe(true);
  await control.click();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test('header owns the top row and the rail docks beneath it', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1400, height: 900 });
  await page.goto(urlFor('/'));
  const header = (await page.locator('.site-header').boundingBox())!;
  const rail = (await page.locator('.desktop-catalog').boundingBox())!;
  const brand = (await page.locator('.compact-brand').boundingBox())!;
  expect(header.x).toBe(0);
  expect(header.width).toBe(1400);
  expect(rail.y).toBeGreaterThanOrEqual(header.y + header.height - 1);
  // 48px is the ceiling of the header's own `clamp(1rem, 3vw, 3rem)`
  // horizontal padding, so the brand sits at the header's content edge.
  // The pre-change layout put it at ~141px (an 8.8rem padding reservation
  // for the floating hamburger), so this still discriminates.
  expect(brand.x).toBeLessThanOrEqual(48);
});

test('the catalog rail lists every section flat', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 900 });
  await page.goto(urlFor('/'));
  const rail = page.getByRole('navigation', { name: 'Catalog' });
  // The catalog config (website/content/sections.json) lists five sections,
  // but a section only renders once it has a released card
  // (website/scripts/content/orchestrator.mjs registry.sections). This
  // checkout's sole release package (LOTA-0001-Alpha_0.1) doesn't yet carry
  // Shaddoll or Spellbook cards, so only these three publish today.
  for (const label of ['Non-archetype', 'Burning Abyss', 'Nekroz']) {
    await expect(
      rail.getByRole('link', { name: new RegExp(`^${label}`) }),
    ).toHaveCount(1);
  }
  // The only button left in the rail is the collapse square.
  await expect(rail.getByRole('button')).toHaveCount(1);
});

test('rail items carry their archetype colour', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 900 });
  await page.goto(urlFor('/'));
  const rail = page.getByRole('navigation', { name: 'Catalog' });
  const abyss = rail.getByRole('link', { name: /^Burning Abyss/ });
  const plain = rail.getByRole('link', { name: /^Non-archetype/ });
  const bg = (locator: typeof abyss) =>
    locator.evaluate((el) => getComputedStyle(el).backgroundColor);
  // `background` is authored as `color-mix(in oklch, …)` (Requirement 4), so
  // fully-transparent computed values serialize as `oklch(0 0 none / 0)` in
  // Chromium/Firefox/Webkit rather than `rgba(0, 0, 0, 0)` — same alpha-0
  // colour, different notation. Match on trailing zero alpha instead of the
  // legacy rgba literal.
  const isTransparent = (color: string) => /[,/]\s*0\)$/.test(color);

  // The tint exists only after Navigation.svelte's onMount CSSOM pass — the
  // hardened CSP blocks the SSR `style` attribute, so nothing is tinted until
  // the island hydrates. `page.goto` resolves on `load`, and the
  // `client:load` island's chunk is a dynamic import that can settle after
  // that, so poll rather than read once (same guard as the hover assertion).
  await expect.poll(async () => isTransparent(await bg(abyss))).toBe(false);
  expect(isTransparent(await bg(plain))).toBe(true);

  const abyssRest = await bg(abyss);
  await abyss.hover();
  await expect.poll(() => bg(abyss)).not.toBe(abyssRest);
});

test('header compacts to icons and a ⋯ menu at 400px', async ({ page }) => {
  await page.setViewportSize({ width: 400, height: 800 });
  await page.goto(urlFor('/'));

  // Scoped to the header nav: the homepage body also has "Learn about
  // Essentia" CTA links (index.astro, out of this ticket's scope) sharing
  // the same accessible name, which an unscoped role locator would match too.
  const menu = page.locator('.utility-menu');
  const docs = menu.getByRole('link', { name: 'Learn about Essentia' });
  await expect(docs).toBeHidden();
  await expect(menu).toBeHidden();

  await page.getByRole('button', { name: 'More sections' }).click();
  await expect(docs).toBeVisible();
  await expect(menu.getByRole('link', { name: 'Blog' })).toBeVisible();
  await expect(menu.getByRole('link', { name: 'Decks' })).toBeVisible();

  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test('the archetype hero drops its art on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto(urlFor('/archetypes/burning-abyss/'));
  await expect(page.locator('.catalog-hero-art')).toBeHidden();
  await expect(
    page.getByRole('heading', { name: 'Burning Abyss', level: 1 }),
  ).toBeVisible();
  await expect(page.locator('.gallery-card').first()).toBeVisible();
});

test('the archetype hero art goes with the single-column switch', async ({
  page,
}) => {
  // 900px is inside the 704–1024px band where the hero was already stacked —
  // title and description above the art — while the art was still shown.
  await page.setViewportSize({ width: 900, height: 900 });
  await page.goto(urlFor('/archetypes/burning-abyss/'));
  await expect(page.locator('.catalog-hero-art')).toBeHidden();
  await page.setViewportSize({ width: 1280, height: 900 });
  await expect(page.locator('.catalog-hero-art')).toBeVisible();
});

test('the archetype hero columns sit close on desktop', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 900 });
  await page.goto(urlFor('/archetypes/burning-abyss/'));
  const text = (await page
    .locator('.catalog-hero > div')
    .first()
    .boundingBox())!;
  const art = (await page.locator('.catalog-hero-art').boundingBox())!;
  expect(art.x - (text.x + text.width)).toBeLessThanOrEqual(56);
});

// The rendered `.catalog-hero` column widths and gutter at commit `main`,
// measured on the built site at `/archetypes/nekroz/` with the rail expanded.
// chromium, firefox and webkit agreed to under 0.01px. The feedback asked for
// the two columns to move closer together while keeping their current size, so
// these are a contract, not a snapshot: the columns must stay put and only the
// gutter may move.
const HERO_BASELINE = {
  1440: { text: 656, art: 393.6, gutter: 86.4 },
  1280: { text: 562, art: 337.2, gutter: 76.8 },
} as const;

for (const width of [1440, 1280] as const) {
  test(`the hero columns keep their pre-pass widths at ${width}`, async ({
    page,
  }) => {
    const baseline = HERO_BASELINE[width];
    await page.setViewportSize({ width, height: 900 });
    await page.goto(urlFor('/archetypes/nekroz/'));
    const text = (await page
      .locator('.catalog-hero > div')
      .first()
      .boundingBox())!;
    const art = (await page.locator('.catalog-hero-art').boundingBox())!;

    expect(Math.abs(text.width - baseline.text) / baseline.text).toBeLessThan(
      0.02,
    );
    expect(Math.abs(art.width - baseline.art) / baseline.art).toBeLessThan(
      0.02,
    );

    // …and the point of the change: the space between them is visibly smaller.
    // The gutter drops from `clamp(2rem, 6vw, 7rem)` to
    // `clamp(1.5rem, 2.5vw, 3rem)` — 86.4 → 36 at 1440, 76.8 → 32 at 1280 —
    // so anything at or above half the old gutter means the tracks ate the
    // difference again.
    const gutter = art.x - (text.x + text.width);
    expect(gutter).toBeLessThan(baseline.gutter / 2);
  });
}

import { test, expect } from '@playwright/test';

const basePath = process.env.E2E_BASE_PATH?.replace(/\/$/, '') ?? '';
const urlFor = (path: string) => `${basePath}${path}`;

/**
 * `burning-abyss-graff` prints nine keywords, all `preview: true`:
 * `Abyssal Curse`, `Activated`, `Descent`, `Hard`, `Linked`, `On Send Grave`,
 * `Static`, `Summon`, `Triggered` — in the order `card.keywords` stores them,
 * which is the order `previewKeywordsFor` returns and the order the Rules
 * block renders. ADR 0031: the card route prints rule text with no
 * `definitions` map, so it must carry no `(ruling)` reminder text; every
 * ruling instead lives in the Rules block below.
 */
const EXPECTED_TERMS = [
  'Abyssal Curse',
  'Activated',
  'Descent',
  'Hard',
  'Linked',
  'On Send Grave',
  'Static',
  'Summon',
  'Triggered',
];

test('rule text carries no reminder parentheses', async ({ page }) => {
  await page.goto(urlFor('/cards/burning-abyss-graff/'));
  const rulesText = page.locator('.rules-text');
  await expect(rulesText.locator('.reminder')).toHaveCount(0);
  const text = (await rulesText.innerText()).replace(/\s+/g, ' ').trim();
  expect(text).toBe(
    '(1 - Static) Abyssal Curse (2 - Activated Hard Linked) Descent (3 - Triggered Hard Linked) On Send Grave — Summon 1 “Burning Abyss” Creature except Burning Abyss - Graff from Deck.',
  );
});

test('the Rules block lists every previewed keyword', async ({ page }) => {
  await page.goto(urlFor('/cards/burning-abyss-graff/'));
  const terms = await page.locator('.keyword-rules dt').allTextContents();
  expect(terms).toEqual(EXPECTED_TERMS);
});

test('each ruling matches the hover island', async ({ page }) => {
  await page.goto(urlFor('/cards/burning-abyss-graff/'));
  const island = await page
    .locator('#keyword-rulings')
    .textContent({ timeout: 10_000 });
  const rulings = JSON.parse(island ?? '{}') as Record<string, string>;

  const dts = page.locator('.keyword-rules dt');
  const dds = page.locator('.keyword-rules dd');
  const count = await dts.count();
  expect(count).toBe(EXPECTED_TERMS.length);
  for (let i = 0; i < count; i++) {
    const term = await dts.nth(i).textContent();
    const definition = await dds.nth(i).textContent();
    expect(definition).toBe(rulings[term!.trim()]);
  }
});

test('the version route still shows reminders', async ({ page }) => {
  await page.goto(urlFor('/cards/burning-abyss-graff/'));
  const historyLink = page
    .locator('a[href*="/cards/burning-abyss-graff/versions/"]')
    .first();
  const href = await historyLink.getAttribute('href');
  expect(href).toBeTruthy();

  await page.goto(urlFor(href!));
  const count = await page.locator('.rules-text .reminder').count();
  expect(count).toBeGreaterThan(0);
});

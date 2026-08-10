import { test, expect } from '@playwright/test';

const basePath = process.env.E2E_BASE_PATH?.replace(/\/$/, '') ?? '';
const urlFor = (path: string) => `${basePath}${path}`;

/**
 * The eight authored ruling keywords reach the card preview through the same
 * path every other previewed keyword uses: registry file → card `keywords` →
 * `previewKeywordsFor()` → `data-card-keywords` → the `#keyword-rulings`
 * island → `.card-hover-preview .keyword-rulings`.
 *
 * What is new is *where* the invocation is printed. `Static` and its siblings
 * ride in the numbered italic ability prefix and `Trap` in the super type
 * line, never in bold — so the hover box is the only place a reader ever sees
 * them explained. Assert that against the built site, not the source.
 */
const RULINGS = {
  Static:
    'Passive ability. Does not use the Stack. Active as soon as the card enters the required zone to take effect. Default zone is Field.',
  Trap: 'Cannot be cast from Hand. Can only be Set face down.',
} as const;

test('the ruling island publishes all eight authored keywords', async ({
  page,
}) => {
  await page.goto(urlFor('/archetypes/burning-abyss/'));
  const island = await page
    .locator('#keyword-rulings')
    .textContent({ timeout: 10_000 });
  const rulings = JSON.parse(island ?? '{}') as Record<string, string>;
  for (const term of [
    'Resolution',
    'Static',
    'Triggered',
    'Activated',
    'Soft',
    'Hard',
    'Linked',
    'Trap',
  ])
    expect(
      rulings[term],
      `${term} is missing from the ruling island`,
    ).toBeTruthy();
  expect(rulings.Static).toBe(RULINGS.Static);
  expect(rulings.Trap).toBe(RULINGS.Trap);
});

test('hovering a card that prints Static shows the Static ruling', async ({
  page,
}) => {
  await page.goto(urlFor('/archetypes/burning-abyss/'));
  const card = page.locator('a.gallery-card[data-card-keywords*="Static"]');
  await expect(card.first()).toBeVisible();
  await card.first().hover();

  const preview = page.locator('.card-hover-preview');
  await expect(preview).toHaveClass(/is-visible/);
  const ruling = preview.locator('.keyword-ruling', { hasText: 'Static' });
  await expect(ruling.first()).toContainText(RULINGS.Static);
});

test('hovering a Trap card shows the Trap super-type ruling', async ({
  page,
}) => {
  await page.goto(urlFor('/archetypes/burning-abyss/'));
  const card = page.locator('a.gallery-card[data-card-keywords*="Trap"]');
  await expect(card.first()).toBeVisible();
  await card.first().hover();

  const preview = page.locator('.card-hover-preview');
  await expect(preview).toHaveClass(/is-visible/);
  const ruling = preview.locator('.keyword-ruling', { hasText: 'Trap' });
  await expect(ruling.first()).toContainText(RULINGS.Trap);
});

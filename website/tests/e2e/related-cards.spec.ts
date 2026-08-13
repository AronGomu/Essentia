import { test, expect } from '@playwright/test';
import { catalog } from '../../src/lib/catalog';

const basePath = process.env.E2E_BASE_PATH?.replace(/\/$/, '') ?? '';
const urlFor = (path: string) => `${basePath}${path}`;
const RELATED_CAP = 12;

const truncatedArchetypeCard = catalog.cards.find(
  (card) => card.related.archetype.length > RELATED_CAP,
);
const noReferencesCard = catalog.cards.find(
  (card) => card.related.references.length === 0,
);

test('archetype category renders a linked thumbnail card gallery', async ({
  page,
}) => {
  const card = catalog.cards.find(
    (candidate) => candidate.related.archetype.length,
  );
  expect(card).toBeDefined();
  await page.goto(urlFor(`/cards/${card!.id}/`));
  const section = page.locator('section:has(#related-archetype)');
  await expect(section.locator('#related-archetype')).toBeVisible();
  const cards = section.locator('a.gallery-card[href*="/cards/"]:has(img)');
  expect(await cards.count()).toBeGreaterThan(0);
  await expect(cards.first()).toBeVisible();
});

test('archetype category shows at most 12 cards', async ({ page }) => {
  await page.goto(urlFor('/cards/burning-abyss-graff/'));
  const archetypeCount = await page
    .locator('section:has(#related-archetype) .gallery-card')
    .count();
  expect(archetypeCount).toBeLessThanOrEqual(RELATED_CAP);
});

test('truncated archetype category links to its section', async ({ page }) => {
  test.skip(
    !truncatedArchetypeCard,
    'no card has more than 12 archetype relations',
  );
  const card = truncatedArchetypeCard!;
  const section = catalog.sections.find(
    (candidate) => candidate.slug === card.sectionSlug,
  )!;
  await page.goto(urlFor(`/cards/${card.id}/`));
  const link = page.locator('section:has(#related-archetype) .related-more a');
  await expect(link).toBeVisible();
  const href = await link.getAttribute('href');
  expect(href).toMatch(new RegExp(`${section.route.replace(/\/$/, '')}/?$`));
});

test('a card with no references renders no references section', async ({
  page,
}) => {
  expect(noReferencesCard).toBeDefined();
  await page.goto(urlFor(`/cards/${noReferencesCard!.id}/`));
  await expect(page.locator('#related-references')).toHaveCount(0);
});

test('related archetype gallery carries no New badge', async ({ page }) => {
  await page.goto(urlFor('/cards/burning-abyss-graff/'));
  await expect(
    page.locator('section:has(#related-archetype) .tile-badge'),
  ).toHaveCount(0);
});

import { test, expect } from '@playwright/test';
import { catalog } from '../../src/lib/catalog';

const basePath = process.env.E2E_BASE_PATH?.replace(/\/$/, '') ?? '';
const urlFor = (path: string) => `${basePath}${path}`;
const RELATED_CAP = 12;

const truncatedArchetypeCard = catalog.cards.find(
  (card) => card.related.archetype.length > RELATED_CAP,
);
const truncatedInteractionCard = catalog.cards.find(
  (card) => card.related.interaction.length > RELATED_CAP,
);
const noRelationsCard = catalog.cards.find(
  (card) =>
    card.related.archetype.length === 0 &&
    card.related.interaction.length === 0,
);
// The two lists are disjoint, so a card that still fills both is the only one
// whose page renders both sections at once.
const bothCategoriesCard = catalog.cards.find(
  (card) =>
    card.related.archetype.length > 0 && card.related.interaction.length > 0,
);

test('both categories render linked thumbnail card galleries', async ({
  page,
}) => {
  test.skip(!bothCategoriesCard, 'no card fills both related lists');
  await page.goto(urlFor(`/cards/${bothCategoriesCard!.id}/`));
  for (const heading of ['related-archetype', 'related-interaction']) {
    const section = page.locator(`section:has(#${heading})`);
    await expect(section.locator(`#${heading}`)).toBeVisible();
    const cards = section.locator('a.gallery-card[href*="/cards/"]:has(img)');
    expect(await cards.count()).toBeGreaterThan(0);
    await expect(cards.first()).toBeVisible();
  }
});

test('each category shows at most 12 cards', async ({ page }) => {
  await page.goto(urlFor('/cards/burning-abyss-graff/'));
  const archetypeCount = await page
    .locator('section:has(#related-archetype) .gallery-card')
    .count();
  const interactionCount = await page
    .locator('section:has(#related-interaction) .gallery-card')
    .count();
  expect(archetypeCount).toBeLessThanOrEqual(RELATED_CAP);
  expect(interactionCount).toBeLessThanOrEqual(RELATED_CAP);
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

test('truncated interaction category shows a count, not a link', async ({
  page,
}) => {
  test.skip(
    !truncatedInteractionCard,
    'no card has more than 12 interaction relations',
  );
  const card = truncatedInteractionCard!;
  await page.goto(urlFor(`/cards/${card.id}/`));
  const more = page.locator('section:has(#related-interaction) .related-more');
  await expect(more).toBeVisible();
  await expect(more.locator('a')).toHaveCount(0);
  const text = (await more.textContent())?.trim();
  expect(text).toMatch(/^\d+ more$/);
});

test('a card with no relations renders no related section', async ({
  page,
}) => {
  test.skip(!noRelationsCard, 'every card currently has at least one relation');
  await page.goto(urlFor(`/cards/${noRelationsCard!.id}/`));
  await expect(page.locator('#related-archetype')).toHaveCount(0);
});

test('related galleries carry no New badge', async ({ page }) => {
  test.skip(!bothCategoriesCard, 'no card fills both related lists');
  for (const id of ['burning-abyss-graff', bothCategoriesCard!.id]) {
    await page.goto(urlFor(`/cards/${id}/`));
    await expect(
      page.locator('section:has(#related-archetype) .tile-badge'),
    ).toHaveCount(0);
    await expect(
      page.locator('section:has(#related-interaction) .tile-badge'),
    ).toHaveCount(0);
  }
});

import catalogData from '../generated/catalog';

export type ColorLetter = 'W' | 'U' | 'B' | 'R' | 'G';
export type CardZone = 'main' | 'extra';
export type ArchetypeRole = 'member' | 'support' | 'staple';

export interface ImageTier {
  avif?: string;
  webp: string;
  width: number;
}

export interface PrintImage {
  url: string;
  width: number;
  height: number;
  dpi: number;
  /** True while the package has no renders_print/ master and the tier is upscaled. */
  draftResolution: boolean;
}

export interface CardImages {
  thumb: ImageTier;
  display: ImageTier;
  print: PrintImage;
  width: number;
  height: number;
}

export interface CatalogKeyword {
  id: string;
  term: string;
  category: 'action' | 'event' | 'ability' | 'cost-procedure' | 'archetype';
  archetype: string | null;
  /** One-sentence ruling, plain text, 20-400 characters. */
  definition: string;
  /** `magic` for an unchanged Magic evergreen, `essentia` for a project term. */
  origin: 'magic' | 'essentia';
  /** Repo-relative path to the module of record for this ruling. */
  doc: string;
  /** Show this ruling in the gallery hover box. */
  preview: boolean;
  /** Append this ruling as (reminder) text after the bold phrase in card rule text. */
  reminder: boolean;
}

export interface CardVersion {
  id: string;
  packageId: string;
  sectionSlug: string;
  sectionLabel: string;
  sectionAccent: string;
  sectionRoute: string;
  manifestIndex: number;
  name: string;
  castingCost: string;
  superType: string;
  subType: string;
  rarity: string;
  ruleText: string;
  ruleTextPlain: string;
  flavorText: string;
  flavorTextPlain: string;
  power: string | null;
  toughness: string | null;
  collectionNumber: string;
  created: string | null;
  modified: string;
  support: boolean;
  colors: ColorLetter[];
  colorSource: 'cost' | 'override';
  manaValue: number;
  typeLine: string;
  types: string[];
  supertypes: string[];
  zone: CardZone;
  keywords: string[];
  archetype: string | null;
  archetypeRole: ArchetypeRole;
  supports: string[];
  oracleNormalized: string;
  images: CardImages;
  sourceHash: string;
  renderHash: string;
  width: number;
  height: number;
  releasedOn: string;
  stage: 'alpha' | 'beta' | 'release';
  stageLabel: 'ALPHA' | 'BETA' | 'Release';
  stageRank: number;
  version: string;
  versionRoute: string;
  releaseRoute: string;
}

export interface CatalogCard extends CardVersion {
  matchNames: string[];
  formerFilenames: string[];
  routeAliases: string[];
  retired: boolean;
  route: string;
  versionIds: string[];
}

export type GalleryCard = Pick<
  CatalogCard,
  | 'id'
  | 'name'
  | 'route'
  | 'superType'
  | 'subType'
  | 'rarity'
  | 'ruleTextPlain'
  | 'modified'
  | 'support'
  | 'images'
  | 'width'
  | 'height'
  | 'packageId'
  | 'releasedOn'
  | 'keywords'
>;

export interface CatalogSection {
  slug: string;
  label: string;
  kind: 'non-archetype' | 'archetype';
  accent: string;
  namePattern: string | null;
  /** Authored hero prose, markdown, from website/content/section-intros/{slug}.md. */
  introMarkdown: string;
  intro: string;
  diagnostics: Array<{ sourceFile: string; reason: string }>;
  iconicId: string;
  route: string;
  count: number;
  latestModified: string;
  image: string;
  heroImage: string;
  cardIds: string[];
}

export interface ReleasePackage {
  id: string;
  setId: string;
  setName: string;
  version: string;
  stage: 'alpha' | 'beta' | 'release';
  stageLabel: 'ALPHA' | 'BETA' | 'Release';
  stageRank: number;
  releasedOn: string;
  route: string;
  decks: Array<{ id: string; cards: string[] }>;
  contentPosts: string[];
  cardIds: string[];
  sectionSlugs: string[];
  count: number;
}

export interface CatalogDoc {
  id: string;
  path: string;
  route: string;
  title: string;
  group: string;
  groupLabel: string;
  order: number;
  /** Full Markdown body after link rewriting, with the `# Title` line removed. */
  body: string;
  headings: Array<{ id: string; text: string; level: number }>;
}

export interface CatalogPost {
  slug: string;
  route: string;
  title: string;
  date: string;
  author: string;
  summary: string;
  tags: string[];
  body: string;
}

export interface Catalog {
  schemaVersion: 10;
  generatedAt: string;
  heroSectionSlug: string;
  sections: CatalogSection[];
  cards: CatalogCard[];
  cardVersions: CardVersion[];
  releases: ReleasePackage[];
  keywords: CatalogKeyword[];
  explanations: Record<string, string>;
  updates: Array<{
    cardId: string;
    sectionSlug: string;
    status: 'new' | 'updated';
    modified: string;
    summary: string;
    packageId: string;
    versionRoute: string;
  }>;
  docs: CatalogDoc[];
  posts: CatalogPost[];
  /** Blog sections, in reading-order.json order; every slug resolves to a post. */
  postGroups: ReadonlyArray<{
    key: string;
    label: string;
    slugs: readonly string[];
  }>;
  publicationDiagnostics: Array<{
    sectionSlug: string;
    sourceFile: string;
    reason: string;
  }>;
}

export const catalog = catalogData as unknown as Catalog;
export const cardsById = new Map(catalog.cards.map((card) => [card.id, card]));
export const cardVersionsByKey = new Map(
  catalog.cardVersions.map((card) => [`${card.id}:${card.packageId}`, card]),
);
export const releasesById = new Map(
  catalog.releases.map((release) => [release.id, release]),
);
export const sectionsBySlug = new Map(
  catalog.sections.map((section) => [section.slug, section]),
);

/**
 * Newest published package, or null on a draft-only build. `catalog.releases`
 * is sorted by stage rank, and the content build asserts that stage order and
 * release date agree (`stageDateIssues` — a stage has one date, shared by every
 * package in it), so the most advanced stage is also the most recent release.
 */
export const latestRelease: ReleasePackage | null = catalog.releases[0] ?? null;

/** True when this card's current version was published by the newest package. */
export function isLatestRelease(card: { packageId: string }): boolean {
  return latestRelease !== null && card.packageId === latestRelease.id;
}

/** True when any card currently in this section came from the newest release package. */
export function sectionHasNewCards(section: { cardIds: string[] }): boolean {
  return section.cardIds.some((id) => {
    const card = cardsById.get(id);
    return card ? isLatestRelease(card) : false;
  });
}

export function withBase(base: string, route: string): string {
  return `${base.replace(/\/$/, '')}/${route.replace(/^\//, '')}`;
}

export function toGalleryCard(card: CatalogCard): GalleryCard {
  const {
    id,
    name,
    route,
    superType,
    subType,
    rarity,
    ruleTextPlain,
    modified,
    support,
    images,
    width,
    height,
    packageId,
    releasedOn,
    keywords,
  } = card;
  return {
    id,
    name,
    route,
    superType,
    subType,
    rarity,
    ruleTextPlain,
    modified,
    support,
    images,
    width,
    height,
    packageId,
    releasedOn,
    keywords,
  };
}

export const keywordsByTerm = new Map(
  catalog.keywords.map((keyword) => [keyword.term, keyword]),
);

/** Only the terms the hover box previews — the ones worth a hover explainer. */
export const previewKeywordsByTerm = new Map(
  catalog.keywords
    .filter((keyword) => keyword.preview)
    .map((keyword) => [keyword.term, keyword]),
);

/** The card's keywords that the hover box previews, in printed order, each with its ruling. */
export function previewKeywordsFor(card: {
  keywords: string[];
}): Array<{ term: string; definition: string }> {
  return card.keywords
    .map((term) => previewKeywordsByTerm.get(term))
    .filter((keyword): keyword is CatalogKeyword => keyword !== undefined)
    .map((keyword) => ({ term: keyword.term, definition: keyword.definition }));
}

/** Terms whose ruling is printed as (reminder) text inside card rule text. */
export function reminderDefinitions(): Map<string, string> {
  return new Map(
    catalog.keywords
      .filter((keyword) => keyword.reminder)
      .map((keyword) => [keyword.term, keyword.definition]),
  );
}

/**
 * Terms the gallery hover box previews. Published into every page's
 * `#keyword-rulings` island, so the set must match the `preview` flag exactly:
 * a wider filter ships rulings nobody asked for, a narrower one leaves gallery
 * links advertising `data-card-keywords` the hover box cannot resolve.
 */
export function previewDefinitions(): Map<string, string> {
  return new Map(
    catalog.keywords
      .filter((keyword) => keyword.preview)
      .map((keyword) => [keyword.term, keyword.definition]),
  );
}

export interface RelatedInput {
  id: string;
  name: string;
  archetype: string | null;
  keywords: string[];
}

/** Cards sharing this card's archetype, or one of that archetype's keywords. Max 24, name-sorted. */
export function relatedCards<T extends RelatedInput>(
  card: RelatedInput,
  cards: readonly T[],
  keywords: ReadonlyArray<{ term: string; archetype: string | null }>,
): T[] {
  const archetypeByTerm = new Map(
    keywords.map((keyword) => [keyword.term, keyword.archetype]),
  );
  const cardArchetypeKeywordTerms = new Set(
    card.keywords.filter((term) => archetypeByTerm.get(term) != null),
  );
  return cards
    .filter((candidate) => candidate.id !== card.id)
    .filter((candidate) => {
      if (card.archetype !== null) {
        if (candidate.archetype === card.archetype) return true;
        return candidate.keywords.some(
          (term) => archetypeByTerm.get(term) === card.archetype,
        );
      }
      return candidate.keywords.some((term) =>
        cardArchetypeKeywordTerms.has(term),
      );
    })
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, 24);
}

/** The image a hover preview or social card should point at. */
export function previewImage(card: { images: CardImages }): string {
  return card.images.display.webp;
}

export function formatDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) throw new Error(`Invalid local date: ${value}`);
  return new Intl.DateTimeFormat('en', { dateStyle: 'long' }).format(
    new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])),
  );
}

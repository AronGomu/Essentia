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
  zoom: ImageTier;
  print: PrintImage;
  width: number;
  height: number;
}

export interface CatalogKeyword {
  id: string;
  term: string;
  category: 'action' | 'event' | 'ability' | 'cost-procedure' | 'archetype';
  archetype: string | null;
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
>;

export interface CatalogSection {
  slug: string;
  label: string;
  kind: 'non-archetype' | 'archetype';
  accent: string;
  namePattern: string | null;
  intro: string;
  diagnostics: Array<{ sourceFile: string; reason: string }>;
  iconicId: string;
  route: string;
  count: number;
  latestModified: string;
  image: string;
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
  schemaVersion: 6;
  generatedAt: string;
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
  };
}

export const keywordsByTerm = new Map(
  catalog.keywords.map((keyword) => [keyword.term, keyword]),
);

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

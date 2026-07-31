import catalogData from '../generated/catalog';

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
  sourceHash: string;
  renderHash: string;
  width: number;
  height: number;
  render: string;
  galleryWebp: string;
  galleryAvif: string;
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
  | 'render'
  | 'galleryWebp'
  | 'galleryAvif'
  | 'width'
  | 'height'
>;

export interface CatalogSection {
  slug: string;
  label: string;
  kind: 'non-archetype' | 'archetype';
  accent: string;
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

export interface Catalog {
  schemaVersion: 3;
  generatedAt: string;
  sections: CatalogSection[];
  cards: CatalogCard[];
  cardVersions: CardVersion[];
  releases: ReleasePackage[];
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
    render,
    galleryWebp,
    galleryAvif,
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
    render,
    galleryWebp,
    galleryAvif,
    width,
    height,
  };
}

export function formatDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) throw new Error(`Invalid local date: ${value}`);
  return new Intl.DateTimeFormat('en', { dateStyle: 'long' }).format(
    new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])),
  );
}

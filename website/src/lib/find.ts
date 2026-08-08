/**
 * The global Find index.
 *
 * One palette searches four kinds of thing: cards, docs, blog posts and decks.
 * Decks come from two places, and the split between them is a privacy
 * boundary, not a convenience:
 *
 * - **published** decks ship inside a release package, so they are indexed at
 *   build time and are the same for every visitor;
 * - **browser-local** decks live only in the visitor's own `localStorage`, so
 *   they are indexed at runtime, in that browser, and merged into the palette
 *   after mount.
 *
 * `buildFindEntries` is the build-time half and can therefore never emit a
 * `source: 'local'` entry — a local deck reaching a built file would publish a
 * visitor's private data. `localDeckEntries` is the runtime half and is the
 * only producer of local entries. A unit row asserts the first half, and the
 * `check-chrome` build gate fails the build if the string `deck:local:` ever
 * appears in a built page.
 */
import { cardNameScore, normalizeCardName } from './search';

export type FindKind = 'card' | 'doc' | 'post' | 'deck';

/** Display order of the groups, and the order `findGroups` returns them in. */
export const FIND_KINDS: readonly FindKind[] = ['card', 'doc', 'post', 'deck'];

export const FIND_KIND_LABEL: Record<FindKind, string> = {
  card: 'Cards',
  doc: 'Docs',
  post: 'Blog',
  deck: 'Decks',
};

export interface FindEntry {
  /** unique across kinds and sources: `${kind}:${source}:${id}` */
  key: string;
  kind: FindKind;
  /** only meaningful for `kind: 'deck'`; 'catalog' for every other kind */
  source: 'catalog' | 'local';
  /** primary label shown in the row */
  title: string;
  /** secondary label shown right-aligned in the row */
  detail: string;
  /** catalog route, e.g. `/cards/nekroz-brionac/` or `/releases/alpha/x/#deck-y` */
  route: string;
  /** every string the entry may be matched on */
  matchNames: string[];
  /** stable tiebreaker inside a kind */
  order: number;
}

export interface FindCatalogInput {
  cards: ReadonlyArray<{
    id: string;
    name: string;
    matchNames: string[];
    route: string;
    sectionLabel: string;
    manifestIndex: number;
  }>;
  docs: ReadonlyArray<{
    id: string;
    title: string;
    route: string;
    groupLabel: string;
  }>;
  posts: ReadonlyArray<{
    slug: string;
    title: string;
    route: string;
    date: string;
  }>;
  releases: ReadonlyArray<{
    id: string;
    setName: string;
    version: string;
    route: string;
    decks: ReadonlyArray<{ id: string; cards: string[] }>;
  }>;
}

/**
 * Published decks sort after local ones inside the deck group. The offset does
 * that with no special case in the comparator: local orders start at 0, and
 * no release ships a thousand decks.
 */
const PUBLISHED_DECK_ORDER_OFFSET = 1000;

/** Inside a selected kind the cap is lifted, but the list is still bounded. */
const SELECTED_KIND_LIMIT = 24;

/** `burning-abyss` → `Burning Abyss`. */
function deckTitle(id: string): string {
  return id
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/** Build-time index. NEVER emits `source: 'local'` — local decks are private. */
export function buildFindEntries(input: FindCatalogInput): FindEntry[] {
  const entries: FindEntry[] = [];

  for (const card of input.cards) {
    entries.push({
      key: `card:catalog:${card.id}`,
      kind: 'card',
      source: 'catalog',
      title: card.name,
      detail: card.sectionLabel,
      route: card.route,
      matchNames: card.matchNames,
      order: card.manifestIndex,
    });
  }

  input.docs.forEach((doc, index) => {
    entries.push({
      key: `doc:catalog:${doc.id}`,
      kind: 'doc',
      source: 'catalog',
      title: doc.title,
      detail: doc.groupLabel,
      route: doc.route,
      matchNames: [doc.title],
      order: index,
    });
  });

  input.posts.forEach((post, index) => {
    entries.push({
      key: `post:catalog:${post.slug}`,
      kind: 'post',
      source: 'catalog',
      title: post.title,
      detail: post.date,
      route: post.route,
      matchNames: [post.title],
      order: index,
    });
  });

  // One running index across every (release, deck) pair, so the offset stays a
  // single contiguous run no matter how the decks are spread over releases.
  let deckIndex = 0;
  for (const release of input.releases) {
    for (const deck of release.decks) {
      const title = deckTitle(deck.id);
      entries.push({
        key: `deck:catalog:${release.id}:${deck.id}`,
        kind: 'deck',
        source: 'catalog',
        title,
        detail: `${release.setName} ${release.version}`,
        route: `${release.route}#deck-${deck.id}`,
        matchNames: [title, deck.id],
        order: PUBLISHED_DECK_ORDER_OFFSET + deckIndex,
      });
      deckIndex += 1;
    }
  }

  return entries;
}

/**
 * Runtime-only index of the visitor's own decks, merged after mount. Nothing
 * in the build calls this: it exists so the palette can show decks that only
 * this browser knows about.
 */
export function localDeckEntries(
  decks: ReadonlyArray<{ id: string; name: string; updated: string }>,
): FindEntry[] {
  return [...decks]
    .sort(
      (a, b) =>
        b.updated.localeCompare(a.updated) || a.name.localeCompare(b.name),
    )
    .map((deck, index) => ({
      key: `deck:local:${deck.id}`,
      kind: 'deck' as const,
      source: 'local' as const,
      title: deck.name,
      detail: 'Saved in this browser',
      route: `/decks/#deck-${deck.id}`,
      matchNames: [deck.name],
      order: index,
    }));
}

export interface FindGroup {
  kind: FindKind;
  label: string;
  entries: FindEntry[];
}

/**
 * Groups the index for one query. An empty query scores everything 0, so the
 * palette opens as a browsable index rather than an empty box.
 */
export function findGroups(
  entries: readonly FindEntry[],
  query: string,
  kind: FindKind | null,
  perKind: number,
): FindGroup[] {
  const needle = normalizeCardName(query);
  const scored = new Map<string, number>();
  for (const entry of entries) {
    const score = Math.min(
      ...entry.matchNames.map((name) => cardNameScore(name, needle)),
    );
    if (Number.isFinite(score)) scored.set(entry.key, score);
  }

  const kinds = kind === null ? FIND_KINDS : [kind];
  const limit = kind === null ? perKind : SELECTED_KIND_LIMIT;

  return kinds
    .map((value) => ({
      kind: value,
      label: FIND_KIND_LABEL[value],
      entries: entries
        .filter((entry) => entry.kind === value && scored.has(entry.key))
        .sort(
          (a, b) =>
            (scored.get(a.key) ?? 0) - (scored.get(b.key) ?? 0) ||
            a.order - b.order ||
            a.key.localeCompare(b.key),
        )
        .slice(0, limit),
    }))
    .filter((group) => group.entries.length > 0);
}

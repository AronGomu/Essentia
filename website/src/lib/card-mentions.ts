/**
 * Bridge between authored prose and the gallery hover preview.
 *
 * A card mention in Markdown carries no card data — only a name an author
 * typed. This module turns that name into the exact attribute set a gallery
 * tile publishes (`href`, `data-card-preview`, `data-card-keywords`), so one
 * hover overlay serves grids and prose alike. It stays free of any catalog
 * import: the caller passes the cards, which keeps the lookup rules unit
 * testable without loading the generated catalog.
 */

/** The catalog fields a mention needs. `GalleryCard` satisfies this shape. */
export interface MentionSource {
  name: string;
  matchNames: string[];
  route: string;
  /** Display render URL, catalog-relative, as `previewImage()` returns it. */
  previewImage: string;
  /** Terms the hover box can explain — already filtered to previewed ones. */
  previewKeywords: string[];
}

export interface CardMention {
  /** Printed card name, used when the author writes no display text. */
  name: string;
  href: string;
  preview: string;
  keywords: string[];
}

export interface CardMentionIndex {
  byKey: Map<string, CardMention>;
  /** Keys two or more cards claim; resolving one is an authoring error. */
  ambiguous: Set<string>;
}

/**
 * Basic lands appear in every decklist and are in no card package, so a
 * decklist line naming one is linked to nothing rather than failing the build.
 */
export const BASIC_LANDS = new Set([
  'plains',
  'island',
  'swamp',
  'mountain',
  'forest',
  'wastes',
]);

/**
 * Names are authored by hand in prose, so they arrive with whatever quote,
 * dash and case the keyboard produced. `Maxx "C"` must find `Maxx “C”` and
 * `nekroz — trishula` must find `Nekroz - Trishula`.
 */
export function mentionKey(value: string): string {
  return value
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—‑]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/**
 * `Burning Abyss - Graff` → `Graff`. Archetype cards are printed
 * `Archetype - Title` and spoken by title alone, which is what a decklist or a
 * sentence carries. Non-archetype names yield nothing.
 */
function titleAlias(name: string): string | null {
  const index = name.indexOf(' - ');
  if (index === -1) return null;
  const title = name.slice(index + 3).trim();
  return title === '' ? null : title;
}

/** `withBase` without the catalog import this module deliberately avoids. */
function join(base: string, route: string): string {
  return `${base.replace(/\/$/, '')}/${route.replace(/^\//, '')}`;
}

/**
 * Primary keys — printed name, every historical name, both under the card's
 * own route — are registered first and never yield to an alias. Aliases (the
 * archetype title) only fill keys no primary claimed, so renaming a card can
 * never redirect a mention of a different card that still prints that name.
 */
export function buildCardMentionIndex(
  cards: MentionSource[],
  base = '/',
): CardMentionIndex {
  const byKey = new Map<string, CardMention>();
  const ambiguous = new Set<string>();

  const mentionFor = (card: MentionSource): CardMention => ({
    name: card.name,
    href: join(base, card.route),
    preview: join(base, card.previewImage),
    keywords: card.previewKeywords,
  });

  const register = (key: string, card: MentionSource) => {
    const existing = byKey.get(key);
    if (existing && existing.href !== join(base, card.route)) {
      ambiguous.add(key);
      return;
    }
    byKey.set(key, mentionFor(card));
  };

  for (const card of cards)
    for (const name of new Set([card.name, ...card.matchNames]))
      register(mentionKey(name), card);

  const primary = new Set(byKey.keys());
  const aliasOwners = new Map<string, MentionSource>();
  for (const card of cards) {
    for (const name of new Set([card.name, ...card.matchNames])) {
      const alias = titleAlias(name);
      if (alias === null) continue;
      const key = mentionKey(alias);
      if (primary.has(key)) continue;
      const owner = aliasOwners.get(key);
      if (owner && owner.route !== card.route) {
        ambiguous.add(key);
        byKey.delete(key);
        continue;
      }
      if (ambiguous.has(key)) continue;
      aliasOwners.set(key, card);
      byKey.set(key, mentionFor(card));
    }
  }

  return { byKey, ambiguous };
}

/**
 * Throws rather than degrading to plain text: an unresolved mention is a typo
 * or a retired name, and both are worth failing the content build over. A
 * mention that silently loses its link is invisible in review.
 */
export function lookupCardMention(
  index: CardMentionIndex,
  name: string,
): CardMention {
  const key = mentionKey(name);
  if (index.ambiguous.has(key))
    throw new Error(
      `Ambiguous card mention: ${name} — write the full printed name`,
    );
  const mention = index.byKey.get(key);
  if (!mention) throw new Error(`Unknown card mention: ${name}`);
  return mention;
}

/** Null instead of throwing, for decklist lines that may name a basic land. */
export function findCardMention(
  index: CardMentionIndex,
  name: string,
): CardMention | null {
  const key = mentionKey(name);
  if (index.ambiguous.has(key)) return null;
  return index.byKey.get(key) ?? null;
}

/**
 * Card picking for the deck editor's add-card box.
 *
 * Split out of `DeckManager.svelte` so the ranking is a pure function with its
 * own test: the component only renders what this returns. Ranking mirrors the
 * global search palette — best score wins, ties fall back to manifest order so
 * the list is stable between renders.
 */
import { cardNameScore } from './search';

export interface PickerCard {
  id: string;
  name: string;
  matchNames: string[];
  route: string;
  zone: 'main' | 'extra';
  sectionLabel: string;
  manifestIndex: number;
}

/**
 * `base` joined to `route` with exactly one slash between them — the same join
 * `withBase` performs in `./catalog`, duplicated here because importing that
 * module pulls the whole generated catalog into the deck island's bundle and
 * blows the 350 KiB JS budget. `SearchPalette.svelte` inlines it for the same
 * reason.
 */
export function cardHref(base: string, route: string): string {
  return `${base.replace(/\/$/, '')}/${route.replace(/^\//, '')}`;
}

/** Filter + rank the catalog for the deck editor's add-card box. Empty query → first `limit` by manifest order. */
export function pickCards(
  cards: PickerCard[],
  query: string,
  limit = 12,
): PickerCard[] {
  return cards
    .map((card) => ({
      card,
      // An empty query scores every match name 0, so the sort below degrades
      // to plain manifest order without a second code path.
      score: Math.min(
        ...card.matchNames.map((name) => cardNameScore(name, query)),
      ),
    }))
    .filter((item) => Number.isFinite(item.score))
    .sort(
      (a, b) =>
        a.score - b.score ||
        a.card.manifestIndex - b.card.manifestIndex ||
        a.card.id.localeCompare(b.card.id),
    )
    .slice(0, limit)
    .map((item) => item.card);
}

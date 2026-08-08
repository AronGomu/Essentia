/**
 * Text helpers shared by the `<meta name="description">` builders.
 *
 * Every page description is a fixed-length excerpt, so every page needs the
 * same cut. Keeping the cut in one place is what stops `/docs/` and `/cards/`
 * from drifting apart — a plain `slice()` lands mid-word and leaves the reader
 * (and the search-result snippet) staring at `…Exile 0–3 “Burning Abys`.
 */

/**
 * Cuts `text` to at most `limit` characters, falling back to the last word
 * boundary inside the limit and marking the cut with an ellipsis.
 *
 * Text that already fits is returned untouched — no ellipsis — so a short body
 * never looks truncated. A single word longer than the limit has no boundary to
 * fall back to and is cut hard, which is the only case where a word is split.
 */
export function truncateAtWordBoundary(text: string, limit: number): string {
  if (text.length <= limit) return text;
  const cut = text.slice(0, limit);
  const boundary = cut.lastIndexOf(' ');
  return `${(boundary > 0 ? cut.slice(0, boundary) : cut).replace(/[\s.,;:—-]+$/, '')}…`;
}

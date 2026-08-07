/**
 * Keyword text normalisation, shared by the content build and the site runtime.
 *
 * Kept in one place deliberately: the build validates card text against the
 * closed keyword taxonomy, and the renderer resolves bold keyword phrases to
 * their rulings at request time. Both must agree on how a phrase folds to a
 * registry term.
 */

/** Curly quotes in card text must compare equal to straight quotes in the registry. */
export function normalizeQuotes(value) {
  return value.replace(/[‘’]/g, "'").replace(/[“”]/g, '"');
}

/**
 * `Detach 1`, `Detach 2` and `Detach X` are one keyword with a parameter.
 * Fold standalone integer / X tokens to `N` so the registry holds one entry.
 */
export function normalizeKeyword(phrase) {
  return normalizeQuotes(phrase)
    .split(/\s+/)
    .map((token) => (/^(?:\d+|X)$/.test(token) ? 'N' : token))
    .join(' ')
    .trim();
}

/** `Detach 1 and Mill 3` and `Negate & Destroy` each invoke two keywords. */
export function splitComposite(phrase) {
  return phrase
    .split(/\s+(?:and|&)\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

/**
 * The MSE markup vocabulary, shared by the content build and the renderer.
 *
 * Kept in one place deliberately: when these lists drifted apart, the build
 * accepted a tag that the renderer then threw on, and the failure only appeared
 * during page generation.
 */

/** Tags that carry meaning and are translated into HTML by the renderer. */
export const SEMANTIC_MSE_TAGS = ['b', 'i', 'i-auto', 'i-flavor', 'sym-auto'];

/**
 * Tags that are presentational only. They are validated, then removed — their
 * text content is kept. `error-spelling` is MSE's spell-check annotation, which
 * MSE writes back into card files on save.
 */
export const STRIPPED_MSE_TAGS = [
  'atom-sep',
  'bullet',
  'error-spelling',
  'key',
  'kw-a',
  'li',
  'margin',
  'nospellcheck',
  'param-cost',
  'param-number',
  'soft',
  'word-list-class-en',
  'word-list-enchantment',
  'word-list-race-en',
  'word-list-spell',
  'word-list-type-en',
];

/** Every tag permitted in MSE source text. Anything else fails the build. */
export const ALLOWED_MSE_TAGS = [...SEMANTIC_MSE_TAGS, ...STRIPPED_MSE_TAGS];

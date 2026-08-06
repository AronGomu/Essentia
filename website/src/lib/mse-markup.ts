import { ALLOWED_MSE_TAGS, STRIPPED_MSE_TAGS } from '../../shared/mse-tags.mjs';

const tagPattern = /<(\/)?([a-z][a-z0-9-]*)(?::[^>]*)?>/gi;
const allowed = new Set<string>(ALLOWED_MSE_TAGS);
// Built from the shared list so a new presentational tag cannot be validated
// but left un-stripped, which would leak escaped markup into the page.
const strippedPattern = new RegExp(
  `&lt;\\/?(?:${STRIPPED_MSE_TAGS.join('|')})(?::[^&]*)?&gt;`,
  'gi',
);

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function renderMseMarkup(value: string): string {
  const stack: string[] = [];
  for (const match of value.matchAll(tagPattern)) {
    const tag = match[2]!.toLowerCase();
    if (!allowed.has(tag)) throw new Error(`Unknown MSE tag: ${tag}`);
    if (match[1]) {
      if (stack.pop() !== tag) throw new Error(`Unbalanced MSE tag: ${tag}`);
    } else stack.push(tag);
  }
  if (stack.length) throw new Error(`Unclosed MSE tag: ${stack.at(-1)}`);

  let html = escapeHtml(value).replaceAll('\n', '<br>');
  html = html
    .replace(/&lt;b&gt;/gi, '<strong>')
    .replace(/&lt;\/b&gt;/gi, '</strong>')
    .replace(/&lt;i(?:-auto|-flavor)?&gt;/gi, '<em>')
    .replace(/&lt;\/i(?:-auto|-flavor)?&gt;/gi, '</em>')
    .replace(
      /&lt;sym-auto&gt;([^<]*)&lt;\/sym-auto&gt;/gi,
      '<span class="mana-symbol" aria-label="$1">$1</span>',
    )
    .replace(strippedPattern, '');
  return html;
}

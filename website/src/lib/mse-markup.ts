import { ALLOWED_MSE_TAGS, STRIPPED_MSE_TAGS } from '../../shared/mse-tags.mjs';
import { normalizeKeyword, splitComposite } from '../../shared/keywords.mjs';

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

function unescapeHtml(value: string): string {
  return value
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&amp;', '&');
}

export interface MseMarkupOptions {
  definitions?: Map<string, string>;
}

/**
 * Appends `(ruling)` reminder text after each bold keyword phrase that
 * resolves against `definitions`. Runs after the bold conversion, over the
 * produced HTML — never over raw MSE source.
 */
function appendReminders(
  html: string,
  definitions: Map<string, string>,
): string {
  return html.replace(
    /<strong>([\s\S]*?)<\/strong>/g,
    (match, inner: string) => {
      const raw = unescapeHtml(
        inner
          .replace(/<[^>]*>/g, '')
          .replace(/\s+/g, ' ')
          .trim(),
      );
      if (!raw) return match;
      const rulings: string[] = [];
      for (const part of splitComposite(raw)) {
        const term = normalizeKeyword(part);
        const ruling = definitions.get(term);
        if (ruling) rulings.push(ruling);
      }
      if (!rulings.length) return match;
      const joined = rulings.map((ruling) => escapeHtml(ruling)).join(' ');
      return `${match}<span class="reminder">(${joined})</span>`;
    },
  );
}

export function renderMseMarkup(
  value: string,
  options?: MseMarkupOptions,
): string {
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
  if (options?.definitions) html = appendReminders(html, options.definitions);
  return html;
}

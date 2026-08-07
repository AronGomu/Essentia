import type { CatalogDoc } from './catalog';

export interface DocsRailGroup {
  key: string;
  label: string;
  docs: Array<{ route: string; title: string }>;
}

/** Groups catalog docs for the rail, preserving catalog order, dropping empty groups. */
export function docsRailGroups(docs: CatalogDoc[]): DocsRailGroup[] {
  const groups: DocsRailGroup[] = [];
  const byKey = new Map<string, DocsRailGroup>();

  for (const doc of docs) {
    let group = byKey.get(doc.group);
    if (!group) {
      group = { key: doc.group, label: doc.groupLabel, docs: [] };
      byKey.set(doc.group, group);
      groups.push(group);
    }
    group.docs.push({ route: doc.route, title: doc.title });
  }

  return groups;
}

const DESCRIPTION_LIMIT = 150;

/**
 * Flattens a doc body into a `<meta name="description">` value.
 *
 * The naive `replace(/[#*_`>|-]/g, ' ')` this replaces mangled every hyphen and
 * underscore in the corpus — `Yu-Gi-Oh!` became `Yu Gi Oh!` and
 * `cards_mse/01_alpha` became `cards mse/01 alpha` — while leaving link syntax
 * behind. Each construct is now removed by its own rule, so word characters are
 * never touched.
 */
export function docDescription(body: string): string {
  const text = body
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]*)\]\[[^\]]*\]/g, '$1')
    .replace(/<(https?:\/\/[^>]+)>/g, ' ')
    .split('\n')
    .map((line) =>
      line
        .replace(/^\s{0,3}#{1,6}\s+/, '')
        .replace(/^\s*>\s?/, '')
        .replace(/^\s*(?:[-*+]|\d+\.)\s+/, ''),
    )
    .filter((line) => !/^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/.test(line))
    .filter((line) => !/^\s*\|?[\s:|-]*\|[\s:|-]*$/.test(line))
    .join('\n')
    .replace(/\|/g, ' ')
    .replace(/`+/g, '')
    // Emphasis only: a `_` flanked by word characters is part of an identifier.
    .replace(/\*+/g, '')
    .replace(/(^|\W)_+(?=\S)/g, '$1')
    .replace(/(?<=\S)_+(?=\W|$)/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (text.length <= DESCRIPTION_LIMIT) return text;
  const cut = text.slice(0, DESCRIPTION_LIMIT);
  const boundary = cut.lastIndexOf(' ');
  return `${(boundary > 0 ? cut.slice(0, boundary) : cut).replace(/[\s.,;:—-]+$/, '')}…`;
}

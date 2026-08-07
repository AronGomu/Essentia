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

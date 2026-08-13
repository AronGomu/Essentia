import { fail } from './shared.mjs';
import { normalizeQuotes } from '../../shared/keywords.mjs';

export function quotedNames(text) {
  const names = normalizeQuotes(text ?? '')
    .replace(/<[^>]*>/g, ' ')
    .matchAll(/"([^"]+)"/g);
  return [...new Set([...names].map((match) => match[1]))];
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function wordBoundaryTest(token) {
  return new RegExp(`\\b${escapeRegExp(token)}\\b`, 'i');
}

/**
 * Three categories of relation per card: `archetype` — other cards whose
 * printed name carries the same archetype's name pattern; `references` —
 * archetypes and cards explicitly quoted in this card's rule text; and
 * `referencedBy` — cards whose rule text references this card or archetype.
 */
export function buildRelatedGraph(cards, sections) {
  const cardsById = new Map(cards.map((card) => [card.id, card]));
  const sectionsBySlug = new Map(
    sections.map((section) => [section.slug, section]),
  );

  const result = new Map();
  for (const card of cards)
    result.set(card.id, { archetype: [], references: [], referencedBy: [] });

  for (const card of cards) {
    if (!card.archetype) continue;
    const section = sectionsBySlug.get(card.archetype);
    if (!section?.namePattern) continue;
    const needle = normalizeQuotes(section.namePattern).toLowerCase();
    const archetype = cards
      .filter(
        (other) =>
          other.id !== card.id &&
          normalizeQuotes(other.name).toLowerCase().includes(needle),
      )
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((other) => other.id);
    result.get(card.id).archetype = archetype;
  }

  for (const card of cards) {
    for (const token of quotedNames(card.ruleText ?? card.ruleTextPlain)) {
      const normalizedToken = normalizeQuotes(token).toLowerCase();
      if (normalizeQuotes(card.name).toLowerCase().includes(normalizedToken))
        continue;

      const section = sections.find(
        (candidate) =>
          candidate.namePattern &&
          normalizeQuotes(candidate.namePattern).toLowerCase() ===
            normalizedToken,
      );
      if (section) {
        if (section.slug === card.archetype) continue;
        result.get(card.id).references.push({
          kind: 'archetype',
          slug: section.slug,
          label: section.label,
          route: section.route,
          count: section.cardIds.length,
        });
        for (const memberId of section.cardIds)
          result.get(memberId)?.referencedBy.push(card.id);
        continue;
      }

      const target = cards.find(
        (other) =>
          other.id !== card.id &&
          wordBoundaryTest(token).test(normalizeQuotes(other.name)),
      );
      if (target) {
        result.get(card.id).references.push({ kind: 'card', id: target.id });
        result.get(target.id).referencedBy.push(card.id);
        continue;
      }

      fail(
        `related: ${card.id} references unknown card/archetype ${JSON.stringify(token)}`,
      );
    }
  }

  for (const entry of result.values()) {
    entry.references = [
      ...new Map(
        entry.references.map((reference) => [
          reference.kind === 'archetype'
            ? `archetype:${reference.slug}`
            : `card:${reference.id}`,
          reference,
        ]),
      ).values(),
    ].sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === 'archetype' ? -1 : 1;
      const aName = a.kind === 'archetype' ? a.label : cardsById.get(a.id).name;
      const bName = b.kind === 'archetype' ? b.label : cardsById.get(b.id).name;
      return aName.localeCompare(bName);
    });
    entry.referencedBy = [...new Set(entry.referencedBy)].sort((a, b) =>
      cardsById.get(a).name.localeCompare(cardsById.get(b).name),
    );
  }

  return result;
}

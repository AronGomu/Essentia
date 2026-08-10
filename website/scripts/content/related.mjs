import { fail } from './shared.mjs';
import { normalizeQuotes } from '../../shared/keywords.mjs';

export const COLOR_WORDS = {
  white: 'W',
  blue: 'U',
  black: 'B',
  red: 'R',
  green: 'G',
};

export const SUPERTYPE_WORDS = [
  'Ritual',
  'Xyz',
  'Fusion',
  'Synchro',
  'Link',
  'Trap',
];

/** A phrase with an `N` parameter is printed with a literal digit or `X`. */
function keywordOccursIn(term, clause) {
  const pattern = term
    .split(' ')
    .map((token) => (token === 'N' ? '(?:\\d+|X)' : token))
    .join('\\s+');
  return new RegExp(`\\b${pattern}\\b`).test(clause);
}

/** Split MSE rule text into independent ability lines/statements. */
export function extractClauses(text) {
  return (text ?? '')
    .split(/[\n.;—]/)
    .map((clause) =>
      clause
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim(),
    )
    .filter(Boolean);
}

function parseMv(clause) {
  const re = /\bMV\s+([A-Za-z0-9]+)(?:\s+or\s+(less|more))?/gi;
  let match;
  let mv = null;
  while ((match = re.exec(clause))) {
    const token = match[1];
    if (/^meets$/i.test(token)) continue; // "whose MV meets its Ritual cost" — legal prose
    let value;
    if (/^\d+$/.test(token)) value = Number(token);
    else if (/^X$/.test(token)) value = 'X';
    else
      fail(
        `related: unparseable MV token ${JSON.stringify(token)} in clause ${JSON.stringify(clause)}`,
      );
    const suffix = match[2] ? match[2].toLowerCase() : null;
    const op = suffix === 'less' ? '<=' : suffix === 'more' ? '>=' : '=';
    mv = { op, value };
  }
  return mv;
}

/** Extract the constraint kinds a clause states, against the given subtype vocabulary. */
export function parseConstraints(clause, vocab) {
  const text = normalizeQuotes(clause);

  const subtypes = [...vocab]
    .filter((word) => new RegExp(`\\b${word}\\b`, 'i').test(text))
    .sort((a, b) => a.localeCompare(b));

  const names = [...text.matchAll(/"([^"]+)"/g)]
    .map((match) => match[1])
    .sort((a, b) => a.localeCompare(b));

  const colors = Object.entries(COLOR_WORDS)
    .filter(([word]) => new RegExp(`\\b${word}\\b`, 'i').test(text))
    .map(([, letter]) => letter)
    .sort();

  const supertypes = SUPERTYPE_WORDS.filter((word) =>
    new RegExp(`\\b${word}\\b`).test(text),
  ).sort((a, b) => a.localeCompare(b));

  const mv = parseMv(text);

  return { subtypes, names, colors, supertypes, mv };
}

function matchesConstraints(candidate, constraints) {
  if (constraints.subtypes.length) {
    const tokens = (candidate.subType ?? '')
      .split(/\s+/)
      .filter(Boolean)
      .map((token) => token.toLowerCase());
    if (!constraints.subtypes.some((s) => tokens.includes(s.toLowerCase())))
      return false;
  }
  if (constraints.names.length) {
    const name = normalizeQuotes(candidate.name).toLowerCase();
    if (!constraints.names.some((n) => name.includes(n.toLowerCase())))
      return false;
  }
  if (constraints.colors.length) {
    const colors = candidate.colors ?? [];
    if (!constraints.colors.some((c) => colors.includes(c))) return false;
  }
  if (constraints.supertypes.length) {
    const supertypes = candidate.supertypes ?? [];
    if (!constraints.supertypes.some((s) => supertypes.includes(s)))
      return false;
  }
  if (constraints.mv && constraints.mv.value !== 'X') {
    const mv = candidate.manaValue;
    if (constraints.mv.op === '=' && mv !== constraints.mv.value) return false;
    if (constraints.mv.op === '<=' && !(mv <= constraints.mv.value))
      return false;
    if (constraints.mv.op === '>=' && !(mv >= constraints.mv.value))
      return false;
  }
  return true;
}

function hasNoConstraints(constraints) {
  return (
    !constraints.subtypes.length &&
    !constraints.names.length &&
    !constraints.colors.length &&
    !constraints.supertypes.length &&
    !constraints.mv
  );
}

function assertKnownNames(names, card, cards, sections) {
  for (const name of names) {
    const needle = name.toLowerCase();
    const knownCard = cards.some((other) =>
      normalizeQuotes(other.name).toLowerCase().includes(needle),
    );
    const knownSection = sections.some(
      (section) =>
        section.namePattern &&
        normalizeQuotes(section.namePattern).toLowerCase().includes(needle),
    );
    if (!knownCard && !knownSection)
      fail(
        `related: ${card.id} references unknown card/archetype ${JSON.stringify(name)}`,
      );
  }
}

/**
 * Two categories of relation per card: `archetype` — other cards whose
 * printed name carries the same archetype's name pattern — and
 * `interaction` — cards this card's own rule text can act on directly.
 */
export function buildRelatedGraph(cards, sections, keywordRegistry) {
  const actionKeywords = new Set(
    [...keywordRegistry.values()]
      .filter((entry) => ['action', 'cost-procedure'].includes(entry.category))
      .map((entry) => entry.term),
  );
  const subtypeVocab = new Set();
  for (const card of cards)
    for (const token of (card.subType ?? '').split(/\s+/).filter(Boolean))
      subtypeVocab.add(token);

  const sectionsBySlug = new Map(
    sections.map((section) => [section.slug, section]),
  );

  const result = new Map();
  for (const card of cards)
    result.set(card.id, { archetype: [], interaction: [] });

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
    const cardActionKeywords = (card.keywords ?? []).filter((term) =>
      actionKeywords.has(term),
    );
    if (!cardActionKeywords.length) continue;

    const relatedIds = new Set();
    for (const clause of extractClauses(card.ruleText ?? card.ruleTextPlain)) {
      const hasAction = cardActionKeywords.some((term) =>
        keywordOccursIn(term, clause),
      );
      if (!hasAction) continue;

      const constraints = parseConstraints(clause, subtypeVocab);
      assertKnownNames(constraints.names, card, cards, sections);
      if (hasNoConstraints(constraints)) continue;

      for (const other of cards) {
        if (other.id === card.id) continue;
        if (matchesConstraints(other, constraints)) relatedIds.add(other.id);
      }
    }

    const cardsById = new Map(cards.map((c) => [c.id, c]));
    result.get(card.id).interaction = [...relatedIds].sort((a, b) =>
      cardsById.get(a).name.localeCompare(cardsById.get(b).name),
    );
  }

  return result;
}

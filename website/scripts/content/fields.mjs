import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { CONTENT, fail, stripMarkup } from './shared.mjs';

export const COLOR_LETTERS = ['W', 'U', 'B', 'R', 'G'];
const COLOR_SET = new Set(COLOR_LETTERS);

// Every token super_type may legitimately contain. Unknown tokens fail the
// build rather than silently widening the vocabulary.
const SUPERTYPE_VOCABULARY = new Set([
  'Artifact',
  'Basic',
  'Creature',
  'Enchantment',
  'Fusion',
  'Instant',
  'Land',
  'Legendary',
  'Link',
  'Planeswalker',
  'Ritual',
  'Snow',
  'Sorcery',
  'Summon',
  'Synchro',
  'Trap',
  'Tuner',
  'Xyz',
]);

// Extra-deck membership is a property of the creature itself. A "Fusion Summon
// Sorcery" performs a Fusion Summon from the main deck and must not be caught.
const EXTRA_DECK_MARKERS = new Set(['Fusion', 'Synchro', 'Xyz', 'Link']);

const COST_TOKEN =
  /(\d+)|([WUBRG])\/([WUBRG])|([WUBRG])|(X)|(C)|(\{[^}]*\})|(\s+)|(.)/gy;

/**
 * Parse an MSE casting cost into its colour identity and mana value.
 * Fails on any symbol the vocabulary does not cover.
 */
export function parseCastingCost(cost, source) {
  const colors = new Set();
  let manaValue = 0;
  const value = (cost ?? '').trim();
  if (!value) return { colors: [], manaValue: 0 };
  COST_TOKEN.lastIndex = 0;
  let consumed = 0;
  let match;
  while ((match = COST_TOKEN.exec(value)) !== null) {
    consumed = COST_TOKEN.lastIndex;
    const [, generic, hybridLeft, hybridRight, single, variable, colorless] =
      match;
    if (generic !== undefined) manaValue += Number(generic);
    else if (hybridLeft !== undefined) {
      colors.add(hybridLeft);
      colors.add(hybridRight);
      manaValue += 1;
    } else if (single !== undefined) {
      colors.add(single);
      manaValue += 1;
    } else if (variable !== undefined) {
      // X contributes nothing to a printed mana value.
    } else if (colorless !== undefined) manaValue += 1;
    else if (match[7] !== undefined)
      fail(`${source}: unsupported cost group ${match[7]}`);
    else if (match[8] !== undefined) continue;
    else fail(`${source}: unsupported cost symbol ${JSON.stringify(match[9])}`);
  }
  if (consumed !== value.length)
    fail(`${source}: unparsed casting cost ${JSON.stringify(value)}`);
  return {
    colors: COLOR_LETTERS.filter((letter) => colors.has(letter)),
    manaValue,
  };
}

/** Tokenize super_type, dropping the `Lvl N` rating qualifier that trails Link. */
export function parseSupertypes(superType, source) {
  const tokens = stripMarkup(superType)
    .split(/\s+/)
    .filter(Boolean)
    .filter((token, index, all) => {
      if (token === 'Lvl') return false;
      if (/^\d+$/.test(token) && all[index - 1] === 'Lvl') return false;
      return true;
    });
  for (const token of tokens)
    if (!SUPERTYPE_VOCABULARY.has(token))
      fail(`${source}: unknown super type token ${JSON.stringify(token)}`);
  return tokens;
}

export function parseSubtypes(subType) {
  return stripMarkup(subType ?? '')
    .split(/\s+/)
    .filter(Boolean);
}

export function buildTypeLine(superType, subType) {
  const left = stripMarkup(superType ?? '');
  const right = stripMarkup(subType ?? '');
  if (!right) return left;
  return `${left} — ${right}`;
}

export function classifyZone(supertypes) {
  const isCreature = supertypes.includes('Creature');
  return isCreature && supertypes.some((token) => EXTRA_DECK_MARKERS.has(token))
    ? 'extra'
    : 'main';
}

export function normalizeOracle(ruleTextPlain) {
  return (ruleTextPlain ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export async function loadColorOverrides() {
  const file = path.join(CONTENT, 'color-overrides.json');
  const data = JSON.parse(await readFile(file, 'utf8'));
  if (data.schemaVersion !== 1 || !Array.isArray(data.cards))
    fail('invalid colour override registry');
  const overrides = new Map();
  for (const entry of data.cards) {
    if (
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(entry.stableId ?? '') ||
      overrides.has(entry.stableId) ||
      !Array.isArray(entry.colors) ||
      !entry.colors.length ||
      new Set(entry.colors).size !== entry.colors.length ||
      typeof entry.reason !== 'string' ||
      !entry.reason.trim()
    )
      fail(`invalid colour override ${entry.stableId ?? 'unknown'}`);
    for (const letter of entry.colors)
      if (!COLOR_SET.has(letter))
        fail(`colour override ${entry.stableId}: invalid colour ${letter}`);
    overrides.set(entry.stableId, {
      colors: COLOR_LETTERS.filter((letter) => entry.colors.includes(letter)),
      reason: entry.reason,
    });
  }
  return overrides;
}

export function applyColorOverride(stableId, parsed, overrides) {
  const override = overrides.get(stableId);
  if (!override) return { colors: parsed.colors, colorSource: 'cost' };
  return { colors: override.colors, colorSource: 'override' };
}

/** Fail when an override names a card that no published package contains. */
export function assertOverridesResolved(overrides, seenIds) {
  for (const stableId of overrides.keys())
    if (!seenIds.has(stableId))
      fail(`colour override references unknown card ${stableId}`);
}

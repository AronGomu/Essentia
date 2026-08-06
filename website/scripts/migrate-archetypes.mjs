/**
 * One-off Phase 0 migration: seed `archetype` + `role` into content/identities.json
 * and `namePattern` into content/sections.json, replacing the folder-map and
 * stableId-prefix fallbacks that build-content.mjs used to carry.
 *
 * Membership is derived from the printed card name (the in-game rule). Cards
 * that sit in an archetype's draft folder without carrying its name become
 * `support` — those are the judgement calls a maintainer must review.
 *
 * Run once, review the printed table, commit, delete this script.
 */
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const WEBSITE = path.resolve(import.meta.dirname, '..');
const ROOT = path.resolve(WEBSITE, '..');
const CONTENT = path.join(WEBSITE, 'content');

// The mapping being retired. Used here only to seed the authored data.
const PROJECT_SECTION_GROUP = {
  '00_YGO_Non_Archetype.mse-set': '00_non_archetype',
  '01_YGO_Burning_Abyss.mse-set': '01_burning_abyss',
  '02_YGO_Shaddoll.mse-set': '02_shaddoll',
  '03_YGO_Nekroz.mse-set': '03_nekroz',
  '04_YGO_Spellbook.mse-set': '04_spellbook',
};
const NAME_PATTERNS = {
  '01_burning_abyss': 'Burning Abyss',
  '02_shaddoll': 'Shaddoll',
  '03_nekroz': 'Nekroz',
  '04_spellbook': 'Spellbook',
};
const CARDS_ROOT = path.join(ROOT, 'cards_mse');

const sections = JSON.parse(
  await readFile(path.join(CONTENT, 'sections.json'), 'utf8'),
);
const identities = JSON.parse(
  await readFile(path.join(CONTENT, 'identities.json'), 'utf8'),
);

const slugByGroup = new Map(
  sections.sections.map((section) => [section.group, section.slug]),
);

/**
 * Released cards no longer live in their draft folder — they were moved into
 * the package project. Index every `<project>/card <x>` path under cards_mse so
 * a source resolves wherever it currently sits.
 */
async function indexCardFiles(dir, index = new Map()) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) await indexCardFiles(absolute, index);
    else if (entry.isFile() && entry.name.startsWith('card ')) {
      const project = path.basename(path.dirname(absolute));
      const key = `${project}/${entry.name}`;
      if (!index.has(key)) index.set(key, absolute);
    }
  }
  return index;
}

const cardFiles = await indexCardFiles(CARDS_ROOT);

async function cardName(source) {
  const absolute = cardFiles.get(source);
  if (!absolute) return null;
  const text = await readFile(absolute, 'utf8');
  return /^\tname:\s*(.*)$/m.exec(text)?.[1]?.trim() ?? null;
}

const rows = [];
for (const identity of identities.cards) {
  let name = null;
  for (const source of identity.sources) {
    name = await cardName(source);
    if (name) break;
  }
  const draftSource = identity.sources.find(
    (source) => PROJECT_SECTION_GROUP[source.split('/')[0]],
  );
  const group = draftSource
    ? PROJECT_SECTION_GROUP[draftSource.split('/')[0]]
    : null;

  // Name-derived membership wins; it mirrors the in-game rule.
  let archetype = null;
  let role = 'staple';
  const matched = Object.entries(NAME_PATTERNS).filter(
    ([, pattern]) => name && name.toLowerCase().includes(pattern.toLowerCase()),
  );
  if (matched.length > 1)
    throw new Error(
      `${identity.stableId}: name matches ${matched.length} archetypes`,
    );
  if (matched.length === 1) {
    archetype = slugByGroup.get(matched[0][0]);
    role = 'member';
  } else if (group && group !== '00_non_archetype') {
    archetype = slugByGroup.get(group);
    role = 'support';
  }
  identity.archetype = archetype;
  identity.role = role;
  rows.push({
    stableId: identity.stableId,
    name: name ?? '(unresolved)',
    archetype,
    role,
    group,
  });
}

identities.schemaVersion = 3;
for (const identity of identities.cards) {
  // Stable key order keeps the committed diff readable.
  const ordered = {
    archetype: identity.archetype,
    retired: identity.retired,
    role: identity.role,
    routeAliases: identity.routeAliases,
    sources: identity.sources,
    stableId: identity.stableId,
    withdrawn: identity.withdrawn,
  };
  if (identity.supports) ordered.supports = identity.supports;
  for (const key of Object.keys(identity)) delete identity[key];
  Object.assign(identity, ordered);
}

sections.schemaVersion = 2;
for (const section of sections.sections)
  if (section.kind === 'archetype')
    section.namePattern = NAME_PATTERNS[section.group];

await writeFile(
  path.join(CONTENT, 'identities.json'),
  `${JSON.stringify(identities, null, 2)}\n`,
  'utf8',
);
await writeFile(
  path.join(CONTENT, 'sections.json'),
  `${JSON.stringify(sections, null, 2)}\n`,
  'utf8',
);

const counts = rows.reduce((total, row) => {
  total[row.role] = (total[row.role] ?? 0) + 1;
  return total;
}, {});
process.stdout.write(
  `\nseeded ${rows.length} identities: ${JSON.stringify(counts)}\n`,
);
process.stdout.write(
  `\n=== role=support (in an archetype folder, name lacks the archetype string) ===\n`,
);
for (const row of rows.filter((item) => item.role === 'support'))
  process.stdout.write(`  ${row.archetype.padEnd(15)} ${row.name}\n`);
process.stdout.write(
  `\n=== role=staple (archetype null) — ${counts.staple ?? 0} cards ===\n`,
);
for (const row of rows.filter((item) => item.role === 'staple'))
  process.stdout.write(`  ${row.name}\n`);
process.stdout.write(`\n=== unresolved names (review manually) ===\n`);
for (const row of rows.filter((item) => item.name === '(unresolved)'))
  process.stdout.write(`  ${row.stableId} (group ${row.group ?? 'none'})\n`);

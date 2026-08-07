import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { CONTENT, WEBSITE, fail } from './shared.mjs';

/**
 * @param {{ slug: string, heroImage?: string }} section
 * @param {Set<string>} provenanceKeys keys present in content/art-provenance.json
 * @param {(relativeToPublic: string) => boolean} exists
 * @returns {void} calls fail() on any violation
 */
export function assertHeroImage(section, provenanceKeys, exists) {
  const { slug, heroImage } = section;
  if (!heroImage) fail(`content: section ${slug}: heroImage is required`);
  const expected = `/art/${slug}-hero.webp`;
  if (
    heroImage !== expected ||
    !/^\/art\/[a-z0-9-]+-hero\.webp$/.test(heroImage)
  )
    fail(`content: section ${slug}: heroImage must match ${expected}`);
  if (!exists(path.join('art', `${slug}-hero.webp`)))
    fail(
      `content: section ${slug}: heroImage file public${heroImage} is missing`,
    );
  if (!provenanceKeys.has(heroImage))
    fail(
      `content: section ${slug}: heroImage has no entry in content/art-provenance.json`,
    );
}

const ROLES = new Set(['member', 'support', 'staple']);

/**
 * Membership mirrors the in-game rule: a card belongs to an archetype when its
 * printed name contains the archetype string. Anything else is authored.
 */
function compileNamePattern(pattern, group) {
  if (typeof pattern !== 'string' || !pattern.trim())
    fail(`section ${group}: archetype requires a namePattern`);
  return new RegExp(
    pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+'),
    'i',
  );
}

export async function loadRegistries() {
  const sectionData = JSON.parse(
    await readFile(path.join(CONTENT, 'sections.json'), 'utf8'),
  );
  const identityData = JSON.parse(
    await readFile(path.join(CONTENT, 'identities.json'), 'utf8'),
  );
  if (sectionData.schemaVersion !== 2 || !Array.isArray(sectionData.sections))
    fail('section registry must use schemaVersion 2');
  if (identityData.schemaVersion !== 3 || !Array.isArray(identityData.cards))
    fail('identity registry must use schemaVersion 3');

  const provenanceData = JSON.parse(
    await readFile(path.join(CONTENT, 'art-provenance.json'), 'utf8'),
  );
  const provenanceKeys = new Set(
    (provenanceData.art ?? []).map((entry) => entry.key),
  );
  const publicExists = (relativeToPublic) =>
    existsSync(path.join(WEBSITE, 'public', relativeToPublic));

  const sections = new Map();
  const sectionsBySlug = new Map();
  for (const item of sectionData.sections) {
    if (
      !/^\d{2}_[a-z0-9_]+$/.test(item.group ?? '') ||
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.slug ?? '') ||
      !['archetype', 'non-archetype'].includes(item.kind) ||
      !Number.isInteger(item.order) ||
      sections.has(item.group) ||
      sectionsBySlug.has(item.slug)
    )
      fail(`invalid section ${item.group ?? 'unknown'}`);
    assertHeroImage(item, provenanceKeys, publicExists);
    const record = { ...item };
    if (item.kind === 'archetype')
      record.namePatternRe = compileNamePattern(item.namePattern, item.group);
    else if (item.namePattern !== undefined)
      fail(`section ${item.group}: namePattern is archetype-only`);
    sections.set(item.group, record);
    sectionsBySlug.set(item.slug, record);
  }

  const nonArchetype = [...sections.values()].find(
    (section) => section.kind === 'non-archetype',
  );
  if (!nonArchetype) fail('section registry needs a non-archetype section');

  const heroSectionSlug = sectionData.hero?.sectionSlug;
  if (
    typeof heroSectionSlug !== 'string' ||
    !sectionsBySlug.has(heroSectionSlug)
  )
    fail('section registry: hero.sectionSlug must name a known section');

  const bySource = new Map();
  const byId = new Map();
  const aliases = new Set();
  for (const item of identityData.cards) {
    if (
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.stableId ?? '') ||
      !Array.isArray(item.sources) ||
      !item.sources.length ||
      !Array.isArray(item.routeAliases) ||
      byId.has(item.stableId)
    )
      fail(`invalid identity ${item.stableId ?? 'unknown'}`);
    if (!ROLES.has(item.role))
      fail(`identity ${item.stableId}: role must be member|support|staple`);
    if (item.archetype === undefined)
      fail(
        `identity ${item.stableId}: archetype is required (null for staples)`,
      );
    if (item.archetype === null) {
      if (item.role !== 'staple')
        fail(`identity ${item.stableId}: archetype null requires role staple`);
    } else {
      const section = sectionsBySlug.get(item.archetype);
      if (!section || section.kind !== 'archetype')
        fail(`identity ${item.stableId}: unknown archetype ${item.archetype}`);
      if (item.role === 'staple')
        fail(`identity ${item.stableId}: staples must set archetype null`);
    }
    if (item.supports !== undefined) {
      if (!Array.isArray(item.supports))
        fail(`identity ${item.stableId}: invalid supports`);
      for (const slug of item.supports) {
        const section = sectionsBySlug.get(slug);
        if (!section || section.kind !== 'archetype')
          fail(`identity ${item.stableId}: unknown supports archetype ${slug}`);
      }
    }
    byId.set(item.stableId, item);
    for (const source of item.sources) {
      if (
        typeof source !== 'string' ||
        !source.includes('/card ') ||
        source.includes('..') ||
        bySource.has(source)
      )
        fail(`invalid identity source ${source}`);
      bySource.set(source, item);
    }
    for (const alias of item.routeAliases) {
      if (
        !/^\/[a-z0-9][a-z0-9/-]*\/$/.test(alias) ||
        alias.includes('//') ||
        aliases.has(alias)
      )
        fail(`invalid route alias ${alias}`);
      aliases.add(alias);
    }
  }
  return {
    sections,
    sectionsBySlug,
    nonArchetype,
    bySource,
    byId,
    heroSectionSlug,
  };
}

/**
 * Cross-check authored membership against the printed name. This replaces the
 * deleted folder-map and stableId-prefix fallbacks.
 *
 * Membership is tested against *every* archetype pattern, not just the one the
 * card claims — otherwise a card named "Burning Abyss - Cir" could be authored
 * as `archetype: null, role: staple` and silently escape its archetype, which
 * is the same class of silent misclassification the fallbacks used to cause.
 */
export function assertMembership(identity, cardName, registry) {
  const matches = [...registry.sectionsBySlug.values()].filter((section) =>
    section.namePatternRe?.test(cardName),
  );
  if (matches.length > 1)
    fail(
      `${identity.stableId} ("${cardName}"): name matches ${matches.length} archetype patterns ` +
        `(${matches.map((section) => section.slug).join(', ')}) — namePatterns must be mutually exclusive`,
    );

  const derived = matches[0] ?? null;
  const authoredMember = identity.role === 'member';

  if (derived && !authoredMember)
    fail(
      `${identity.stableId} ("${cardName}"): name carries the ${derived.slug} pattern ` +
        `but the card is authored as role ${JSON.stringify(identity.role)} — ` +
        `a card whose name names an archetype is a member of it`,
    );
  if (!derived && authoredMember)
    fail(
      `${identity.stableId} ("${cardName}"): authored as a member of ` +
        `${identity.archetype} but the name does not carry its pattern`,
    );
  if (derived && identity.archetype !== derived.slug)
    fail(
      `${identity.stableId} ("${cardName}"): name-derived archetype ${derived.slug} ` +
        `disagrees with authored archetype ${JSON.stringify(identity.archetype)}`,
    );
}

/** Section membership follows the authored archetype, never the folder layout. */
export function resolveSection(identity, registry) {
  if (!identity.archetype) return registry.nonArchetype;
  const section = registry.sectionsBySlug.get(identity.archetype);
  if (!section)
    fail(`${identity.stableId}: unresolved archetype ${identity.archetype}`);
  return section;
}

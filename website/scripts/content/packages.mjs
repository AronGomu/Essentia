import { lstat, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { isSupportedRenderProvenance } from '../render-provenance.mjs';
import { ALLOWED_MSE_TAGS } from '../../shared/mse-tags.mjs';
import {
  CARDS_ROOT,
  LIMITS,
  PACKAGE_STATUSES,
  PUBLIC_STAGES,
  SET_ID_RE,
  VERSION_RE,
  fail,
  normalizedFields,
  packageFolder,
  renderName,
  safeDirectory,
  safeFile,
  sectionRoute,
  sha,
  stripMarkup,
  validDate,
  validTimestamp,
  walkFiles,
} from './shared.mjs';
import { assertMembership, resolveSection } from './identity.mjs';
import {
  applyColorOverride,
  buildTypeLine,
  classifyZone,
  normalizeOracle,
  parseCastingCost,
  parseSubtypes,
  parseSupertypes,
} from './fields.mjs';
import { extractKeywords } from './keywords.mjs';
import { buildCardImages, findPrintMaster } from './images.mjs';

function parseFields(text) {
  const fields = new Map();
  let key = null;
  let lines = [];
  const flush = () => {
    if (key !== null) {
      if (fields.has(key)) fail(`duplicate field ${key}`);
      fields.set(key, lines.join('\n').trimEnd());
    }
  };
  for (const line of text
    .replace(/^\uFEFF/, '')
    .replaceAll('\r\n', '\n')
    .replaceAll('\r', '\n')
    .split('\n')) {
    const match = /^\t([^:\n]+):(?:\s?(.*))?$/.exec(line);
    if (match) {
      flush();
      key = match[1].trim();
      lines = [match[2] ?? ''];
    } else if (key !== null && line.startsWith('\t\t'))
      lines.push(line.slice(2));
    else {
      flush();
      key = null;
      lines = [];
    }
  }
  flush();
  return fields;
}

function required(fields, name, source) {
  const value = fields.get(name)?.trim();
  if (!value) fail(`${source}: missing ${name}`);
  return value;
}

function validateMarkup(value, name) {
  const allowed = new Set(ALLOWED_MSE_TAGS);
  const stack = [];
  for (const match of value.matchAll(/<(\/)?([a-z][a-z0-9-]*)(?::[^>]*)?>/gi)) {
    const tag = match[2].toLowerCase();
    if (!allowed.has(tag)) fail(`${name}: unknown MSE tag <${tag}>`);
    if (match[1]) {
      if (stack.pop() !== tag) fail(`${name}: unbalanced tag </${tag}>`);
    } else stack.push(tag);
  }
  if (stack.length) fail(`${name}: unclosed tag <${stack.at(-1)}>`);
}

async function validatePackageHashes(root) {
  const manifest = JSON.parse(
    await readFile(
      await safeFile(root, 'package-sha256.json', 4_194_304),
      'utf8',
    ),
  );
  if (
    manifest.schemaVersion !== 1 ||
    manifest.algorithm !== 'sha256' ||
    typeof manifest.files !== 'object' ||
    Array.isArray(manifest.files)
  )
    fail(`${root}: invalid hash manifest`);
  const actual = {};
  for (const relative of (await walkFiles(root)).sort())
    actual[relative] = sha(
      await readFile(await safeFile(root, relative, 134_217_728)),
    );
  if (JSON.stringify(actual) !== JSON.stringify(manifest.files))
    fail(`${root}: package hash mismatch`);
}

function validateRelease(release, stage, folder) {
  const allowed = new Set([
    'schemaVersion',
    'setId',
    'setName',
    'version',
    'stage',
    'status',
    'releasedOn',
    'components',
    'decks',
    'contentPosts',
  ]);
  if (Object.keys(release).some((key) => !allowed.has(key)))
    fail(`${folder}: release metadata contains unsupported/card field`);
  const versionMatch = VERSION_RE.exec(release.version ?? '');
  if (
    release.schemaVersion !== 2 ||
    release.stage !== stage.metadata ||
    !PACKAGE_STATUSES.has(release.status) ||
    !SET_ID_RE.test(release.setId ?? '') ||
    typeof release.setName !== 'string' ||
    !release.setName.trim() ||
    !versionMatch ||
    versionMatch[1] !== stage.versionPrefix ||
    !validDate(release.releasedOn) ||
    !Array.isArray(release.components) ||
    !release.components.length ||
    !Array.isArray(release.decks) ||
    !Array.isArray(release.contentPosts) ||
    folder !== packageFolder(release.setId, release.version)
  )
    fail(`${folder}: invalid release metadata`);
  const projects = new Set();
  for (const component of release.components) {
    if (
      !/^\d{2}_[a-z0-9_]+$/.test(component.group ?? '') ||
      !/^\d{2}_YGO_[A-Za-z0-9_]+\.mse-set$/.test(component.project ?? '') ||
      projects.has(component.project)
    )
      fail(`${folder}: invalid component metadata`);
    projects.add(component.project);
  }
  const deckIds = new Set();
  for (const deck of release.decks) {
    if (
      deck === null ||
      typeof deck !== 'object' ||
      Object.keys(deck).sort().join(',') !== 'cards,id' ||
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(deck.id ?? '') ||
      deckIds.has(deck.id) ||
      !Array.isArray(deck.cards) ||
      deck.cards.some(
        (id) =>
          typeof id !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id),
      ) ||
      new Set(deck.cards).size !== deck.cards.length
    )
      fail(`${folder}: invalid deck metadata`);
    deckIds.add(deck.id);
  }
  if (
    release.contentPosts.some(
      (url) => typeof url !== 'string' || !url.startsWith('https://'),
    )
  )
    fail(`${folder}: invalid content post URL`);
}

async function parseProject(projectRoot, marker) {
  const setText = await readFile(
    await safeFile(projectRoot, 'set', LIMITS.set),
    'utf8',
  );
  if (
    !/^\s*set_language:\s*EN\s*$/m.test(setText) ||
    !/^\s*card_language:\s*English\s*$/m.test(setText)
  )
    fail(`${projectRoot}: English headers missing`);
  const artist = /^\s*artist:\s*(.*?)\s*$/m.exec(setText)?.[1];
  if (artist !== marker)
    fail(
      `${projectRoot}: expected artist=${marker}, got ${artist ?? 'missing'}`,
    );
  const setVisual = setText
    .replace(/^\uFEFF/, '')
    .replaceAll('\r\n', '\n')
    .replaceAll('\r', '\n')
    .replace(/\n$/, '')
    .split('\n')
    .filter(
      (line) =>
        !['description:', 'artist:', 'copyright:'].some((key) =>
          line.trimStart().startsWith(key),
        ),
    )
    .map((line) => line.trimEnd())
    .join('\n');
  const includes = [...setText.matchAll(/^include_file:\s*(.+?)\s*$/gm)].map(
    (match) => match[1],
  );
  if (
    !includes.length ||
    includes.length > LIMITS.cards ||
    new Set(includes).size !== includes.length
  )
    fail(`${projectRoot}: invalid manifest`);
  const cards = [];
  for (const [manifestIndex, sourceFile] of includes.entries()) {
    const sourcePath = await safeFile(projectRoot, sourceFile, LIMITS.card);
    const raw = await readFile(sourcePath, 'utf8');
    const fields = parseFields(raw);
    const name = required(fields, 'name', sourceFile);
    const superTypeRaw = required(fields, 'super_type', sourceFile);
    const imageRelative = fields.get('image')?.trim() || null;
    const imagePath = imageRelative
      ? await safeFile(projectRoot, imageRelative, LIMITS.image)
      : null;
    const artworkHash = imagePath ? sha(await readFile(imagePath)) : '';
    const visualSourceHash = sha(
      Buffer.from(
        `manifest-index:${manifestIndex}\n${setVisual}\nart:${artworkHash}\n${normalizedFields(fields)}`,
      ),
    );
    const ruleText = fields.get('rule_text')?.trim() ?? '';
    const flavorText = fields.get('flavor_text')?.trim() ?? '';
    validateMarkup(
      `${superTypeRaw}${fields.get('sub_type') ?? ''}${ruleText}${flavorText}`,
      name,
    );
    const modified = required(fields, 'time_modified', sourceFile);
    if (!validTimestamp(modified)) fail(`${sourceFile}: invalid time_modified`);
    const codes = ['card_code_text', 'card_code_text_2', 'card_code_text_3']
      .map((key) => fields.get(key)?.trim())
      .filter(Boolean);
    if (new Set(codes).size > 1)
      fail(`${sourceFile}: card code values disagree`);
    cards.push({
      sourceFile,
      manifestIndex,
      name,
      castingCost: fields.get('casting_cost')?.trim() ?? '',
      superType: stripMarkup(superTypeRaw),
      superTypeRaw,
      subType: stripMarkup(fields.get('sub_type') ?? ''),
      subTypeRaw: fields.get('sub_type') ?? '',
      rarity: fields.get('rarity')?.trim() ?? 'unknown',
      ruleText,
      ruleTextPlain: stripMarkup(ruleText),
      flavorText,
      flavorTextPlain: stripMarkup(flavorText),
      power: fields.get('power')?.trim() || null,
      toughness: fields.get('toughness')?.trim() || null,
      collectionNumber: codes[0] ?? '',
      created: fields.get('time_created')?.trim() ?? null,
      modified,
      sourceHash: sha(
        Buffer.from(raw.replace(/^\uFEFF/, '').replaceAll('\r\n', '\n')),
      ),
      visualSourceHash,
      artworkHash,
    });
  }
  return cards;
}

export async function discover(registry, options) {
  const { checkOnly, colorOverrides, keywordRegistry } = options;
  const packages = [];
  const versions = [];
  const rights = [];
  const seenIds = new Set();
  let draftResolutionCount = 0;

  for (const stage of PUBLIC_STAGES) {
    const stageRoot = path.join(CARDS_ROOT, stage.directory);
    for (const entry of await readdir(stageRoot, { withFileTypes: true })) {
      if (entry.name === '.gitkeep') continue;
      const packageRoot = path.join(stageRoot, entry.name);
      const info = await lstat(packageRoot);
      if (info.isSymbolicLink() || !entry.isDirectory())
        fail(`unexpected stage entry ${packageRoot}`);
      const release = JSON.parse(
        await readFile(
          await safeFile(packageRoot, 'release.json', 1_048_576),
          'utf8',
        ),
      );
      validateRelease(release, stage, entry.name);
      await validatePackageHashes(packageRoot);
      const marker = `${release.setName} ${stage.marker}`;
      const packageId = `${stage.metadata}-${release.setId}-${release.version.replaceAll('.', '-').replaceAll('_', '-')}`;
      const packageRecord = {
        id: packageId,
        setId: release.setId,
        setName: release.setName,
        version: release.version,
        status: release.status,
        stage: stage.metadata,
        stageLabel: stage.label,
        stageRank: stage.rank,
        releasedOn: release.releasedOn,
        route: `/releases/${stage.metadata}/${release.setId}-${release.version.replaceAll('.', '-').replaceAll('_', '-')}/`,
        decks: release.decks,
        contentPosts: release.contentPosts,
        cardIds: [],
        sectionSlugs: [],
      };
      const componentCards = [];
      for (const component of release.components) {
        const projectRoot = await safeDirectory(packageRoot, component.project);
        for (const card of await parseProject(projectRoot, marker)) {
          const source = `${component.project}/${card.sourceFile}`;
          const identity = registry.bySource.get(source);
          if (!identity) fail(`${entry.name}: missing identity for ${source}`);
          // Membership is authored and cross-checked against the printed name;
          // there is no folder-map or stableId-prefix fallback any more.
          assertMembership(identity, card.name, registry);
          componentCards.push({
            ...card,
            identity,
            section: resolveSection(identity, registry),
            withdrawn: Boolean(identity.withdrawn),
          });
        }
      }
      const aggregateName = `${packageFolder(release.setId, release.version)}_all_cards.mse-set`;
      const aggregateCards = await parseProject(
        await safeDirectory(packageRoot, aggregateName),
        marker,
      );
      const aggregateById = new Map();
      for (const card of aggregateCards) {
        const id = card.sourceFile.startsWith('card ')
          ? card.sourceFile.slice(5)
          : null;
        if (!id || aggregateById.has(id))
          fail(`${entry.name}: invalid aggregate identity`);
        aggregateById.set(id, card);
      }
      const provenance = JSON.parse(
        await readFile(
          await safeFile(packageRoot, 'render-provenance.json', 4_194_304),
          'utf8',
        ),
      );
      if (
        !isSupportedRenderProvenance(provenance) ||
        provenance.project !== aggregateName ||
        !Array.isArray(provenance.cards)
      )
        fail(`${entry.name}: invalid render provenance`);
      const componentIds = new Set();
      const packageIds = new Set();
      const sectionSlugs = new Set();
      for (const card of componentCards) {
        const id = card.identity.stableId;
        if (componentIds.has(id))
          fail(`${entry.name}: duplicate card identity ${id}`);
        componentIds.add(id);
        if (card.withdrawn) continue;
        packageIds.add(id);
        seenIds.add(id);
        sectionSlugs.add(card.section.slug);
        const aggregate = aggregateById.get(id);
        const attestation = provenance.cards.find(
          (item) => item.id === `card ${id}`,
        );
        if (!aggregate || !attestation)
          fail(`${entry.name}: aggregate/provenance missing ${id}`);
        const canonical = await safeFile(
          path.join(packageRoot, 'renders'),
          renderName(card.name),
          LIMITS.image,
        );
        const renderHash = sha(await readFile(canonical));
        if (
          attestation.sourceHash !== aggregate.visualSourceHash ||
          attestation.artworkHash !== (aggregate.artworkHash || null) ||
          attestation.renderHash !== renderHash
        )
          fail(`${entry.name}: stale render/provenance for ${id}`);
        const metadata = await sharp(canonical, {
          limitInputPixels: 80_000_000,
        }).metadata();
        if (
          !metadata.width ||
          !metadata.height ||
          metadata.width * metadata.height > 80_000_000
        )
          fail(`${entry.name}: invalid render dimensions for ${id}`);

        const printMaster = await findPrintMaster(packageRoot, card.name);
        if (!printMaster) draftResolutionCount += 1;
        const assetRoot = `releases/${packageId}`;
        const images = await buildCardImages({
          id,
          assetRoot,
          canonical,
          printMaster,
          width: metadata.width,
          height: metadata.height,
          checkOnly,
        });

        const parsedCost = parseCastingCost(card.castingCost, `${id} cost`);
        const { colors, colorSource } = applyColorOverride(
          id,
          parsedCost,
          colorOverrides,
        );
        const supertypes = parseSupertypes(card.superTypeRaw, id);
        const types = parseSubtypes(card.subTypeRaw);

        versions.push({
          id,
          packageId,
          sectionSlug: card.section.slug,
          sectionLabel: card.section.label,
          sectionAccent: card.section.accent,
          sectionRoute: sectionRoute(card.section),
          manifestIndex: card.manifestIndex,
          name: card.name,
          castingCost: card.castingCost,
          superType: card.superType,
          subType: card.subType,
          rarity: card.rarity,
          ruleText: card.ruleText,
          ruleTextPlain: card.ruleTextPlain,
          flavorText: card.flavorText,
          flavorTextPlain: card.flavorTextPlain,
          power: card.power,
          toughness: card.toughness,
          collectionNumber: card.collectionNumber,
          created: card.created,
          modified: card.modified,
          support: card.identity.role === 'support',
          colors,
          colorSource,
          manaValue: parsedCost.manaValue,
          typeLine: buildTypeLine(card.superType, card.subType),
          types,
          supertypes,
          zone: classifyZone(supertypes),
          keywords: extractKeywords(card.ruleText, keywordRegistry, id),
          archetype: card.identity.archetype,
          archetypeRole: card.identity.role,
          supports: card.identity.supports ?? [],
          oracleNormalized: normalizeOracle(card.ruleTextPlain),
          images,
          sourceHash: card.sourceHash,
          renderHash,
          width: metadata.width,
          height: metadata.height,
          releasedOn: release.releasedOn,
          stage: stage.metadata,
          stageLabel: stage.label,
          stageRank: stage.rank,
          version: release.version,
          versionRoute: `/cards/${id}/versions/${packageId}/`,
          releaseRoute: packageRecord.route,
        });
        rights.push({
          key: `release:${packageId}:${id}:render`,
          sha256: renderHash,
        });
      }
      if (
        aggregateById.size !== componentIds.size ||
        [...componentIds].some((id) => !aggregateById.has(id))
      )
        fail(`${entry.name}: aggregate/component union mismatch`);
      packageRecord.cardIds = [...packageIds];
      packageRecord.sectionSlugs = [...sectionSlugs];
      packageRecord.count = packageIds.size;
      packages.push(packageRecord);
    }
  }
  if (new Set(packages.map((item) => item.id)).size !== packages.length)
    fail('duplicate release package id');
  return { packages, versions, rights, seenIds, draftResolutionCount };
}

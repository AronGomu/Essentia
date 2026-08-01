import { createHash } from 'node:crypto';
import {
  lstat,
  mkdir,
  readFile,
  readdir,
  realpath,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { isSupportedRenderProvenance } from './render-provenance.mjs';
import {
  compareLifecycleVersion,
  comparePublicationVersion,
  selectCurrentVersion,
} from './publication-order.mjs';

const WEBSITE = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);
const ROOT = path.resolve(WEBSITE, '..');
const CARDS_ROOT = path.join(ROOT, 'cards_mse');
const GENERATED_PUBLIC = path.join(WEBSITE, 'public', 'generated');
const GENERATED_SOURCE = path.join(WEBSITE, 'src', 'generated');
const CHECK_ONLY = process.argv.includes('--check');
const LIMITS = {
  set: 2_097_152,
  card: 524_288,
  image: 67_108_864,
  cards: 500,
  files: 20_000,
};
const PUBLIC_STAGES = [
  {
    directory: '01_alpha',
    metadata: 'alpha',
    label: 'Alpha',
    marker: 'Alpha',
    versionPrefix: 'Alpha',
    rank: 1,
  },
  {
    directory: '02_beta',
    metadata: 'beta',
    label: 'Beta',
    marker: 'Beta',
    versionPrefix: 'Beta',
    rank: 2,
  },
  {
    directory: '03_release',
    metadata: 'release',
    label: 'Release',
    marker: 'Release',
    versionPrefix: 'Release',
    rank: 3,
  },
];
const SET_ID_RE = /^[A-Z]{2,8}-\d{4}$/;
const VERSION_RE = /^(Alpha|Beta|Release)_\d+\.\d+(?:\.\d+)?$/;
const PACKAGE_STATUSES = new Set(['open', 'locked']);
const PROJECT_SECTION_GROUP = {
  '00_YGO_Non_Archetype.mse-set': '00_non_archetype',
  '01_YGO_Burning_Abyss.mse-set': '01_burning_abyss',
  '02_YGO_Shaddoll.mse-set': '02_shaddoll',
  '03_YGO_Nekroz.mse-set': '03_nekroz',
  '04_YGO_Spellbook.mse-set': '04_spellbook',
};

function fail(message) {
  throw new Error(`content: ${message}`);
}
function sha(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}
function stripMarkup(value) {
  return value
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
function packageFolder(setId, version) {
  return `${setId}-${version}`;
}
function renderName(name) {
  return `${name
    .replace(/:/g, ' -')
    .replace(/"/g, "'")
    .replace(/\//g, ' - ')
    .replace(/[<>|?*]/g, '')
    .replace(/[. ]+$/g, '')}.png`;
}
function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T12:00:00Z`);
  return (
    !Number.isNaN(parsed.valueOf()) &&
    parsed.toISOString().slice(0, 10) === value
  );
}
function validTimestamp(value) {
  return /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value);
}
function sectionRoute(section) {
  return section.kind === 'archetype'
    ? `/archetypes/${section.slug}/`
    : `/sections/non-archetype/${section.slug}/`;
}
function normalizedFields(fields) {
  return `${[...fields]
    .filter(
      ([key]) => !['notes', 'time_created', 'time_modified'].includes(key),
    )
    .sort(([a], [b]) => a.localeCompare(b))
    .map(
      ([key, value]) =>
        `${key}:${value
          .split('\n')
          .map((line) => line.trimEnd())
          .join('\n')
          .trim()}`,
    )
    .join('\n')}\n`;
}

async function safeFile(root, relative, limit) {
  if (
    !relative ||
    path.isAbsolute(relative) ||
    relative.includes('..') ||
    /^[A-Za-z]:/.test(relative)
  )
    fail(`unsafe path ${relative}`);
  const realRoot = await realpath(root);
  const candidate = path.resolve(realRoot, relative.replaceAll('\\', '/'));
  if (!candidate.startsWith(`${realRoot}${path.sep}`))
    fail(`path escape ${relative}`);
  let cursor = realRoot;
  for (const segment of relative.replaceAll('\\', '/').split('/')) {
    cursor = path.join(cursor, segment);
    if ((await lstat(cursor)).isSymbolicLink())
      fail(`linked path forbidden ${relative}`);
  }
  const resolved = await realpath(candidate);
  if (!resolved.startsWith(`${realRoot}${path.sep}`))
    fail(`real path escape ${relative}`);
  const info = await stat(resolved);
  if (!info.isFile() || info.size > limit)
    fail(`invalid/oversize file ${relative}`);
  return resolved;
}
async function safeDirectory(root, relative) {
  if (
    !relative ||
    path.isAbsolute(relative) ||
    relative.includes('..') ||
    relative.includes('\\')
  )
    fail(`unsafe directory ${relative}`);
  const realRoot = await realpath(root);
  const candidate = path.resolve(realRoot, relative);
  const resolved = await realpath(candidate);
  const info = await lstat(candidate);
  if (
    !resolved.startsWith(`${realRoot}${path.sep}`) ||
    info.isSymbolicLink() ||
    !info.isDirectory()
  )
    fail(`unsafe directory ${relative}`);
  return candidate;
}
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
  const allowed = new Set([
    'atom-sep',
    'b',
    'bullet',
    'i',
    'i-auto',
    'i-flavor',
    'key',
    'kw-a',
    'li',
    'margin',
    'nospellcheck',
    'param-cost',
    'param-number',
    'soft',
    'sym-auto',
    'word-list-class-en',
    'word-list-enchantment',
    'word-list-race-en',
    'word-list-spell',
    'word-list-type-en',
  ]);
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
async function walkFiles(root, current = root, output = []) {
  for (const entry of await readdir(current, { withFileTypes: true })) {
    const absolute = path.join(current, entry.name);
    const info = await lstat(absolute);
    if (info.isSymbolicLink()) fail(`linked package path ${absolute}`);
    if (entry.isDirectory()) await walkFiles(root, absolute, output);
    else if (entry.isFile() && entry.name !== 'package-sha256.json') {
      output.push(path.relative(root, absolute).split(path.sep).join('/'));
      if (output.length > LIMITS.files) fail('package file limit exceeded');
    } else if (!entry.isFile()) fail(`unsupported package entry ${absolute}`);
  }
  return output;
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
async function loadRegistries() {
  const sectionData = JSON.parse(
    await readFile(path.join(WEBSITE, 'content', 'sections.json'), 'utf8'),
  );
  const identityData = JSON.parse(
    await readFile(path.join(WEBSITE, 'content', 'identities.json'), 'utf8'),
  );
  if (sectionData.schemaVersion !== 1 || !Array.isArray(sectionData.sections))
    fail('invalid section registry');
  if (identityData.schemaVersion !== 2 || !Array.isArray(identityData.cards))
    fail('identity registry must use schemaVersion 2');
  const sections = new Map();
  const sectionSlugs = new Set();
  for (const item of sectionData.sections) {
    if (
      !/^\d{2}_[a-z0-9_]+$/.test(item.group ?? '') ||
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.slug ?? '') ||
      !['archetype', 'non-archetype'].includes(item.kind) ||
      !Number.isInteger(item.order) ||
      sections.has(item.group) ||
      sectionSlugs.has(item.slug)
    )
      fail(`invalid section ${item.group ?? 'unknown'}`);
    sections.set(item.group, item);
    sectionSlugs.add(item.slug);
  }
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
  return { sections, bySource, byId };
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
      subType: stripMarkup(fields.get('sub_type') ?? ''),
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
async function writeDerivative(input, output, format, width) {
  await mkdir(path.dirname(output), { recursive: true });
  const pipeline = sharp(input, {
    limitInputPixels: 80_000_000,
    failOn: 'warning',
  })
    .rotate()
    .resize({ width, withoutEnlargement: true });
  if (format === 'png')
    await pipeline
      .png({ compressionLevel: 9, adaptiveFiltering: true })
      .toFile(output);
  else if (format === 'webp')
    await pipeline.webp({ quality: 86, effort: 5 }).toFile(output);
  else await pipeline.avif({ quality: 60, effort: 4 }).toFile(output);
}
async function introFromDoc(relative, label) {
  const text = await readFile(path.join(ROOT, relative), 'utf8');
  const paragraph = text
    .split(/\n\s*\n/)
    .map((part) =>
      part
        .replace(/^#+\s+.*$/gm, '')
        .replace(/[*_`#>]/g, '')
        .replace(/\[[^\]]+\]\([^)]*\)/g, '')
        .replace(/\s+/g, ' ')
        .trim(),
    )
    .find((part) => part.length > 40 && !part.startsWith('|'));
  return paragraph?.slice(0, 360) ?? `${label} cards adapted for Magic rules.`;
}
async function discover(registry) {
  const packages = [];
  const versions = [];
  const rights = [];
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
      // Open packages may still publish when artifacts are present and valid.
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
        const fallbackSection = registry.sections.get(component.group) ?? null;
        const projectRoot = await safeDirectory(packageRoot, component.project);
        for (const card of await parseProject(projectRoot, marker)) {
          const source = `${component.project}/${card.sourceFile}`;
          const identity = registry.bySource.get(source);
          if (!identity) fail(`${entry.name}: missing identity for ${source}`);
          let section = fallbackSection;
          if (!section) {
            for (const identitySource of identity.sources) {
              const projectName = identitySource.split('/')[0];
              const group = PROJECT_SECTION_GROUP[projectName];
              if (group && registry.sections.has(group)) {
                section = registry.sections.get(group);
                break;
              }
            }
          }
          if (!section) {
            // Mixed set packages: classify by stableId prefix, else non-archetype.
            if (identity.stableId.startsWith('burning-abyss-'))
              section = registry.sections.get('01_burning_abyss');
            else if (identity.stableId.startsWith('nekroz-'))
              section = registry.sections.get('03_nekroz');
            else if (identity.stableId.startsWith('shaddoll-') || identity.stableId.startsWith('el-shaddoll-'))
              section = registry.sections.get('02_shaddoll');
            else if (identity.stableId.startsWith('spellbook-') || identity.stableId.includes('prophecy'))
              section = registry.sections.get('04_spellbook');
            else section = registry.sections.get('00_non_archetype');
          }
          if (!section)
            fail(`${entry.name}: unable to resolve section for ${source}`);
          componentCards.push({
            ...card,
            identity,
            section,
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
        const assetRoot = `releases/${packageId}`;
        const render = `/generated/${assetRoot}/${id}.png`;
        const galleryWebp = `/generated/${assetRoot}/${id}.webp`;
        const galleryAvif = `/generated/${assetRoot}/${id}.avif`;
        if (!CHECK_ONLY)
          await Promise.all([
            writeDerivative(
              canonical,
              path.join(GENERATED_PUBLIC, assetRoot, `${id}.png`),
              'png',
              metadata.width,
            ),
            writeDerivative(
              canonical,
              path.join(GENERATED_PUBLIC, assetRoot, `${id}.webp`),
              'webp',
              560,
            ),
            writeDerivative(
              canonical,
              path.join(GENERATED_PUBLIC, assetRoot, `${id}.avif`),
              'avif',
              560,
            ),
          ]);
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
          support: false,
          sourceHash: card.sourceHash,
          renderHash,
          width: metadata.width,
          height: metadata.height,
          render,
          galleryWebp,
          galleryAvif,
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
  return { packages, versions, rights };
}

async function loadExplanations(knownIds) {
  const output = {};
  const directory = path.join(WEBSITE, 'content', 'explanations');
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name === '.gitkeep') continue;
    const source = path.join(directory, entry.name);
    const info = await lstat(source);
    if (
      info.isSymbolicLink() ||
      !entry.isFile() ||
      !entry.name.endsWith('.md') ||
      info.size > 262_144
    )
      fail(`unsafe explanation ${entry.name}`);
    const value = await readFile(source, 'utf8');
    const match = /^---\ncardId: ([a-z0-9-]+)\n---\n([\s\S]*)$/.exec(value);
    if (!match || entry.name !== `${match[1]}.md` || !knownIds.has(match[1]))
      fail(`invalid explanation ${entry.name}`);
    const markdown = match[2].trim();
    if (/<\/?[A-Za-z][^>]*>|\{[^\n]*\}|!\[[^\]]*\]\([^)]*\)/.test(markdown))
      fail(`unsafe explanation markup ${entry.name}`);
    for (const link of markdown.matchAll(/\[[^\]]+\]\(([^)]+)\)/g))
      if (!/^(https:\/\/|mailto:|#|\/)/.test(link[1].trim()))
        fail(`unsafe explanation URL ${entry.name}`);
    output[match[1]] = markdown;
  }
  return output;
}
async function main() {
  const registry = await loadRegistries();
  if (!CHECK_ONLY) {
    await rm(GENERATED_PUBLIC, { recursive: true, force: true });
    await mkdir(GENERATED_PUBLIC, { recursive: true });
  }
  await rm(GENERATED_SOURCE, { recursive: true, force: true });
  await mkdir(GENERATED_SOURCE, { recursive: true });
  const { packages, versions, rights } = await discover(registry);
  const versionsById = new Map();
  for (const version of versions) {
    const values = versionsById.get(version.id) ?? [];
    if (
      values.some(
        (item) =>
          item.stage === version.stage && item.version === version.version,
      )
    )
      fail(`duplicate lifecycle/version for ${version.id}`);
    values.push(version);
    versionsById.set(version.id, values);
  }
  const cards = [];
  for (const [id, values] of versionsById) {
    values.sort(comparePublicationVersion);
    const latest = selectCurrentVersion(values);
    const identity = registry.byId.get(id);
    cards.push({
      ...latest,
      matchNames: [...new Set(values.map((item) => item.name))],
      formerFilenames: [
        ...new Set(
          (identity?.sources ?? []).map((source) => source.split('/').at(-1)),
        ),
      ],
      routeAliases: identity?.routeAliases ?? [],
      retired: Boolean(identity?.retired),
      route: `/cards/${id}/`,
      versionIds: values.map((item) => item.packageId),
    });
  }
  cards.sort((a, b) => a.name.localeCompare(b.name));
  const cardsById = new Map(cards.map((card) => [card.id, card]));
  const sections = [];
  for (const section of [...registry.sections.values()].sort(
    (a, b) => a.order - b.order,
  )) {
    const sectionCards = cards.filter(
      (card) => card.sectionSlug === section.slug,
    );
    if (!sectionCards.length) continue;
    const iconic =
      sectionCards.find((card) => card.id === section.iconicId) ??
      sectionCards[0];
    sections.push({
      slug: section.slug,
      label: section.label,
      kind: section.kind,
      accent: section.accent,
      intro: await introFromDoc(section.doc, section.label),
      diagnostics: [],
      iconicId: iconic.id,
      route: sectionRoute(section),
      count: sectionCards.length,
      latestModified: [...sectionCards].sort((a, b) =>
        b.releasedOn.localeCompare(a.releasedOn),
      )[0].releasedOn,
      image: iconic.galleryWebp,
      cardIds: sectionCards.map((card) => card.id),
    });
  }
  packages.sort(
    (a, b) =>
      b.stageRank - a.stageRank ||
      -compareLifecycleVersion(a.version, b.version) ||
      b.releasedOn.localeCompare(a.releasedOn),
  );
  const updates = cards
    .map((card) => ({
      cardId: card.id,
      sectionSlug: card.sectionSlug,
      status: card.versionIds.length > 1 ? 'updated' : 'new',
      modified: `${card.releasedOn} 12:00:00`,
      summary:
        card.versionIds.length > 1
          ? `${card.name} advanced to ${card.stageLabel} ${card.version}.`
          : `${card.name} entered ${card.stageLabel} ${card.version}.`,
      packageId: card.packageId,
      versionRoute: card.versionRoute,
    }))
    .sort(
      (a, b) =>
        b.modified.localeCompare(a.modified) ||
        (cardsById.get(a.cardId)?.name ?? '').localeCompare(
          cardsById.get(b.cardId)?.name ?? '',
        ),
    );
  const explanations = await loadExplanations(
    new Set(cards.map((card) => card.id)),
  );
  const generatedAt = packages.length
    ? `${packages[0].releasedOn}T12:00:00.000Z`
    : '1970-01-01T00:00:00.000Z';
  const catalog = {
    schemaVersion: 3,
    generatedAt,
    sections,
    cards,
    cardVersions: versions,
    releases: packages,
    explanations,
    updates,
    publicationDiagnostics: [],
  };
  await Promise.all([
    writeFile(
      path.join(GENERATED_SOURCE, 'catalog.ts'),
      `const catalog = ${JSON.stringify(catalog, null, 2)} as const;\nexport default catalog;\n`,
      'utf8',
    ),
    writeFile(
      path.join(GENERATED_SOURCE, 'explanations.json'),
      `${JSON.stringify(explanations, null, 2)}\n`,
      'utf8',
    ),
    writeFile(
      path.join(GENERATED_SOURCE, 'rights-inventory.json'),
      `${JSON.stringify({ schemaVersion: 1, generatedAt, assets: rights.sort((a, b) => a.key.localeCompare(b.key)) }, null, 2)}\n`,
      'utf8',
    ),
  ]);
  process.stdout.write(
    `content: ${packages.length} releases, ${sections.length} sections, ${cards.length} current cards, ${versions.length} versions\n`,
  );
}
await main();

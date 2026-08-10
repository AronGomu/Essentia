import {
  lstat,
  mkdir,
  readFile,
  readdir,
  rename,
  rm,
  writeFile,
} from 'node:fs/promises';
import path from 'node:path';
import {
  CONTENT,
  GENERATED_PUBLIC,
  GENERATED_SOURCE,
  fail,
  sectionRoute,
  stageDateIssues,
} from './shared.mjs';
import {
  compareLifecycleVersion,
  comparePublicationVersion,
  selectCurrentVersion,
} from '../publication-order.mjs';
import { loadRegistries } from './identity.mjs';
import { assertOverridesResolved, loadColorOverrides } from './fields.mjs';
import { loadDocs } from './docs.mjs';
import { loadPosts } from './blog.mjs';
import { loadKeywordRegistry } from './keywords.mjs';
import { loadSectionIntros, sectionIntroSummary } from './section-intros.mjs';
import { loadReadingOrder, postGroups } from './reading-order.mjs';
import { discover } from './packages.mjs';
import { buildRelatedGraph } from './related.mjs';

export const CATALOG_SCHEMA_VERSION = 11;

export async function writeAtomic(target, content) {
  const temporary = `${target}.${process.pid}.tmp`;
  await writeFile(temporary, content, 'utf8');
  await rename(temporary, target);
}

async function loadExplanations(knownIds) {
  const output = {};
  const directory = path.join(CONTENT, 'explanations');
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

export async function build({ checkOnly }) {
  const registry = await loadRegistries();
  const colorOverrides = await loadColorOverrides();
  const keywordRegistry = await loadKeywordRegistry();
  const sectionIntros = await loadSectionIntros(
    new Set([...registry.sections.values()].map((section) => section.slug)),
  );
  const readingOrder = await loadReadingOrder();
  const docs = await loadDocs(readingOrder.docs);
  const posts = await loadPosts();
  const groupedPosts = postGroups(readingOrder.blog, posts);

  if (!checkOnly) {
    await rm(GENERATED_PUBLIC, { recursive: true, force: true });
    await mkdir(GENERATED_PUBLIC, { recursive: true });
  }
  // Keep generated modules importable while Astro/Vite watches this directory.
  // Removing it first creates a window where SSR imports fail, then Vite caches
  // the missing-module error until its dev server restarts.
  await mkdir(GENERATED_SOURCE, { recursive: true });

  const { packages, versions, rights, seenIds, draftResolutionCount } =
    await discover(registry, { checkOnly, colorOverrides, keywordRegistry });
  assertOverridesResolved(colorOverrides, seenIds);

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
      namePattern: section.namePattern ?? null,
      introMarkdown: sectionIntros.get(section.slug),
      intro: sectionIntroSummary(sectionIntros.get(section.slug)),
      diagnostics: [],
      iconicId: iconic.id,
      route: sectionRoute(section),
      count: sectionCards.length,
      latestModified: [...sectionCards].sort((a, b) =>
        b.releasedOn.localeCompare(a.releasedOn),
      )[0].releasedOn,
      image: iconic.images.thumb.webp,
      heroImage: section.heroImage,
      cardIds: sectionCards.map((card) => card.id),
    });
  }

  const related = buildRelatedGraph(cards, sections);
  for (const card of cards)
    card.related = related.get(card.id) ?? { archetype: [], interaction: [] };

  const stageDateProblems = stageDateIssues(packages);
  if (stageDateProblems.length) fail(stageDateProblems.join('; '));

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
  const keywords = [...keywordRegistry.values()].map((entry) => ({
    id: entry.id,
    term: entry.term,
    category: entry.category,
    archetype: entry.archetype ?? null,
    definition: entry.definition,
    origin: entry.origin,
    doc: entry.doc,
    preview: entry.preview,
    reminder: entry.reminder,
  }));
  const generatedAt = packages.length
    ? `${packages[0].releasedOn}T12:00:00.000Z`
    : '1970-01-01T00:00:00.000Z';

  const catalog = {
    schemaVersion: CATALOG_SCHEMA_VERSION,
    generatedAt,
    heroSectionSlug: registry.heroSectionSlug,
    sections,
    cards,
    cardVersions: versions,
    releases: packages,
    keywords,
    explanations,
    updates,
    docs,
    posts,
    postGroups: groupedPosts,
    publicationDiagnostics: [],
  };

  await Promise.all([
    writeAtomic(
      path.join(GENERATED_SOURCE, 'catalog.ts'),
      `const catalog = ${JSON.stringify(catalog, null, 2)} as const;\nexport default catalog;\n`,
    ),
    writeAtomic(
      path.join(GENERATED_SOURCE, 'explanations.json'),
      `${JSON.stringify(explanations, null, 2)}\n`,
    ),
    writeAtomic(
      path.join(GENERATED_SOURCE, 'rights-inventory.json'),
      `${JSON.stringify({ schemaVersion: 1, generatedAt, assets: rights.sort((a, b) => a.key.localeCompare(b.key)) }, null, 2)}\n`,
    ),
  ]);

  process.stdout.write(
    `content: ${packages.length} releases, ${sections.length} sections, ${cards.length} current cards, ${versions.length} versions, ${keywords.length} keywords, ${docs.length} docs, ${posts.length} posts\n`,
  );
  if (draftResolutionCount)
    process.stdout.write(
      `content: WARNING ${draftResolutionCount} card version(s) have no print master in renders_print/ — print tier is upscaled draft resolution\n`,
    );
}

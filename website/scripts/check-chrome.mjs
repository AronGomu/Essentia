import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { normalizeKeyword, splitComposite } from '../shared/keywords.mjs';

function unescapeHtml(value) {
  return value
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&amp;', '&');
}

export const UTILITY_LINKS = [
  { label: 'Learn about Essentia', path: 'docs/' },
  { label: 'Blog', path: 'blog/' },
  { label: 'Decks', path: 'decks/' },
];

/**
 * @param {string} file dist-relative path, e.g. 'index.html'
 * @param {string} html
 * @param {string} base
 * @returns {string[]} problems for this page
 */
export function chromeIssues(file, html, base) {
  // Browser-local decks are read at runtime, in the visitor's own browser.
  // Seeing one in a built file means the index was assembled at build time,
  // which would publish a visitor's private decklist. Fail the build.
  //
  // This runs before the 404 exemption below: 404.html is exempt from the
  // chrome rules because it is a redirect stub with no header to check, but a
  // leak is a leak whatever the document, and the one rule here that protects
  // visitor data must be fail-closed.
  const leak = html.includes('deck:local:')
    ? [`${file}: a browser-local deck leaked into the built page`]
    : [];

  if (file === '404.html') return leak;

  const problems = [...leak];
  const navMatch = html.match(/<nav class="utility-nav"[\s\S]*?<\/nav>/);
  const navBlock = navMatch ? navMatch[0] : '';

  for (const { label, path: linkPath } of UTILITY_LINKS) {
    const href = `${base}${linkPath}`;
    const hasHref = navBlock.includes(`href="${href}"`);
    const hasLabel = navBlock.includes(`>${label}<`);
    if (!hasHref || !hasLabel) {
      problems.push(
        `${file}: header is missing the "${label}" link to ${href}`,
      );
    }
  }

  if (!html.includes('class="search-trigger"') || !/>Find<\/span>/.test(html)) {
    problems.push(`${file}: header is missing the Find palette`);
  }

  if (navBlock.includes('>Rules<') || navBlock.includes('>Philosophy<')) {
    problems.push(`${file}: header still links to Rules or Philosophy`);
  }

  if (
    file !== 'index.html' &&
    file !== '404.html' &&
    !html.includes('<nav class="breadcrumb"')
  ) {
    problems.push(`${file}: page is missing a breadcrumb`);
  }

  if (!/<meta\s+name="color-scheme"\s+content="dark"\s*\/?>/.test(html)) {
    problems.push(`${file}: page is missing the dark colour-scheme hint`);
  }

  if (!/<html[^>]*\sdata-catalog="(?:expanded|collapsed)"/.test(html)) {
    problems.push(`${file}: page is missing the catalog rail state`);
  }
  if (!/class="rail-toggle(?:"|\s)/.test(html)) {
    problems.push(`${file}: page is missing the catalog rail toggle`);
  }
  if (!html.includes('class="back-to-top"')) {
    problems.push(`${file}: page is missing the back-to-top control`);
  }

  if (html.includes('zoom-trigger') || html.includes('zoom-dialog')) {
    problems.push(`${file}: the full-size card viewer must be gone`);
  }

  if (
    /^(docs|blog)\//.test(file) ||
    file === 'docs/index.html' ||
    file === 'blog/index.html'
  ) {
    // The docs/blog navigation lives in the catalog rail now, and the switcher
    // is its entry point. Match the class *token*, not the whole attribute, so
    // a later modifier class cannot silently retire this gate.
    if (!/class="reading-switch(?:"|\s)/.test(html)) {
      problems.push(`${file}: reading page is missing the docs/blog switcher`);
    }
    if (!html.includes('class="reading-shell')) {
      problems.push(`${file}: reading page is missing the reading shell`);
    }
  }

  const cardPreviewCount = (html.match(/data-card-preview="/g) ?? []).length;
  // Astro serialises an empty-string attribute as the bare boolean form
  // (`data-card-keywords` with no `="..."`), so match both shapes.
  const cardKeywordsCount = (
    html.match(/data-card-keywords(?:="[^"]*")?[\s>]/g) ?? []
  ).length;
  if (cardPreviewCount > 0 && cardKeywordsCount < cardPreviewCount) {
    problems.push(`${file}: card preview triggers must carry keyword data`);
  }

  if (/^(archetypes|sections)\//.test(file)) {
    if (html.includes('class="day-group"')) {
      problems.push(`${file}: gallery must not group by date`);
    }

    const heroArtMatch = html.match(
      /<div class="catalog-hero-art"[\s\S]*?<\/div>/,
    );
    const heroArtBlock = heroArtMatch ? heroArtMatch[0] : '';
    const heroImgMatch = heroArtBlock.match(/<img[^>]*\ssrc="([^"]*)"/);
    const heroImgSrc = heroImgMatch ? heroImgMatch[1] : '';
    const sectionHeroRe = new RegExp(`^${base}art/[a-z0-9-]+-hero\\.webp$`);
    if (!sectionHeroRe.test(heroImgSrc)) {
      problems.push(`${file}: hero art must use the section hero image`);
    }
  }

  if (file === 'index.html') {
    if (
      !html.includes('The Yu-Gi-Oh! Feel.') ||
      !html.includes('With Magic Rules.')
    ) {
      problems.push(`${file}: hero headline copy changed`);
    }

    if (
      !html.includes(
        'Explore the Essentia project. Discover the best Yu-Gi-Oh has to offer within MTG game system.',
      )
    ) {
      problems.push(`${file}: hero lead copy changed`);
    }

    const heroActionsMatch = html.match(
      /<div class="hero-actions"[\s\S]*?<\/div>/,
    );
    const heroActionsBlock = heroActionsMatch ? heroActionsMatch[0] : '';
    const heroCtaHref = `${base}docs/`;
    if (
      !heroActionsBlock.includes(`href="${heroCtaHref}"`) ||
      !heroActionsBlock.includes('>Learn about Essentia<')
    ) {
      problems.push(
        `${file}: hero CTA must be "Learn about Essentia" pointing at <base>docs/`,
      );
    }

    const heroArtMatch = html.match(/<img class="hero-art"[^>]*>/);
    const heroArtTag = heroArtMatch ? heroArtMatch[0] : '';
    const srcMatch = heroArtTag.match(/src="([^"]*)"/);
    const heroArtSrc = srcMatch ? srcMatch[1] : '';
    const heroArtRe = new RegExp(`^${base}art/[a-z0-9-]+-hero\\.webp$`);
    if (!heroArtRe.test(heroArtSrc)) {
      problems.push(`${file}: hero art must use the section hero image`);
    }

    const newCardsMatch = html.match(
      /<section[^>]*aria-labelledby="new-cards-heading"[^>]*>[\s\S]*?<\/section>/,
    );
    const newCardsBlock = newCardsMatch ? newCardsMatch[0] : '';
    // Fail closed: a missing container used to silence every rule below it,
    // so deleting the section outright passed the gate.
    if (!newCardsBlock) {
      problems.push(`${file}: home page is missing the new-cards section`);
    } else {
      const cardCount = (
        newCardsBlock.match(/<li class="new-card-item"/g) ?? []
      ).length;
      if (cardCount !== 15) {
        problems.push(`${file}: new-cards section must show 15 cards`);
      }

      const updatesLinkRe = new RegExp(
        `<a href="${base}updates/"[^>]*>View all \\d+ new cards<`,
      );
      if (!updatesLinkRe.test(newCardsBlock)) {
        problems.push(
          `${file}: new-cards section must link "View all N new cards"`,
        );
      }
    }

    if (html.includes('new-card-carousel')) {
      problems.push(`${file}: the new-card carousel must be gone`);
    }

    if (!/<h2 id="catalog-heading"[^>]*>Archetypes<\/h2>/.test(html)) {
      problems.push(`${file}: section grid must be titled "Archetypes"`);
    }

    if (
      html.includes('Published sections') ||
      html.includes('Current card versions selected from lifecycle metadata.')
    ) {
      problems.push(`${file}: the "Published sections" copy must be gone`);
    }

    const tileArtRe = new RegExp(`^${base}art/[a-z0-9-]+-hero\\.webp$`);
    const tileBlocks =
      html.match(/<a class="section-tile"[\s\S]*?<\/a>/g) ?? [];
    // Fail closed: zero tiles is the regression, not a vacuous pass.
    if (!tileBlocks.length) {
      problems.push(
        `${file}: home page is missing the archetype section tiles`,
      );
    }
    for (const tile of tileBlocks) {
      const tileSrcMatch = tile.match(/<img[^>]*src="([^"]*)"/);
      const tileSrc = tileSrcMatch ? tileSrcMatch[1] : '';
      if (!tileArtRe.test(tileSrc)) {
        problems.push(`${file}: section tiles must use the hero art`);
        break;
      }
    }
  }

  const footerMatch = html.match(
    /<footer class="site-footer">[\s\S]*?<\/footer>/,
  );
  const footerBlock = footerMatch ? footerMatch[0] : '';
  // Fail closed: every page but the 404 stub carries the footer, so a miss
  // means the footer was removed or its class changed — not that the rule is
  // inapplicable.
  if (!footerBlock) {
    problems.push(`${file}: page is missing the site footer`);
  } else {
    const navIndex = footerBlock.indexOf('<nav aria-label="Footer"');
    const licenceIndex = footerBlock.indexOf(
      'Everything created for this project',
    );
    if (navIndex !== -1 && licenceIndex !== -1 && navIndex > licenceIndex) {
      problems.push(
        `${file}: the licence line must sit under the footer links`,
      );
    }
    if (!footerBlock.includes('class="legal-line"')) {
      problems.push(
        `${file}: the licence line must carry the legal-line class`,
      );
    }
  }

  problems.push(...reminderIssues(file, html));

  return problems;
}

/**
 * Card pages resolve each bold keyword phrase in their rules text against the
 * page's own `#keyword-rulings` map and append a `(ruling)` reminder span.
 * That wiring is one optional `definitions` prop away from silently becoming a
 * no-op, and nothing else in the build would notice — so assert the output
 * directly: a bold phrase that resolves to a term in the map must be followed
 * by a reminder.
 */
function reminderIssues(file, html) {
  if (!/^cards\//.test(file)) return [];

  const rulesMatch = html.match(/<div class="rules-text"[^>]*>[\s\S]*?<\/div>/);
  if (!rulesMatch) return [`${file}: card page is missing its rules text`];

  const rulingsMatch = html.match(
    /<script type="application\/json" id="keyword-rulings">([\s\S]*?)<\/script>/,
  );
  if (!rulingsMatch)
    return [`${file}: card page is missing the keyword ruling map`];

  let terms;
  try {
    terms = new Set(Object.keys(JSON.parse(rulingsMatch[1])));
  } catch {
    return [`${file}: keyword ruling map is not valid JSON`];
  }
  // Fail closed: an empty map would make every assertion below vacuous, which
  // is exactly the shape of the regression this rule exists to catch.
  if (!terms.size) return [`${file}: keyword ruling map is empty`];

  const problems = [];
  for (const match of rulesMatch[0].matchAll(
    /<strong>([\s\S]*?)<\/strong>((?:<span class="reminder">)?)/g,
  )) {
    const phrase = unescapeHtml(
      match[1]
        .replace(/<[^>]*>/g, '')
        .replace(/\s+/g, ' ')
        .trim(),
    );
    if (!phrase) continue;
    const resolves = splitComposite(phrase)
      .map(normalizeKeyword)
      .some((term) => terms.has(term));
    if (resolves && !match[2]) {
      problems.push(
        `${file}: keyword "${phrase}" must carry an inline reminder`,
      );
    }
  }
  return problems;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const dist = path.resolve('dist');
  const base = process.env.BASE_PATH ?? '/';

  const walk = async (dir) => {
    const entries = await readdir(dir, { withFileTypes: true });
    const files = [];
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) files.push(...(await walk(full)));
      else if (entry.name.endsWith('.html')) files.push(full);
    }
    return files;
  };

  const files = await walk(dist);
  const problems = [];
  for (const file of files) {
    const html = await readFile(file, 'utf8');
    const relative = path.relative(dist, file);
    problems.push(...chromeIssues(relative, html, base));
  }

  if (problems.length) throw new Error(problems.join('\n'));
  process.stdout.write(`chrome: ${files.length} pages carry the site header\n`);
}

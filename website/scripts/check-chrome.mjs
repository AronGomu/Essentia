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
 * True when `html` carries `token` as a whole class token, wherever it sits in
 * the attribute. `class="nav-block reading-switch"` and `class="reading-switch
 * reading-switch--wide"` both count; `class="reading-switcheroo"` does not.
 *
 * The earlier regexes only tolerated a *trailing* modifier, so a leading one
 * silently retired the gate they guarded.
 */
function hasClassToken(html, token) {
  return new RegExp(`class="(?:[^"]*\\s)?${token}(?:\\s[^"]*)?"`).test(html);
}

/** Every `href="…"` value inside a markup block, in document order. */
function hrefsIn(block) {
  return [...block.matchAll(/href="([^"]*)"/g)].map((match) => match[1]);
}

/**
 * @param {string} file dist-relative path, e.g. 'index.html'
 * @param {string} html
 * @param {string} base
 * @param {{preview: Iterable<string>, reminder: Iterable<string>} | null} keywords
 *   the published keyword registry, split by flag. Required for any page that
 *   carries the `#keyword-rulings` island — which is every real page.
 * @returns {string[]} problems for this page
 */
export function chromeIssues(file, html, base, keywords = null) {
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
  if (!hasClassToken(html, 'rail-toggle')) {
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
    // a modifier class in *either* position cannot silently retire this gate.
    if (!hasClassToken(html, 'reading-switch')) {
      problems.push(`${file}: reading page is missing the docs/blog switcher`);
    }
    if (!html.includes('class="reading-shell')) {
      problems.push(`${file}: reading page is missing the reading shell`);
    }
    problems.push(...mobileReadingNavIssues(file, html));
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

  problems.push(...keywordRulingIssues(file, html, keywords));
  problems.push(...reminderIssues(file, html, keywords));

  return problems;
}

/**
 * The desktop rail is `display: none` below 64rem, so on a phone the drawer is
 * the *only* reading navigation there is. It once shipped catalog-only, which
 * left a visitor on `/docs/rules/zones/` with no route to any other doc.
 * Assert the drawer offers every destination the rail does, on every reading
 * page.
 */
function mobileReadingNavIssues(file, html) {
  const railMatch = html.match(/<nav id="desktop-catalog"[\s\S]*?<\/nav>/);
  if (!railMatch)
    return [`${file}: reading page is missing the desktop catalog rail`];
  const drawerMatch = html.match(
    /<dialog class="mobile-drawer"[\s\S]*?<\/dialog>/,
  );
  if (!drawerMatch)
    return [`${file}: reading page is missing the mobile catalog drawer`];

  const drawer = drawerMatch[0];
  const problems = [];
  if (!hasClassToken(drawer, 'reading-switch')) {
    problems.push(
      `${file}: the mobile drawer is missing the docs/blog switcher`,
    );
  }

  const offered = new Set(hrefsIn(drawer));
  const missing = hrefsIn(railMatch[0]).filter((href) => !offered.has(href));
  if (missing.length) {
    problems.push(
      `${file}: the mobile drawer is missing ${missing.length} reading destination(s) the rail offers, starting with ${missing[0]}`,
    );
  }
  return problems;
}

/** Parse the page's `#keyword-rulings` island, or say why it cannot be read. */
function readRulingMap(file, html) {
  const match = html.match(
    /<script type="application\/json" id="keyword-rulings">([\s\S]*?)<\/script>/,
  );
  if (!match)
    return { problems: [`${file}: page is missing the keyword ruling map`] };
  try {
    return { terms: new Set(Object.keys(JSON.parse(match[1]))) };
  } catch {
    return { problems: [`${file}: keyword ruling map is not valid JSON`] };
  }
}

/**
 * The island the gallery hover box reads must hold exactly the `preview` terms.
 * Widening the filter ships rulings nobody previews; narrowing it leaves
 * gallery links advertising `data-card-keywords` the hover box renders empty —
 * and neither shape failed anything before this rule existed.
 */
function keywordRulingIssues(file, html, keywords) {
  if (!html.includes('id="keyword-rulings"')) return [];
  if (!keywords)
    return [`${file}: the chrome gate ran without the keyword registry`];

  const { terms, problems } = readRulingMap(file, html);
  if (!terms) return problems;

  const expected = new Set(keywords.preview);
  const missing = [...expected].filter((term) => !terms.has(term)).sort();
  const extra = [...terms].filter((term) => !expected.has(term)).sort();
  const issues = [];
  if (missing.length)
    issues.push(
      `${file}: the keyword ruling map is missing ${missing.length} previewed term(s), starting with "${missing[0]}"`,
    );
  if (extra.length)
    issues.push(
      `${file}: the keyword ruling map publishes ${extra.length} non-previewed term(s), starting with "${extra[0]}"`,
    );
  return issues;
}

/**
 * Card pages resolve each bold keyword phrase in their rules text against
 * `reminderDefinitions()` and append a `(ruling)` reminder span. That wiring is
 * one optional `definitions` prop away from silently becoming a no-op, and
 * nothing else in the build would notice — so assert the output directly.
 *
 * Both directions, and against the `reminder` set rather than the page's own
 * `preview` island: judging by the island made the gate fail *open*, because
 * the 20 terms that are `reminder: true, preview: false` were then checked by
 * nothing at all. The negative direction is what catches a route that renders
 * reminders for terms the card face never prints one for — the card and version
 * routes of the same card must agree.
 */
function reminderIssues(file, html, keywords) {
  if (!/^cards\//.test(file)) return [];

  const rulesMatch = html.match(/<div class="rules-text"[^>]*>[\s\S]*?<\/div>/);
  if (!rulesMatch) return [`${file}: card page is missing its rules text`];

  if (!keywords)
    return [`${file}: the chrome gate ran without the keyword registry`];

  const { terms: published, problems } = readRulingMap(file, html);
  if (!published) return problems;
  // Fail closed: an empty island would mean the layout stopped publishing the
  // hover map, which is exactly the shape of the regression this rule exists
  // to catch. `keywordRulingIssues` compares its contents; this only insists
  // it is not vacuous.
  if (!published.size) return [`${file}: keyword ruling map is empty`];

  const reminders = new Set(keywords.reminder);
  if (!reminders.size)
    return [`${file}: the keyword registry declares no reminder terms`];

  const issues = [];
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
    const parts = splitComposite(phrase).map(normalizeKeyword);
    const resolves = parts.some((term) => reminders.has(term));
    if (resolves && !match[2]) {
      issues.push(`${file}: keyword "${phrase}" must carry an inline reminder`);
    } else if (!resolves && match[2]) {
      issues.push(
        `${file}: keyword "${phrase}" prints no reminder and must not carry one`,
      );
    }
  }
  return issues;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const dist = path.resolve(process.env.OUT_DIR ?? 'dist');
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

  const { loadKeywordRegistry } = await import('./content/keywords.mjs');
  const registry = [...(await loadKeywordRegistry()).values()];
  const keywords = {
    preview: registry.filter((k) => k.preview).map((k) => k.term),
    reminder: registry.filter((k) => k.reminder).map((k) => k.term),
  };

  const files = await walk(dist);
  const problems = [];
  for (const file of files) {
    const html = await readFile(file, 'utf8');
    const relative = path.relative(dist, file);
    problems.push(...chromeIssues(relative, html, base, keywords));
  }

  if (problems.length) throw new Error(problems.join('\n'));
  process.stdout.write(`chrome: ${files.length} pages carry the site header\n`);
}

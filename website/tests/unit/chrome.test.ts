import { describe, expect, it } from 'vitest';
import { chromeIssues } from '../../scripts/check-chrome.mjs';

const compliantHtml = `
<header class="site-header">
  <nav class="utility-nav" aria-label="Sections">
    <a href="/docs/">Learn about Essentia</a>
    <a href="/blog/">Blog</a>
    <a href="/decks/">Decks</a>
  </nav>
</header>
<img class="hero-art" src="/art/nekroz-hero.webp" alt="" />
<h1>The Yu-Gi-Oh! Feel.<br />With Magic Rules.</h1>
<p>Explore the Essentia project. Discover the best Yu-Gi-Oh has to offer within MTG game system.</p>
<div class="hero-actions">
  <a class="primary-link" href="/docs/">Learn about Essentia</a>
  <a class="secondary-link" href="/updates/">See what changed</a>
</div>
<h2 id="catalog-heading">Archetypes</h2>
<a class="section-tile" href="/sections/nekroz/">
  <img src="/art/nekroz-hero.webp" alt="" />
</a>
`;

describe('chromeIssues', () => {
  it('accepts a compliant header', () => {
    expect(chromeIssues('index.html', compliantHtml, '/')).toEqual([]);
  });

  it('flags a missing Decks link', () => {
    const html = `
<nav class="utility-nav" aria-label="Sections">
  <a href="/docs/">Learn about Essentia</a>
  <a href="/blog/">Blog</a>
</nav>
`;
    const issues = chromeIssues('index.html', html, '/');
    expect(
      issues.some((issue) =>
        issue.includes('header is missing the "Decks" link to /decks/'),
      ),
    ).toBe(true);
  });

  it('flags a leftover Rules link', () => {
    const html = `
<nav class="utility-nav" aria-label="Sections">
  <a href="/docs/">Learn about Essentia</a>
  <a href="/blog/">Blog</a>
  <a href="/decks/">Decks</a>
  <a href="/rules/">Rules</a>
</nav>
`;
    const issues = chromeIssues('index.html', html, '/');
    expect(
      issues.some((issue) =>
        issue.includes('header still links to Rules or Philosophy'),
      ),
    ).toBe(true);
  });

  it('honours a subpath base', () => {
    const html = `
<nav class="utility-nav" aria-label="Sections">
  <a href="/YGO-x-MTG/docs/">Learn about Essentia</a>
  <a href="/YGO-x-MTG/blog/">Blog</a>
  <a href="/YGO-x-MTG/decks/">Decks</a>
</nav>
<img class="hero-art" src="/YGO-x-MTG/art/nekroz-hero.webp" alt="" />
<h1>The Yu-Gi-Oh! Feel.<br />With Magic Rules.</h1>
<p>Explore the Essentia project. Discover the best Yu-Gi-Oh has to offer within MTG game system.</p>
<div class="hero-actions">
  <a class="primary-link" href="/YGO-x-MTG/docs/">Learn about Essentia</a>
  <a class="secondary-link" href="/YGO-x-MTG/updates/">See what changed</a>
</div>
<h2 id="catalog-heading">Archetypes</h2>
<a class="section-tile" href="/YGO-x-MTG/sections/nekroz/">
  <img src="/YGO-x-MTG/art/nekroz-hero.webp" alt="" />
</a>
`;
    expect(chromeIssues('index.html', html, '/YGO-x-MTG/')).toEqual([]);
  });

  it('exempts the 404 document', () => {
    expect(chromeIssues('404.html', '<html></html>', '/')).toEqual([]);
  });

  it('accepts a page with a breadcrumb', () => {
    const issues = chromeIssues(
      'rules/index.html',
      '<nav class="breadcrumb">…</nav>',
      '/',
    );
    expect(
      issues.some((issue) => issue.includes('page is missing a breadcrumb')),
    ).toBe(false);
  });

  it('flags a page without one', () => {
    const issues = chromeIssues('rules/index.html', '<html></html>', '/');
    expect(
      issues.some((issue) => issue.includes('page is missing a breadcrumb')),
    ).toBe(true);
  });

  it('exempts the home page', () => {
    const issues = chromeIssues('index.html', '<html></html>', '/');
    expect(
      issues.some((issue) => issue.includes('page is missing a breadcrumb')),
    ).toBe(false);
  });

  it('exempts the 404 document from the breadcrumb rule', () => {
    expect(chromeIssues('404.html', '<html></html>', '/')).toEqual([]);
  });

  const compliantHomeHtml = `
<header class="site-header">
  <nav class="utility-nav" aria-label="Sections">
    <a href="/docs/">Learn about Essentia</a>
    <a href="/blog/">Blog</a>
    <a href="/decks/">Decks</a>
  </nav>
</header>
<img class="hero-art" src="/art/nekroz-hero.webp" alt="" />
<h1>The Yu-Gi-Oh! Feel.<br />With Magic Rules.</h1>
<p>Explore the Essentia project. Discover the best Yu-Gi-Oh has to offer within MTG game system.</p>
<div class="hero-actions">
  <a class="primary-link" href="/docs/">Learn about Essentia</a>
  <a class="secondary-link" href="/updates/">See what changed</a>
</div>
<h2 id="catalog-heading">Archetypes</h2>
<a class="section-tile" href="/sections/nekroz/">
  <img src="/art/nekroz-hero.webp" alt="" />
</a>
`;

  it('accepts the new hero copy', () => {
    expect(chromeIssues('index.html', compliantHomeHtml, '/')).toEqual([]);
  });

  it('flags reworded headline', () => {
    const html = compliantHomeHtml.replace(
      'The Yu-Gi-Oh! Feel.',
      'Yu-Gi-Oh! feel.',
    );
    const issues = chromeIssues('index.html', html, '/');
    expect(
      issues.some((issue) => issue.includes('hero headline copy changed')),
    ).toBe(true);
  });

  it('flags a stale CTA', () => {
    const html = compliantHomeHtml.replace(
      '<div class="hero-actions">\n  <a class="primary-link" href="/docs/">Learn about Essentia</a>',
      '<div class="hero-actions">\n  <a class="primary-link" href="/sections/non-archetype/non-archetype/">Explore Non-archetype</a>',
    );
    const issues = chromeIssues('index.html', html, '/');
    expect(
      issues.some((issue) =>
        issue.includes('hero CTA must be "Learn about Essentia"'),
      ),
    ).toBe(true);
  });

  it('flags a thumb-tier hero image', () => {
    const html = compliantHomeHtml.replace(
      'src="/art/nekroz-hero.webp"',
      'src="/generated/releases/nekroz-thumb.webp"',
    );
    const issues = chromeIssues('index.html', html, '/');
    expect(
      issues.some((issue) =>
        issue.includes('hero art must use the section hero image'),
      ),
    ).toBe(true);
  });

  it('ignores non-home pages', () => {
    const issues = chromeIssues('rules/index.html', '<html></html>', '/');
    expect(
      issues.some(
        (issue) =>
          issue.includes('hero headline copy changed') ||
          issue.includes('hero lead copy changed') ||
          issue.includes('hero CTA must be') ||
          issue.includes('hero art must use the section hero image'),
      ),
    ).toBe(false);
  });

  const newCardsSection = (items: number, linkText: string) => `
<section aria-labelledby="new-cards-heading">
${Array.from({ length: items }, () => '<li class="new-card-item"></li>').join(
  '\n',
)}
<p class="new-card-more"><a href="/updates/">${linkText}</a></p>
</section>
`;

  it('accepts a compliant home grid', () => {
    const html =
      compliantHomeHtml + newCardsSection(15, 'View all 50 new cards');
    expect(chromeIssues('index.html', html, '/')).toEqual([]);
  });

  it('flags a 12-card grid', () => {
    const html =
      compliantHomeHtml + newCardsSection(12, 'View all 50 new cards');
    const issues = chromeIssues('index.html', html, '/');
    expect(
      issues.some((issue) =>
        issue.includes('new-cards section must show 15 cards'),
      ),
    ).toBe(true);
  });

  it('flags a leftover carousel class', () => {
    const html =
      compliantHomeHtml +
      `
<section aria-labelledby="new-cards-heading">
<ul class="new-card-carousel">
${Array.from({ length: 15 }, () => '<li class="new-card-item"></li>').join(
  '\n',
)}
</ul>
<p class="new-card-more"><a href="/updates/">View all 50 new cards</a></p>
</section>
`;
    const issues = chromeIssues('index.html', html, '/');
    expect(
      issues.some((issue) =>
        issue.includes('the new-card carousel must be gone'),
      ),
    ).toBe(true);
  });

  it('flags a generic updates link', () => {
    const html = compliantHomeHtml + newCardsSection(15, 'View all updates');
    const issues = chromeIssues('index.html', html, '/');
    expect(
      issues.some((issue) =>
        issue.includes('new-cards section must link "View all N new cards"'),
      ),
    ).toBe(true);
  });

  const archetypeTile = `
<a class="section-tile" href="/sections/nekroz/">
  <img src="/art/nekroz-hero.webp" alt="" />
</a>
`;

  it('accepts the new heading', () => {
    const html =
      compliantHomeHtml +
      `<h2 id="catalog-heading">Archetypes</h2>` +
      archetypeTile;
    expect(chromeIssues('index.html', html, '/')).toEqual([]);
  });

  it('flags the old heading', () => {
    const html =
      compliantHomeHtml +
      `<h2 id="catalog-heading">Published sections</h2><p>Current card versions selected from lifecycle metadata.</p>` +
      archetypeTile;
    const issues = chromeIssues('index.html', html, '/');
    expect(
      issues.some((issue) =>
        issue.includes('the "Published sections" copy must be gone'),
      ),
    ).toBe(true);
  });

  it('flags a thumb-tier tile image', () => {
    const html =
      compliantHomeHtml +
      `<h2 id="catalog-heading">Archetypes</h2>` +
      `
<a class="section-tile" href="/sections/nekroz/">
  <img src="/generated/releases/nekroz-thumb.webp" alt="" />
</a>
`;
    const issues = chromeIssues('index.html', html, '/');
    expect(
      issues.some((issue) =>
        issue.includes('section tiles must use the hero art'),
      ),
    ).toBe(true);
  });

  const compliantGalleryHtml = `
<header class="site-header">
  <nav class="utility-nav" aria-label="Sections">
    <a href="/docs/">Learn about Essentia</a>
    <a href="/blog/">Blog</a>
    <a href="/decks/">Decks</a>
  </nav>
  <nav class="breadcrumb" aria-label="Breadcrumb"><a href="/">Archive</a></nav>
</header>
<section class="catalog-hero">
  <div class="catalog-stats"><span>Latest release <strong>August 1, 2026</strong></span></div>
  <div class="catalog-hero-art">
    <img src="/art/nekroz-hero.webp" alt="" width="624" height="624" />
  </div>
</section>
<div class="card-grid">
  <a class="gallery-card" href="/cards/nekroz-brionac/"><span class="tile-badge">New</span></a>
</div>
`;

  it('accepts a flat gallery', () => {
    expect(
      chromeIssues('archetypes/nekroz/index.html', compliantGalleryHtml, '/'),
    ).toEqual([]);
  });

  it('flags a date-grouped gallery', () => {
    const html = compliantGalleryHtml.replace(
      '<div class="card-grid">',
      '<section class="day-group"><h2>August 3, 2026</h2><div class="card-grid">',
    );
    const issues = chromeIssues('archetypes/nekroz/index.html', html, '/');
    expect(
      issues.some((issue) => issue.includes('gallery must not group by date')),
    ).toBe(true);
  });

  it('flags a thumb-tier hero', () => {
    const html = compliantGalleryHtml.replace(
      'src="/art/nekroz-hero.webp"',
      'src="/generated/releases/nekroz-thumb.webp"',
    );
    const issues = chromeIssues('archetypes/nekroz/index.html', html, '/');
    expect(
      issues.some((issue) =>
        issue.includes('hero art must use the section hero image'),
      ),
    ).toBe(true);
  });

  it('applies the gallery rules to the non-archetype section page', () => {
    expect(
      chromeIssues(
        'sections/non-archetype/non-archetype/index.html',
        compliantGalleryHtml,
        '/',
      ),
    ).toEqual([]);
    const issues = chromeIssues(
      'sections/non-archetype/non-archetype/index.html',
      compliantGalleryHtml.replace('card-grid', 'day-group'),
      '/',
    );
    expect(
      issues.some((issue) => issue.includes('gallery must not group by date')),
    ).toBe(true);
  });
});

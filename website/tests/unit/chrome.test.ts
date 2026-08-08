import { describe, expect, it } from 'vitest';
import { chromeIssues } from '../../scripts/check-chrome.mjs';

const siteFooter = `
<footer class="site-footer">
  <nav aria-label="Footer">
    <a href="/legal/">Licence &amp; attribution</a>
  </nav>
  <p class="legal-line">Everything created for this project is free to use.</p>
</footer>
`;

const sectionTile = (base = '/') => `
<a class="section-tile" href="${base}sections/nekroz/">
  <img src="${base}art/nekroz-hero.webp" alt="" />
</a>
`;

const newCardsSection = (
  base = '/',
  items = 15,
  linkText = 'View all 50 new cards',
) => `
<section aria-labelledby="new-cards-heading">
${Array.from({ length: items }, () => '<li class="new-card-item"></li>').join(
  '\n',
)}
<p class="new-card-more"><a href="${base}updates/">${linkText}</a></p>
</section>
`;

/**
 * A genuinely compliant home page: header, hero, archetype heading, section
 * tiles, new-cards section and footer. Every one of those is a rule the gate
 * enforces, so the fixture has to carry all of them — an incomplete fixture is
 * what let three fail-open checks sit unnoticed (R4).
 */
const homePage = (base = '/') => `
<header class="site-header">
  <nav class="utility-nav" aria-label="Sections">
    <a href="${base}docs/">Learn about Essentia</a>
    <a href="${base}blog/">Blog</a>
    <a href="${base}decks/">Decks</a>
  </nav>
</header>
<img class="hero-art" src="${base}art/nekroz-hero.webp" alt="" />
<h1>The Yu-Gi-Oh! Feel.<br />With Magic Rules.</h1>
<p>Explore the Essentia project. Discover the best Yu-Gi-Oh has to offer within MTG game system.</p>
<div class="hero-actions">
  <a class="primary-link" href="${base}docs/">Learn about Essentia</a>
  <a class="secondary-link" href="${base}updates/">See what changed</a>
</div>
<h2 id="catalog-heading">Archetypes</h2>
${sectionTile(base)}
${newCardsSection(base)}
${siteFooter}
`;

const compliantHomeHtml = homePage('/');

describe('chromeIssues', () => {
  it('accepts a compliant header', () => {
    expect(chromeIssues('index.html', compliantHomeHtml, '/')).toEqual([]);
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
    expect(
      chromeIssues('index.html', homePage('/YGO-x-MTG/'), '/YGO-x-MTG/'),
    ).toEqual([]);
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

  it('accepts a compliant home grid', () => {
    expect(chromeIssues('index.html', compliantHomeHtml, '/')).toEqual([]);
  });

  it('flags a 12-card grid', () => {
    const html = compliantHomeHtml.replace(
      newCardsSection('/'),
      newCardsSection('/', 12),
    );
    const issues = chromeIssues('index.html', html, '/');
    expect(
      issues.some((issue) =>
        issue.includes('new-cards section must show 15 cards'),
      ),
    ).toBe(true);
  });

  it('flags a leftover carousel class', () => {
    const html = compliantHomeHtml.replace(
      newCardsSection('/'),
      `
<section aria-labelledby="new-cards-heading">
<ul class="new-card-carousel">
${Array.from({ length: 15 }, () => '<li class="new-card-item"></li>').join(
  '\n',
)}
</ul>
<p class="new-card-more"><a href="/updates/">View all 50 new cards</a></p>
</section>
`,
    );
    const issues = chromeIssues('index.html', html, '/');
    expect(
      issues.some((issue) =>
        issue.includes('the new-card carousel must be gone'),
      ),
    ).toBe(true);
  });

  it('flags a generic updates link', () => {
    const html = compliantHomeHtml.replace(
      newCardsSection('/'),
      newCardsSection('/', 15, 'View all updates'),
    );
    const issues = chromeIssues('index.html', html, '/');
    expect(
      issues.some((issue) =>
        issue.includes('new-cards section must link "View all N new cards"'),
      ),
    ).toBe(true);
  });

  it('R3/R4 flags a home page with the new-cards section deleted', () => {
    const html = compliantHomeHtml.replace(newCardsSection('/'), '');
    const issues = chromeIssues('index.html', html, '/');
    expect(issues.some((issue) => issue.includes('new-cards section'))).toBe(
      true,
    );
  });

  it('R3/R4 flags a renamed new-cards aria-labelledby', () => {
    const html = compliantHomeHtml.replace(
      'aria-labelledby="new-cards-heading"',
      'aria-labelledby="fresh-cards-heading"',
    );
    const issues = chromeIssues('index.html', html, '/');
    expect(issues.some((issue) => issue.includes('new-cards section'))).toBe(
      true,
    );
  });

  it('R3/R4 flags a home page with every section tile deleted', () => {
    const html = compliantHomeHtml.replace(sectionTile('/'), '');
    const issues = chromeIssues('index.html', html, '/');
    expect(issues.some((issue) => issue.includes('section tiles'))).toBe(true);
  });

  it('R3/R4 flags a page with no footer', () => {
    const html = compliantHomeHtml.replace(siteFooter, '');
    const issues = chromeIssues('index.html', html, '/');
    expect(issues.some((issue) => issue.includes('site footer'))).toBe(true);
  });

  it('R3/R4 flags a footer that grew a second class', () => {
    const html = compliantHomeHtml.replace(
      '<footer class="site-footer">',
      '<footer class="site-footer site-footer--wide">',
    );
    const issues = chromeIssues('index.html', html, '/');
    expect(issues.some((issue) => issue.includes('site footer'))).toBe(true);
  });

  it('R3/R4 flags a non-home page with no footer', () => {
    const issues = chromeIssues(
      'legal/index.html',
      '<nav class="breadcrumb">…</nav>',
      '/',
    );
    expect(issues.some((issue) => issue.includes('site footer'))).toBe(true);
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
${siteFooter}
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

describe('the full-size card viewer must be gone', () => {
  it('flags a leftover zoom trigger', () => {
    const issues = chromeIssues(
      'cards/x/index.html',
      '<button class="zoom-trigger">',
      '/',
    );
    expect(
      issues.some((issue) =>
        issue.includes('the full-size card viewer must be gone'),
      ),
    ).toBe(true);
  });

  it('accepts a card page without it', () => {
    const issues = chromeIssues(
      'cards/x/index.html',
      '<div class="card-transcription"><h1>Card</h1></div>',
      '/',
    );
    expect(
      issues.some((issue) =>
        issue.includes('the full-size card viewer must be gone'),
      ),
    ).toBe(false);
  });
});

describe('card preview triggers must carry keyword data', () => {
  it('flags a page whose triggers lack keyword data', () => {
    const html = '<a data-card-preview="/art/x.webp">X</a>';
    const issues = chromeIssues('index.html', html, '/');
    expect(
      issues.some((issue) =>
        issue.includes('card preview triggers must carry keyword data'),
      ),
    ).toBe(true);
  });

  it('accepts a page with both attributes', () => {
    const html =
      '<a data-card-preview="/art/x.webp" data-card-keywords="Bounce">X</a>';
    const issues = chromeIssues('index.html', html, '/');
    expect(
      issues.some((issue) =>
        issue.includes('card preview triggers must carry keyword data'),
      ),
    ).toBe(false);
  });

  it('accepts the Astro-collapsed boolean form of an empty attribute', () => {
    const html = '<a data-card-preview="/art/x.webp" data-card-keywords>X</a>';
    const issues = chromeIssues('index.html', html, '/');
    expect(
      issues.some((issue) =>
        issue.includes('card preview triggers must carry keyword data'),
      ),
    ).toBe(false);
  });
});

describe('R7 card pages must emit inline keyword reminders', () => {
  const cardPage = (reminder: boolean) => `
<nav class="utility-nav" aria-label="Sections">
  <a href="/docs/">Learn about Essentia</a>
  <a href="/blog/">Blog</a>
  <a href="/decks/">Decks</a>
</nav>
<nav class="breadcrumb">…</nav>
<div class="rules-text"><strong>Mill 3</strong>${
    reminder
      ? '<span class="reminder">(Put the top N cards into the graveyard.)</span>'
      : ''
  }.</div>
<script type="application/json" id="keyword-rulings">{"Mill N":"Put the top N cards into the graveyard."}</script>
${siteFooter}
`;

  it('accepts a card page whose keyword carries its reminder', () => {
    expect(chromeIssues('cards/x/index.html', cardPage(true), '/')).toEqual([]);
  });

  it('flags a card page whose keyword lost its reminder', () => {
    const issues = chromeIssues('cards/x/index.html', cardPage(false), '/');
    expect(
      issues.some((issue) =>
        issue.includes('keyword "Mill 3" must carry an inline reminder'),
      ),
    ).toBe(true);
  });

  it('flags a card page with no rules text at all', () => {
    const html = cardPage(true).replace(
      /<div class="rules-text">[\s\S]*?<\/div>/,
      '',
    );
    const issues = chromeIssues('cards/x/index.html', html, '/');
    expect(
      issues.some((issue) =>
        issue.includes('card page is missing its rules text'),
      ),
    ).toBe(true);
  });

  it('flags a card page with no keyword ruling map', () => {
    const html = cardPage(true).replace(
      /<script type="application\/json" id="keyword-rulings">[\s\S]*?<\/script>/,
      '',
    );
    const issues = chromeIssues('cards/x/index.html', html, '/');
    expect(issues.some((issue) => issue.includes('keyword ruling map'))).toBe(
      true,
    );
  });

  it('flags an empty keyword ruling map rather than passing vacuously', () => {
    const html = cardPage(false).replace(
      /(<script type="application\/json" id="keyword-rulings">)[\s\S]*?(<\/script>)/,
      '$1{}$2',
    );
    const issues = chromeIssues('cards/x/index.html', html, '/');
    expect(
      issues.some((issue) => issue.includes('keyword ruling map is empty')),
    ).toBe(true);
  });

  it('leaves a bold phrase that is not a registry keyword alone', () => {
    const html = cardPage(true).replace(
      '<strong>Mill 3</strong>',
      '<strong>Cost:</strong>',
    );
    expect(chromeIssues('cards/x/index.html', html, '/')).toEqual([]);
  });
});

describe('the footer legal line must sit under the footer links', () => {
  it('accepts links-then-licence order', () => {
    const html = `
<nav class="utility-nav" aria-label="Sections">
  <a href="/docs/">Learn about Essentia</a>
  <a href="/blog/">Blog</a>
  <a href="/decks/">Decks</a>
</nav>
<nav class="breadcrumb">…</nav>
<footer class="site-footer">
  <nav aria-label="Footer">
    <a href="/legal/">Licence & attribution</a>
  </nav>
  <p class="legal-line">Everything created for this project is free to use.</p>
</footer>
`;
    expect(chromeIssues('legal/index.html', html, '/')).toEqual([]);
  });

  it('flags the old order', () => {
    const html = `
<footer class="site-footer">
  <p class="legal-line">Everything created for this project is free to use.</p>
  <nav aria-label="Footer">
    <a href="/legal/">Licence & attribution</a>
  </nav>
</footer>
`;
    const issues = chromeIssues('index.html', html, '/');
    expect(
      issues.some((issue) =>
        issue.includes('the licence line must sit under the footer links'),
      ),
    ).toBe(true);
  });

  it('flags a missing class', () => {
    const html = `
<footer class="site-footer">
  <nav aria-label="Footer">
    <a href="/legal/">Licence & attribution</a>
  </nav>
  <p>Everything created for this project is free to use.</p>
</footer>
`;
    const issues = chromeIssues('index.html', html, '/');
    expect(
      issues.some((issue) => issue.includes('must carry the legal-line class')),
    ).toBe(true);
  });

  it('exempts the 404 document', () => {
    expect(chromeIssues('404.html', '<html></html>', '/')).toEqual([]);
  });
});

describe('every blog page ships a rail', () => {
  const utilityNav = `
<nav class="utility-nav" aria-label="Sections">
  <a href="/docs/">Learn about Essentia</a>
  <a href="/blog/">Blog</a>
  <a href="/decks/">Decks</a>
</nav>
`;

  const withReadingRail = `
${utilityNav}
<nav class="breadcrumb"></nav>
<div class="reading-shell reading-shell--no-toc">
  <nav class="reading-rail blog-rail"></nav>
  <article class="reading-body"><h1>Blog</h1></article>
</div>
${siteFooter}
`;

  const withoutReadingRail = `
${utilityNav}
<nav class="breadcrumb"></nav>
<div class="page-shell">
  <h1>Blog</h1>
</div>
${siteFooter}
`;

  it('accepts a blog index with the reading shell and rail', () => {
    const issues = chromeIssues('blog/index.html', withReadingRail, '/');
    expect(issues.filter((issue) => issue.includes('reading'))).toEqual([]);
  });

  it('flags a blog index missing the rail and shell', () => {
    const issues = chromeIssues('blog/index.html', withoutReadingRail, '/');
    expect(
      issues.some((issue) =>
        issue.includes('reading page is missing its rail'),
      ),
    ).toBe(true);
    expect(
      issues.some((issue) =>
        issue.includes('reading page is missing the reading shell'),
      ),
    ).toBe(true);
  });

  it('flags a docs page missing the rail and shell', () => {
    const issues = chromeIssues('docs/index.html', withoutReadingRail, '/');
    expect(
      issues.some((issue) =>
        issue.includes('reading page is missing its rail'),
      ),
    ).toBe(true);
  });
});

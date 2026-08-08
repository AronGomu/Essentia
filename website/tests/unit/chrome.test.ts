import { describe, expect, it } from 'vitest';
import { chromeIssues } from '../../scripts/check-chrome.mjs';

/**
 * The published keyword registry, split by flag, as `check-chrome.mjs` hands it
 * to the gate. `Counter` is the real shape that broke: `reminder: false`, so no
 * card face prints a reminder for it — and `preview: false`, so it never
 * reaches the hover map either. `Detach N` is the shape the old gate missed
 * entirely: a reminder term that is not previewed.
 */
const keywordRegistry = {
  preview: ['Mill N'],
  reminder: ['Mill N', 'Detach N'],
};

const siteFooter = `
<footer class="site-footer">
  <nav aria-label="Footer">
    <a href="/legal/">Licence &amp; attribution</a>
  </nav>
  <p class="legal-line">Everything created for this project is free to use.</p>
</footer>
`;

/** The header's Find palette trigger, as the Svelte island server-renders it. */
const findTrigger = `
<button class="search-trigger" aria-haspopup="dialog">
  <span aria-hidden="true">⌕</span><span>Find</span><kbd>⌘ K</kbd>
</button>
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
/** Every page carries these at the document level: the rail state on
 * `<html>` and the persistent toggle button. */
const railChrome = `
<html data-catalog="expanded">
<meta name="color-scheme" content="dark" />
<button class="rail-toggle" aria-expanded="true"></button>
<button class="back-to-top" type="button" hidden></button>
`;

const homePage = (base = '/') => `
${railChrome}
<header class="site-header">
  <nav class="utility-nav" aria-label="Sections">
    <a href="${base}docs/">Learn about Essentia</a>
    <a href="${base}blog/">Blog</a>
    <a href="${base}decks/">Decks</a>
  </nav>
  ${findTrigger}
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
${railChrome}
<header class="site-header">
  <nav class="utility-nav" aria-label="Sections">
    <a href="/docs/">Learn about Essentia</a>
    <a href="/blog/">Blog</a>
    <a href="/decks/">Decks</a>
  </nav>
  <nav class="breadcrumb" aria-label="Breadcrumb"><a href="/">Archive</a></nav>
  ${findTrigger}
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
${railChrome}
<nav class="utility-nav" aria-label="Sections">
  <a href="/docs/">Learn about Essentia</a>
  <a href="/blog/">Blog</a>
  <a href="/decks/">Decks</a>
</nav>
${findTrigger}
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
    expect(
      chromeIssues('cards/x/index.html', cardPage(true), '/', keywordRegistry),
    ).toEqual([]);
  });

  it('flags a card page whose keyword lost its reminder', () => {
    const issues = chromeIssues(
      'cards/x/index.html',
      cardPage(false),
      '/',
      keywordRegistry,
    );
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
    const issues = chromeIssues(
      'cards/x/index.html',
      html,
      '/',
      keywordRegistry,
    );
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
    const issues = chromeIssues(
      'cards/x/index.html',
      html,
      '/',
      keywordRegistry,
    );
    expect(issues.some((issue) => issue.includes('keyword ruling map'))).toBe(
      true,
    );
  });

  it('flags an empty keyword ruling map rather than passing vacuously', () => {
    const html = cardPage(false).replace(
      /(<script type="application\/json" id="keyword-rulings">)[\s\S]*?(<\/script>)/,
      '$1{}$2',
    );
    const issues = chromeIssues(
      'cards/x/index.html',
      html,
      '/',
      keywordRegistry,
    );
    expect(
      issues.some((issue) => issue.includes('keyword ruling map is empty')),
    ).toBe(true);
  });

  it('leaves a bold phrase that is not a registry keyword alone', () => {
    // No reminder span: the rule only fires on a phrase that resolves *and*
    // lost its reminder, so a page that already carries one makes the
    // resolution unreachable and the assertion tautological.
    const html = cardPage(false).replace(
      '<strong>Mill 3</strong>',
      '<strong>Cost:</strong>',
    );
    expect(
      chromeIssues('cards/x/index.html', html, '/', keywordRegistry),
    ).toEqual([]);
  });

  it('covers a reminder term the hover map never publishes', () => {
    // `Detach N` is `reminder: true, preview: false`. Judging by the page's own
    // `#keyword-rulings` island — which holds only the *preview* set — left 20
    // such terms asserted by nothing: the gate failed open.
    const html = cardPage(false).replace(
      '<strong>Mill 3</strong>',
      '<strong>Detach 2</strong>',
    );
    expect(
      chromeIssues('cards/x/index.html', html, '/', keywordRegistry),
    ).toContain(
      'cards/x/index.html: keyword "Detach 2" must carry an inline reminder',
    );
  });

  it('flags a route that reminds a term the card face never prints', () => {
    // The version route used to build its definitions from *every* catalog
    // keyword, so the same card rendered a `Counter` reminder there and none on
    // its card route.
    const html = cardPage(false).replace(
      '<strong>Mill 3</strong>',
      '<strong>Counter</strong><span class="reminder">(Cancel a spell.)</span>',
    );
    expect(
      chromeIssues('cards/x/index.html', html, '/', keywordRegistry),
    ).toContain(
      'cards/x/index.html: keyword "Counter" prints no reminder and must not carry one',
    );
  });

  it('refuses to judge a card page without the keyword registry', () => {
    // Fail closed: a caller that forgets the registry must not be told the page
    // is fine.
    expect(chromeIssues('cards/x/index.html', cardPage(true), '/')).toContain(
      'cards/x/index.html: the chrome gate ran without the keyword registry',
    );
  });

  it('flags a registry that declares no reminder terms at all', () => {
    expect(
      chromeIssues('cards/x/index.html', cardPage(true), '/', {
        preview: ['Mill N'],
        reminder: [],
      }),
    ).toContain(
      'cards/x/index.html: the keyword registry declares no reminder terms',
    );
  });
});

describe('the published keyword ruling map must hold exactly the preview set', () => {
  const page = (json: string) => `
${railChrome}
<nav class="utility-nav" aria-label="Sections">
  <a href="/docs/">Learn about Essentia</a>
  <a href="/blog/">Blog</a>
  <a href="/decks/">Decks</a>
</nav>
${findTrigger}
<nav class="breadcrumb">…</nav>
<script type="application/json" id="keyword-rulings">${json}</script>
${siteFooter}
`;

  it('accepts a map that matches the preview set', () => {
    const issues = chromeIssues(
      'updates/index.html',
      page('{"Mill N":"Send N cards from the top of your Deck to the Grave."}'),
      '/',
      keywordRegistry,
    );
    expect(issues.filter((issue) => issue.includes('ruling map'))).toEqual([]);
  });

  it('flags a map that lost a previewed term', () => {
    // Reverting the filter to `origin === 'essentia'` drops `Mill N` while 19
    // gallery links keep advertising it in `data-card-keywords` — the hover box
    // then renders empty, and nothing failed before this rule existed.
    const issues = chromeIssues(
      'updates/index.html',
      page('{}'),
      '/',
      keywordRegistry,
    );
    expect(issues).toContain(
      'updates/index.html: the keyword ruling map is missing 1 previewed term(s), starting with "Mill N"',
    );
  });

  it('flags a map that publishes a term nobody previews', () => {
    const issues = chromeIssues(
      'updates/index.html',
      page(
        '{"Mill N":"Send N cards.","Counter":"Cancel a spell or ability on the Stack."}',
      ),
      '/',
      keywordRegistry,
    );
    expect(issues).toContain(
      'updates/index.html: the keyword ruling map publishes 1 non-previewed term(s), starting with "Counter"',
    );
  });

  it('refuses to judge the map without the keyword registry', () => {
    expect(chromeIssues('updates/index.html', page('{}'), '/')).toContain(
      'updates/index.html: the chrome gate ran without the keyword registry',
    );
  });

  it('flags a map that is not valid JSON', () => {
    const issues = chromeIssues(
      'updates/index.html',
      page('{oops}'),
      '/',
      keywordRegistry,
    );
    expect(issues).toContain(
      'updates/index.html: keyword ruling map is not valid JSON',
    );
  });
});

describe('the footer legal line must sit under the footer links', () => {
  it('accepts links-then-licence order', () => {
    const html = `
${railChrome}
<nav class="utility-nav" aria-label="Sections">
  <a href="/docs/">Learn about Essentia</a>
  <a href="/blog/">Blog</a>
  <a href="/decks/">Decks</a>
</nav>
${findTrigger}
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

describe('every page ships the Find palette', () => {
  it('accepts a header carrying the Find trigger', () => {
    const issues = chromeIssues('index.html', compliantHomeHtml, '/');
    expect(issues.some((issue) => issue.includes('Find palette'))).toBe(false);
  });

  it('flags a header whose palette still says "Find a card"', () => {
    const html = compliantHomeHtml.replace(
      '<span>Find</span>',
      '<span>Find a card</span>',
    );
    const issues = chromeIssues('index.html', html, '/');
    expect(
      issues.some((issue) =>
        issue.includes('header is missing the Find palette'),
      ),
    ).toBe(true);
  });

  it('flags a header with no palette trigger at all', () => {
    const html = compliantHomeHtml.replace(findTrigger, '');
    const issues = chromeIssues('index.html', html, '/');
    expect(
      issues.some((issue) =>
        issue.includes('header is missing the Find palette'),
      ),
    ).toBe(true);
  });
});

describe('every page ships the dark colour-scheme hint', () => {
  it('flags a page without the colour-scheme hint', () => {
    const html = compliantHomeHtml.replace(
      '<meta name="color-scheme" content="dark" />',
      '',
    );
    const issues = chromeIssues('index.html', html, '/');
    expect(
      issues.some((issue) =>
        issue.includes('page is missing the dark colour-scheme hint'),
      ),
    ).toBe(true);
  });

  it('accepts a page with the hint', () => {
    const issues = chromeIssues('index.html', compliantHomeHtml, '/');
    expect(
      issues.some((issue) =>
        issue.includes('page is missing the dark colour-scheme hint'),
      ),
    ).toBe(false);
  });
});

describe('a browser-local deck must never reach a built page', () => {
  it('flags a page carrying a local deck key', () => {
    const html = compliantHomeHtml.replace(
      '<h2 id="catalog-heading">Archetypes</h2>',
      '<h2 id="catalog-heading">Archetypes</h2><li id="find-result-deck:local:u1">My Nekroz</li>',
    );
    const issues = chromeIssues('index.html', html, '/');
    expect(
      issues.some((issue) =>
        issue.includes('a browser-local deck leaked into the built page'),
      ),
    ).toBe(true);
  });

  it('leaves a published deck key alone', () => {
    const html = compliantHomeHtml.replace(
      '<h2 id="catalog-heading">Archetypes</h2>',
      '<h2 id="catalog-heading">Archetypes</h2><li id="find-result-deck:catalog:LOTA-0001:nekroz">Nekroz</li>',
    );
    expect(chromeIssues('index.html', html, '/')).toEqual([]);
  });

  it('flags a leak in the 404 document too', () => {
    // 404.html is exempt from the chrome rules because it is a redirect stub
    // with no header to check. The privacy gate is not a chrome rule and has
    // no exemption.
    const html =
      '<html><body><li id="find-result-deck:local:u1">My Nekroz</li></body></html>';
    expect(chromeIssues('404.html', html, '/')).toEqual([
      '404.html: a browser-local deck leaked into the built page',
    ]);
  });
});

describe('every reading page ships the docs/blog switcher', () => {
  const utilityNav = `
<nav class="utility-nav" aria-label="Sections">
  <a href="/docs/">Learn about Essentia</a>
  <a href="/blog/">Blog</a>
  <a href="/decks/">Decks</a>
</nav>
`;

  /** The reading destinations the rail offers, which the drawer must match. */
  const readingLinks = `
  <div class="reading-switch"><a href="/docs/">Docs</a><a href="/blog/">Blog</a></div>
  <ul>
    <li><a href="/docs/rules/zones/">Zones</a></li>
    <li><a href="/docs/glossary/">Glossary</a></li>
  </ul>
`;

  const readingRail = `
<nav id="desktop-catalog" class="desktop-catalog" aria-label="Documentation and blog">
${readingLinks}
</nav>
`;

  const readingDrawer = (body = readingLinks) => `
<dialog class="mobile-drawer" aria-labelledby="catalog-title">
  <div class="drawer-panel">
    <nav aria-label="Mobile documentation and blog">
${body}
    </nav>
  </div>
</dialog>
`;

  /** What the drawer shipped before P1.2: the card catalog, on a docs page. */
  const catalogOnlyDrawerBody = `
  <p class="nav-label">Archetypes</p>
  <ul><li><a href="/archetypes/nekroz/">Nekroz</a></li></ul>
`;

  const withReadingSwitch = `
${utilityNav}
<nav class="breadcrumb"></nav>
${readingRail}
${readingDrawer()}
<div class="reading-shell reading-shell--no-toc">
  <article class="reading-body"><h1>Blog</h1></article>
</div>
${siteFooter}
`;

  const withoutReadingSwitch = `
${utilityNav}
<nav class="breadcrumb"></nav>
<div class="page-shell">
  <h1>Blog</h1>
</div>
${siteFooter}
`;

  it('accepts a blog index with the reading shell and switcher', () => {
    const issues = chromeIssues('blog/index.html', withReadingSwitch, '/');
    expect(issues.filter((issue) => issue.includes('reading'))).toEqual([]);
  });

  it('flags a blog index missing the switcher and shell', () => {
    const issues = chromeIssues('blog/index.html', withoutReadingSwitch, '/');
    expect(
      issues.some((issue) =>
        issue.includes('reading page is missing the docs/blog switcher'),
      ),
    ).toBe(true);
    expect(
      issues.some((issue) =>
        issue.includes('reading page is missing the reading shell'),
      ),
    ).toBe(true);
  });

  it('flags a reading page without the switcher', () => {
    const issues = chromeIssues('docs/index.html', withoutReadingSwitch, '/');
    expect(issues).toContain(
      'docs/index.html: reading page is missing the docs/blog switcher',
    );
  });

  it('still accepts the switcher when it grows a modifier class', () => {
    // The gate matches the class token, not the whole attribute: a later
    // `class="reading-switch reading-switch--wide"` must not silently stop
    // being recognised the way an exact-string check would.
    const issues = chromeIssues(
      'docs/index.html',
      withReadingSwitch.replaceAll(
        'class="reading-switch"',
        'class="reading-switch reading-switch--wide"',
      ),
      '/',
    );
    expect(issues.filter((issue) => issue.includes('reading'))).toEqual([]);
  });

  it('rejects a lookalike class that only starts the same', () => {
    const issues = chromeIssues(
      'docs/index.html',
      withReadingSwitch.replaceAll(
        'class="reading-switch"',
        'class="reading-switcheroo"',
      ),
      '/',
    );
    expect(issues).toContain(
      'docs/index.html: reading page is missing the docs/blog switcher',
    );
  });

  it('still accepts the switcher when the modifier class comes first', () => {
    // The mirror of the case above. The old regex only tolerated a *trailing*
    // modifier, so `class="nav-block reading-switch"` retired the gate.
    const issues = chromeIssues(
      'docs/index.html',
      withReadingSwitch.replaceAll(
        'class="reading-switch"',
        'class="nav-block reading-switch"',
      ),
      '/',
    );
    expect(issues.filter((issue) => issue.includes('reading'))).toEqual([]);
  });

  it('flags a reading page whose drawer is still catalog-only', () => {
    // The T10 regression: below 64rem the rail is `display: none`, so a
    // catalog-only drawer leaves a phone visitor on a docs page with no route
    // to any other doc.
    const issues = chromeIssues(
      'docs/rules/zones/index.html',
      `${utilityNav}
<nav class="breadcrumb"></nav>
${readingRail}
${readingDrawer(catalogOnlyDrawerBody)}
<div class="reading-shell"><article class="reading-body"><h1>Zones</h1></article></div>
${siteFooter}
`,
      '/',
    );
    expect(issues).toContain(
      'docs/rules/zones/index.html: the mobile drawer is missing the docs/blog switcher',
    );
    expect(
      issues.some((issue) =>
        issue.includes(
          'the mobile drawer is missing 4 reading destination(s) the rail offers, starting with /docs/',
        ),
      ),
    ).toBe(true);
  });

  it('flags a reading page whose drawer drops a single doc', () => {
    const partialDrawer = readingDrawer(
      readingLinks.replace(
        '<li><a href="/docs/glossary/">Glossary</a></li>',
        '',
      ),
    );
    const issues = chromeIssues(
      'docs/index.html',
      `${utilityNav}
<nav class="breadcrumb"></nav>
${readingRail}
${partialDrawer}
<div class="reading-shell"><article class="reading-body"><h1>Docs</h1></article></div>
${siteFooter}
`,
      '/',
    );
    expect(issues).toContain(
      'docs/index.html: the mobile drawer is missing 1 reading destination(s) the rail offers, starting with /docs/glossary/',
    );
  });

  it('flags a reading page with no mobile drawer at all', () => {
    const issues = chromeIssues(
      'docs/index.html',
      withReadingSwitch.replace(
        /<dialog class="mobile-drawer"[\s\S]*?<\/dialog>/,
        '',
      ),
      '/',
    );
    expect(issues).toContain(
      'docs/index.html: reading page is missing the mobile catalog drawer',
    );
  });

  it('flags a reading page with no desktop rail at all', () => {
    const issues = chromeIssues(
      'docs/index.html',
      withReadingSwitch.replace(/<nav id="desktop-catalog"[\s\S]*?<\/nav>/, ''),
      '/',
    );
    expect(issues).toContain(
      'docs/index.html: reading page is missing the desktop catalog rail',
    );
  });
});

describe('every page ships the catalog rail state and toggle', () => {
  it('accepts a page carrying data-catalog and the toggle', () => {
    const issues = chromeIssues('index.html', compliantHomeHtml, '/');
    expect(issues.some((issue) => issue.includes('catalog rail'))).toBe(false);
  });

  it('flags a page whose <html> has no data-catalog attribute', () => {
    const html = compliantHomeHtml.replace(
      '<html data-catalog="expanded">',
      '<html>',
    );
    const issues = chromeIssues('index.html', html, '/');
    expect(
      issues.some((issue) =>
        issue.includes('page is missing the catalog rail state'),
      ),
    ).toBe(true);
  });

  it('accepts a rail toggle whose modifier class comes first', () => {
    // `class="chrome-btn rail-toggle"` was flagged as missing the toggle: the
    // old regex only tolerated a modifier *after* the token.
    const html = compliantHomeHtml.replace(
      'class="rail-toggle"',
      'class="chrome-btn rail-toggle"',
    );
    const issues = chromeIssues('index.html', html, '/');
    expect(issues.some((issue) => issue.includes('catalog rail toggle'))).toBe(
      false,
    );
  });

  it('accepts a rail toggle whose modifier class comes last', () => {
    const html = compliantHomeHtml.replace(
      'class="rail-toggle"',
      'class="rail-toggle rail-toggle--top"',
    );
    const issues = chromeIssues('index.html', html, '/');
    expect(issues.some((issue) => issue.includes('catalog rail toggle'))).toBe(
      false,
    );
  });

  it('rejects a lookalike toggle class that only starts the same', () => {
    const html = compliantHomeHtml.replace(
      'class="rail-toggle"',
      'class="rail-toggler"',
    );
    const issues = chromeIssues('index.html', html, '/');
    expect(
      issues.some((issue) =>
        issue.includes('page is missing the catalog rail toggle'),
      ),
    ).toBe(true);
  });

  it('flags a page with no rail-toggle button', () => {
    const html = compliantHomeHtml.replace(
      '<button class="rail-toggle" aria-expanded="true"></button>',
      '',
    );
    const issues = chromeIssues('index.html', html, '/');
    expect(
      issues.some((issue) =>
        issue.includes('page is missing the catalog rail toggle'),
      ),
    ).toBe(true);
  });

  it('flags a page with no back-to-top control', () => {
    const html = compliantHomeHtml.replace(
      '<button class="back-to-top" type="button" hidden></button>',
      '',
    );
    const issues = chromeIssues('index.html', html, '/');
    expect(
      issues.some((issue) =>
        issue.includes('page is missing the back-to-top control'),
      ),
    ).toBe(true);
  });

  it('exempts the 404 stub', () => {
    expect(chromeIssues('404.html', '<html></html>', '/')).toEqual([]);
  });
});

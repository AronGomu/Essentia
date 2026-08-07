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
});

import { describe, expect, it } from 'vitest';
import { headingSlug, renderSafeMarkdown } from '../../src/lib/markdown';

describe('authored Markdown renderer', () => {
  it('escapes HTML while rendering supported prose', () => {
    const html = renderSafeMarkdown(
      '## Intent\n\n**Safe** <script>alert(1)</script>',
    );
    expect(html).toContain('<h2 id="intent">Intent</h2>');
    expect(html).toContain('<strong>Safe</strong> &lt;script&gt;');
    expect(html).not.toContain('<script>');
  });
  it('prefixes internal links for repository-base deployments', () => {
    expect(
      renderSafeMarkdown('[Nekroz](/archetypes/nekroz/)', '/YGO-x-MTG/'),
    ).toContain('href="/YGO-x-MTG/archetypes/nekroz/"');
  });
  it('rejects unsafe URL schemes', () => {
    expect(() => renderSafeMarkdown('[bad](javascript:alert(1))')).toThrow(
      'Unsafe Markdown URL',
    );
  });
  it('still renders paragraphs and flat lists', () => {
    expect(renderSafeMarkdown('plain text')).toBe('<p>plain text</p>');
    expect(renderSafeMarkdown('- one\n- two')).toBe(
      '<ul><li>one</li><li>two</li></ul>',
    );
  });

  it('renders h1 through h4 with slugged ids', () => {
    expect(renderSafeMarkdown('# Project context')).toBe(
      '<h1 id="project-context">Project context</h1>',
    );
    expect(renderSafeMarkdown('#### Deep')).toContain(
      '<h4 id="deep">Deep</h4>',
    );
  });

  it('slugs punctuation out of ids', () => {
    expect(headingSlug('Open/locked lifecycle (v2)')).toBe(
      'open-locked-lifecycle-v2',
    );
    expect(renderSafeMarkdown('## Open/locked lifecycle (v2)')).toContain(
      'id="open-locked-lifecycle-v2"',
    );
  });

  it('renders ordered lists', () => {
    expect(renderSafeMarkdown('1. first\n2. second')).toBe(
      '<ol><li>first</li><li>second</li></ol>',
    );
  });

  it('nests one level of bullets', () => {
    expect(renderSafeMarkdown('- top\n  - child')).toBe(
      '<ul><li>top<ul><li>child</li></ul></li></ul>',
    );
  });

  it('renders fenced code without inline processing', () => {
    const html = renderSafeMarkdown('```text\n**Alternative Cost** — x\n```');
    expect(html).toContain('<pre><code>**Alternative Cost** — x</code></pre>');
    expect(html).not.toContain('<strong>');
  });

  it('throws on an unterminated fence', () => {
    expect(() => renderSafeMarkdown('```text\nabc')).toThrow(
      'Unterminated code fence',
    );
  });

  it('renders blockquotes', () => {
    expect(renderSafeMarkdown('> note')).toBe(
      '<blockquote><p>note</p></blockquote>',
    );
  });

  it('renders pipe tables with inline cells', () => {
    const html = renderSafeMarkdown(
      '| Term | Doc |\n| --- | --- |\n| **Mill N** | [x](/docs/) |',
    );
    expect(html).toContain('<th>Term</th>');
    expect(html).toContain('<strong>Mill N</strong>');
    expect(html).toContain('href="/docs/"');
  });

  it('renders a horizontal rule', () => {
    expect(renderSafeMarkdown('---')).toBe('<hr>');
  });

  it('still rejects unsafe URLs', () => {
    // Link-URL parsing itself is out of scope for this ticket (Requirements:
    // "Existing behaviour for ... links is unchanged"); the existing regex
    // does not capture a trailing ')' that is itself inside the URL, so the
    // thrown message reflects that pre-existing capture, not the raw input.
    expect(() => renderSafeMarkdown('[x](javascript:alert(1))')).toThrow(
      'Unsafe Markdown URL: javascript:alert(1',
    );
  });
});

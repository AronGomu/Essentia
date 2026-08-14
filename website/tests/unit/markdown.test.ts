import { describe, expect, it } from 'vitest';
import { headingSlug, renderSafeMarkdown } from '../../src/lib/markdown';
import {
  buildCardMentionIndex,
  lookupCardMention,
} from '../../src/lib/card-mentions';

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

  it('R1 keeps underscores literal inside a code span', () => {
    const html = renderSafeMarkdown('Use `cards_mse/00_drafts/` here', '/');
    expect(html).toContain('<code>cards_mse/00_drafts/</code>');
    expect(html).not.toContain('<em>');
  });

  it('R1 keeps underscores literal inside a link href and label', () => {
    // The corpus form: `rewriteDocLinks` has already turned the authored
    // `[`cards_mse/`](../cards_mse/)` into an absolute repository URL by the
    // time the renderer sees it. The relative form never reaches emphasis —
    // the URL allowlist rejects `../` first (asserted separately below).
    const html = renderSafeMarkdown(
      '[`cards_mse/`](https://github.com/AronGomu/YGO-x-MTG/blob/main/cards_mse/)',
      '/',
    );
    expect(html).toContain(
      'href="https://github.com/AronGomu/YGO-x-MTG/blob/main/cards_mse/"',
    );
    expect(html).toContain('<code>cards_mse/</code>');
    expect(html).not.toContain('<em>');
  });

  it('R1 keeps underscores literal in an internal link target', () => {
    const html = renderSafeMarkdown('[`a_b`](/docs/a_b/)', '/');
    expect(html).toContain('href="/docs/a_b/"');
    expect(html).not.toContain('<em>');
  });

  it('R1 rejects the pre-rewrite relative form outright', () => {
    expect(() =>
      renderSafeMarkdown('[`cards_mse/`](../cards_mse/)', '/'),
    ).toThrow('Unsafe Markdown URL: ../cards_mse/');
  });

  it('R1 keeps a snake_case identifier literal in prose', () => {
    const html = renderSafeMarkdown('a snake_case_name b', '/');
    expect(html).toContain('snake_case_name');
    expect(html).not.toContain('<em>');
  });

  it('R1 still renders genuine word-boundary emphasis', () => {
    expect(renderSafeMarkdown('an _emphasised_ word', '/')).toBe(
      '<p>an <em>emphasised</em> word</p>',
    );
  });

  it('R1 leaves strong markers inside a code span literal', () => {
    const html = renderSafeMarkdown('code `a**b**c` span', '/');
    expect(html).toContain('<code>a**b**c</code>');
    expect(html).not.toContain('<strong>');
  });

  it('R2 does not double-escape an ampersand in a link URL', () => {
    const html = renderSafeMarkdown('[S](https://example.com/?a=1&b=2)', '/');
    expect(html).toContain('href="https://example.com/?a=1&amp;b=2"');
    expect(html).not.toContain('&amp;amp;');
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

  it('renders an image', () => {
    const html = renderSafeMarkdown('![Trishula](/generated/x.webp)');
    expect(html).toContain(
      '<img class="md-image md-image-scale-100" src="/generated/x.webp" alt="Trishula" loading="lazy" decoding="async">',
    );
  });

  it('applies a percentage scale', () => {
    const html = renderSafeMarkdown('![Trishula|60%](/generated/x.webp)');
    expect(html).toContain('md-image-scale-60');
    expect(html).toContain('alt="Trishula"');
    expect(html).not.toContain('|60%');
  });

  it('prefixes the deployment base for an image', () => {
    const html = renderSafeMarkdown(
      '![Trishula|60%](/generated/x.webp)',
      '/YGO-x-MTG/',
    );
    expect(html).toContain('src="/YGO-x-MTG/generated/x.webp"');
  });

  it('does not linkify an image', () => {
    const html = renderSafeMarkdown('![x](/y.webp)');
    expect(html).not.toContain('<a');
    expect(html).not.toContain('!<img');
  });

  it('rejects an external image', () => {
    expect(() => renderSafeMarkdown('![x](https://example.com/y.png)')).toThrow(
      'Unsafe Markdown image URL',
    );
  });

  it('rejects a protocol-relative image', () => {
    expect(() => renderSafeMarkdown('![a](//evil.example/x.png)')).toThrow(
      'Unsafe Markdown image URL: //evil.example/x.png',
    );
  });

  it('rejects an unsupported scale', () => {
    expect(() => renderSafeMarkdown('![x|63%](/y.webp)')).toThrow(
      'Unsupported Markdown image scale',
    );
    expect(() => renderSafeMarkdown('![x|0%](/y.webp)')).toThrow(
      'Unsupported Markdown image scale',
    );
  });

  it('keeps a bang before a real link intact', () => {
    const html = renderSafeMarkdown('Wow! [link](/a/)');
    expect(html).toContain('<a href="/a/">link</a>');
    expect(html).toContain('Wow!');
  });
});

describe('card mentions in authored Markdown', () => {
  const cards = buildCardMentionIndex([
    {
      name: 'Burning Abyss - Graff',
      matchNames: ['Burning Abyss - Graff'],
      route: '/cards/burning-abyss-graff/',
      previewImage: '/generated/graff.webp',
      previewKeywords: ['Discard', 'Mill 1-4'],
    },
    {
      name: 'Ash Blossom & Joyous Spring',
      matchNames: ['Ash Blossom & Joyous Spring'],
      route: '/cards/ash-blossom-and-joyous-spring/',
      previewImage: '/generated/ash.webp',
      previewKeywords: [],
    },
  ]);
  const options = {
    resolveCard: (name: string) => lookupCardMention(cards, name),
  };
  const render = (value: string, base = '/') =>
    renderSafeMarkdown(value, base, options);

  it('links a mention with the gallery hover attributes', () => {
    const html = render('Open on [[Burning Abyss - Graff]] every game.');
    expect(html).toContain('href="/cards/burning-abyss-graff/"');
    expect(html).toContain('data-card-preview="/generated/graff.webp"');
    expect(html).toContain('data-card-keywords="Discard,Mill 1-4"');
    expect(html).toContain('class="card-mention"');
    expect(html).toContain('>Burning Abyss - Graff</a>');
  });

  it('resolves a mention written as the archetype title', () => {
    expect(render('[[Graff]]')).toContain('>Burning Abyss - Graff</a>');
  });

  it('prints the author’s display text after a pipe', () => {
    const html = render('[[Burning Abyss - Graff|the recruiter]]');
    expect(html).toContain('href="/cards/burning-abyss-graff/"');
    expect(html).toContain('>the recruiter</a>');
  });

  it('matches a name carrying an ampersand', () => {
    const html = render('[[Ash Blossom & Joyous Spring]]');
    expect(html).toContain('href="/cards/ash-blossom-and-joyous-spring/"');
    expect(html).toContain('>Ash Blossom &amp; Joyous Spring</a>');
  });

  it('prefixes mention URLs for repository-base deployments', () => {
    const based = buildCardMentionIndex(
      [
        {
          name: 'Burning Abyss - Graff',
          matchNames: ['Burning Abyss - Graff'],
          route: '/cards/burning-abyss-graff/',
          previewImage: '/generated/graff.webp',
          previewKeywords: [],
        },
      ],
      '/YGO-x-MTG/',
    );
    const html = renderSafeMarkdown('[[Graff]]', '/YGO-x-MTG/', {
      resolveCard: (name: string) => lookupCardMention(based, name),
    });
    expect(html).toContain('href="/YGO-x-MTG/cards/burning-abyss-graff/"');
    expect(html).toContain(
      'data-card-preview="/YGO-x-MTG/generated/graff.webp"',
    );
  });

  it('keeps a mention literal inside a code span', () => {
    const html = render('Write `[[Graff]]` to link a card.');
    expect(html).toContain('<code>[[Graff]]</code>');
    expect(html).not.toContain('<a');
  });

  it('fails the build on an unknown mention', () => {
    expect(() => render('[[Blue-Eyes]]')).toThrow(
      'Unknown card mention: Blue-Eyes',
    );
  });

  it('refuses a mention when no resolver is wired', () => {
    expect(() => renderSafeMarkdown('[[Graff]]')).toThrow(
      'Card mentions need a resolveCard option',
    );
  });

  it('links every card of a decklist fence', () => {
    const html = render(
      '```decklist\n2 Graff\n1 Ash Blossom & Joyous Spring\n14 Swamp\n\nSideboard\n2 Burning Abyss - Graff\n```',
    );
    expect(html).toContain('<div class="decklist">');
    expect(html).toContain(
      '<li><span class="decklist-count">2</span> <a class="card-mention" href="/cards/burning-abyss-graff/"',
    );
    expect(html).toContain(
      '<span class="decklist-count">14</span> <span class="decklist-land">Swamp</span>',
    );
    expect(html).toContain('<p class="decklist-zone">Sideboard</p>');
    expect(html.match(/class="card-mention"/g)).toHaveLength(3);
  });

  it('fails a decklist entry that lost its quantity', () => {
    expect(() =>
      render('```decklist\n2 Graff\nBurning Abyss - Graff\n```'),
    ).toThrow('Decklist entry needs a quantity: Burning Abyss - Graff');
    expect(() => render('```decklist\nSwamp\n```')).toThrow(
      'Decklist entry needs a quantity: Swamp',
    );
  });

  it('fails a decklist line that is neither an entry nor a zone', () => {
    expect(() => render('```decklist\n2 Graff\nAsh Blosom\n```')).toThrow(
      'Unknown decklist line: Ash Blosom',
    );
  });

  it('accepts the zone labels a list is written with', () => {
    const html = render(
      '```decklist\nMain Deck (40 cards)\n2 Graff\n\nExtra Deck\n1 Graff\n```',
    );
    expect(html).toContain('<p class="decklist-zone">Main Deck (40 cards)</p>');
    expect(html).toContain('<p class="decklist-zone">Extra Deck</p>');
  });

  it('fails an unknown card inside a decklist', () => {
    expect(() => render('```decklist\n2 Blue-Eyes\n```')).toThrow(
      'Unknown card mention: Blue-Eyes',
    );
  });

  it('still renders a plain fence as code', () => {
    const html = render('```text\n2 Graff\n```');
    expect(html).toBe('<pre><code>2 Graff</code></pre>');
  });
});

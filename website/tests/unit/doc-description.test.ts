import { describe, expect, it } from 'vitest';
import { docDescription } from '../../src/lib/docs';

describe('docDescription', () => {
  it('keeps hyphens inside words', () => {
    expect(docDescription('Essentia adapts Yu-Gi-Oh! identities.')).toBe(
      'Essentia adapts Yu-Gi-Oh! identities.',
    );
  });

  it('keeps underscores inside identifiers', () => {
    expect(
      docDescription('Packages live under cards_mse/01_alpha/LOTA-0001.'),
    ).toBe('Packages live under cards_mse/01_alpha/LOTA-0001.');
  });

  it('unwraps a link to its text and drops the URL', () => {
    expect(docDescription('See [the rules](../rules/README.md) first.')).toBe(
      'See the rules first.',
    );
  });

  it('drops an image entirely, alt text included', () => {
    expect(docDescription('Before ![a frame](/img/frame.png) after.')).toBe(
      'Before after.',
    );
  });

  it('drops heading markers but keeps the heading text', () => {
    expect(
      docDescription('## Core invariants\n\nMagic rules are the base.'),
    ).toBe('Core invariants Magic rules are the base.');
  });

  it('strips emphasis markers around a word', () => {
    expect(docDescription('**Goal** — adapt *role* and __pace__.')).toBe(
      'Goal — adapt role and pace.',
    );
  });

  it('keeps inline code content without the backticks', () => {
    expect(docDescription('Run `npm run ci` before pushing.')).toBe(
      'Run npm run ci before pushing.',
    );
  });

  it('drops a fenced code block', () => {
    expect(
      docDescription('Intro text.\n\n```js\nconst x = 1;\n```\n\nOutro text.'),
    ).toBe('Intro text. Outro text.');
  });

  it('flattens a table without leaving pipes or the delimiter row', () => {
    const body = [
      'Stages.',
      '',
      '| Path | Meaning |',
      '| --- | --- |',
      '| 01_alpha | first stage |',
    ].join('\n');
    expect(docDescription(body)).toBe(
      'Stages. Path Meaning 01_alpha first stage',
    );
  });

  it('drops list markers and blockquote markers', () => {
    expect(docDescription('- first\n- second\n\n> quoted line')).toBe(
      'first second quoted line',
    );
  });

  it('drops a thematic break', () => {
    expect(docDescription('Before.\n\n---\n\nAfter.')).toBe('Before. After.');
  });

  it('drops an HTML comment', () => {
    expect(docDescription('Kept. <!-- hidden note --> Also kept.')).toBe(
      'Kept. Also kept.',
    );
  });

  it('never leaves empty link syntax behind', () => {
    expect(docDescription('A [](../x.md) B')).not.toContain('[');
  });

  it('truncates on a word boundary and marks the cut', () => {
    const result = docDescription(`${'word '.repeat(60)}tail`);
    expect(result.length).toBeLessThanOrEqual(151);
    expect(result.endsWith('…')).toBe(true);
    expect(result).not.toContain('wor…');
  });

  it('does not mark a body that fits', () => {
    expect(docDescription('Short body.')).toBe('Short body.');
  });

  it('returns an empty string for an empty body', () => {
    expect(docDescription('')).toBe('');
  });
});

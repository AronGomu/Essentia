import { describe, it, expect, beforeAll } from 'vitest';
import { readFile } from 'node:fs/promises';
import { resolve } from '../support/css';

describe('card related band', () => {
  let source: string;
  let css: string;

  beforeAll(async () => {
    source = await readFile(
      new URL('../../src/pages/cards/[id].astro', import.meta.url),
      'utf-8',
    );
    css = await readFile(
      new URL('../../src/styles/global.css', import.meta.url),
      'utf-8',
    );
  });

  /** Index of the `</div>` that closes the `<div>` opened at `openTagIndex`. */
  function matchingDivClose(markup: string, openTagIndex: number): number {
    const tags = /<div\b|<\/div\s*>/g;
    tags.lastIndex = openTagIndex;
    let depth = 0;
    let match: RegExpExecArray | null;
    while ((match = tags.exec(markup)) !== null) {
      depth += match[0].startsWith('</') ? -1 : 1;
      if (depth === 0) return match.index;
    }
    throw new Error('unbalanced <div> around the card transcription');
  }

  it('related sections are not inside the transcription', () => {
    const classIndex = source.indexOf('class="card-transcription"');
    expect(classIndex).toBeGreaterThan(-1);
    // The nearest inner `</div>` closes `.card-facts`, not the transcription:
    // count depth so re-nesting the related sections after it turns this red.
    const transcriptionOpen = source.lastIndexOf('<div', classIndex);
    const transcriptionClose = matchingDivClose(source, transcriptionOpen);
    const archetypeIndex = source.indexOf('related-archetype');
    const bandIndex = source.indexOf('related-band');
    expect(archetypeIndex).toBeGreaterThan(transcriptionClose);
    expect(bandIndex).toBeGreaterThan(transcriptionClose);
  });

  it('band spans the viewport', () => {
    expect(resolve(css, '.related-band', 'width', 1440)).toBe('100vw');
  });

  it('band content keeps the shell width', () => {
    expect(resolve(css, '.page-shell', 'width', 1440)).toBe(
      'min(100% - 2rem, 88rem)',
    );
  });

  it('render column is still sticky above 44rem', () => {
    expect(resolve(css, '.card-detail .render-column', 'position', 1440)).toBe(
      'sticky',
    );
  });

  it('render column unsticks at or below 44rem', () => {
    expect(resolve(css, '.card-detail .render-column', 'position', 600)).toBe(
      'static',
    );
  });
});

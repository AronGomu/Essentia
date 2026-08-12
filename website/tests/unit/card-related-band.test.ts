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

  it('related sections are not inside the transcription', () => {
    const transcriptionOpen = source.indexOf('class="card-transcription"');
    const transcriptionClose = source.indexOf('</div>', transcriptionOpen);
    const archetypeIndex = source.indexOf('related-archetype');
    const bandIndex = source.indexOf('related-band');
    expect(transcriptionOpen).toBeGreaterThan(-1);
    expect(transcriptionClose).toBeGreaterThan(-1);
    expect(archetypeIndex).toBeGreaterThan(transcriptionClose);
    expect(bandIndex).toBeGreaterThan(-1);
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

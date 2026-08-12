import { describe, it, expect, beforeAll } from 'vitest';
import { readFile } from 'node:fs/promises';
import { resolve } from '../support/css';

const RENDER_SELECTOR = '.card-detail .render-column picture';

describe('card render width', () => {
  let css: string;

  beforeAll(async () => {
    css = await readFile(
      new URL('../../src/styles/global.css', import.meta.url),
      'utf-8',
    );
  });

  it('render column caps at 40rem', () => {
    expect(resolve(css, RENDER_SELECTOR, 'max-width', 1440)).toBe('40rem');
  });

  it('render column fills its column', () => {
    expect(resolve(css, RENDER_SELECTOR, 'width', 1440)).toBe('100%');
  });

  it('no 25rem cap survives anywhere', () => {
    expect(css).not.toMatch(/render-column[^}]*25rem/s);
  });
});

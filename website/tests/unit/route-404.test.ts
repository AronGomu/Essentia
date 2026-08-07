import { describe, expect, it } from 'vitest';
import { assert404 } from '../../scripts/check-404.mjs';

describe('assert404', () => {
  it('accepts a root redirect document', () => {
    const html = `<!doctype html><html><head><meta http-equiv="refresh" content="0; url=/" /><meta name="robots" content="noindex" /></head><body></body></html>`;
    expect(assert404(html, '/')).toEqual([]);
  });

  it('accepts a subpath deployment', () => {
    const html = `<!doctype html><html><head><meta http-equiv="refresh" content="0; url=/YGO-x-MTG/" /><meta name="robots" content="noindex" /></head><body></body></html>`;
    expect(assert404(html, '/YGO-x-MTG/')).toEqual([]);
  });

  it('rejects a missing refresh', () => {
    const html = `<!doctype html><html><head><meta name="robots" content="noindex" /></head><body></body></html>`;
    expect(assert404(html, '/')).toContain(
      '404.html is missing a zero-delay meta refresh to /',
    );
  });

  it('rejects the legacy not-found page', () => {
    const html = `<!doctype html><html><head><meta http-equiv="refresh" content="0; url=/" /><meta name="robots" content="noindex" /></head><body><h1>Card not found</h1></body></html>`;
    expect(assert404(html, '/')).toContain(
      '404.html still renders the old not-found page',
    );
  });

  it('rejects an indexable 404', () => {
    const html = `<!doctype html><html><head><meta http-equiv="refresh" content="0; url=/" /></head><body></body></html>`;
    expect(assert404(html, '/')).toContain('404.html must stay noindex');
  });
});

import { execFile } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { describe, expect, it } from 'vitest';

const run = promisify(execFile);
const website = path.resolve(import.meta.dirname, '../..');

const CSP =
  "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; base-uri 'self'; object-src 'none'; form-action 'self'; frame-src 'none'; manifest-src 'self'";

/** Runs the real gate over a throwaway OUT_DIR holding a single HTML file. */
async function scan(html: string): Promise<{ code: number; output: string }> {
  const dir = mkdtempSync(path.join(tmpdir(), 'essentia-scan-dist-'));
  writeFileSync(path.join(dir, 'page.html'), html);
  try {
    const { stdout } = await run('node', ['scripts/scan-dist.mjs'], {
      cwd: website,
      env: { ...process.env, OUT_DIR: dir },
    });
    return { code: 0, output: stdout };
  } catch (error) {
    const failure = error as { code?: number; stderr?: string };
    return { code: failure.code ?? 1, output: failure.stderr ?? '' };
  }
}

describe('R6 scan-dist treats a missing CSP as an error', () => {
  it('rejects a built HTML file with no Content-Security-Policy', async () => {
    const { code, output } = await scan(
      '<!doctype html><html><head><title>x</title></head><body></body></html>',
    );
    expect(code).not.toBe(0);
    expect(output).toMatch(/missing Content-Security-Policy/);
  });

  it('accepts a built HTML file that carries one', async () => {
    const { code, output } = await scan(
      `<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="${CSP}" /></head><body></body></html>`,
    );
    expect(code).toBe(0);
    expect(output).toContain('dist scan: clean');
  });

  it('still rejects an unsafe-inline policy', async () => {
    const { code, output } = await scan(
      `<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'self' 'unsafe-inline'" /></head><body></body></html>`,
    );
    expect(code).not.toBe(0);
    expect(output).toMatch(/unsafe inline CSP/);
  });
});

describe('R6 the 404 document carries a policy of its own', () => {
  const source = readFileSync(
    path.join(website, 'src/pages/404.astro'),
    'utf8',
  );

  it('declares a Content-Security-Policy meta', () => {
    expect(source).toContain('http-equiv="Content-Security-Policy"');
    expect(source).toContain("default-src 'none'");
  });

  it('stays a standalone redirect stub rather than adopting BaseLayout', () => {
    // Re-adopting the layout would drag the header, breadcrumb and hover
    // preview onto a page whose whole job is to redirect.
    expect(source).not.toMatch(/import\s+BaseLayout/);
    expect(source).not.toMatch(/<BaseLayout\b/);
    expect(source).toContain('http-equiv="refresh"');
  });
});

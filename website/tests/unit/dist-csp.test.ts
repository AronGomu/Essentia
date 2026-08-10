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

  // `'unsafe-hashes'` is the tempting way to unblock a per-element `style=""`
  // attribute, and it survives harden-csp.mjs's rewrite untouched because that
  // rewrite only ever consumes `'unsafe-inline'`. Without these two the gate
  // was blind to a policy that re-opens the very channel it exists to close.
  it('rejects a policy that re-opens style attributes with unsafe-hashes', async () => {
    const { code, output } = await scan(
      `<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'self' 'sha256-abc' 'unsafe-hashes'" /></head><body></body></html>`,
    );
    expect(code).not.toBe(0);
    expect(output).toMatch(/unsafe-hashes or unsafe-eval CSP/);
    // Not caught by the older rule — the point is that this needed its own.
    expect(output).not.toMatch(/unsafe inline CSP/);
  });

  it('rejects a policy that re-opens eval with unsafe-eval', async () => {
    const { code, output } = await scan(
      `<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'self' 'sha256-abc' 'unsafe-eval'" /></head><body></body></html>`,
    );
    expect(code).not.toBe(0);
    expect(output).toMatch(/unsafe-hashes or unsafe-eval CSP/);
  });
});

/** Runs the real hardener over a throwaway OUT_DIR holding a single HTML file. */
async function harden(
  html: string,
): Promise<{ code: number; output: string; hardened: string }> {
  const dir = mkdtempSync(path.join(tmpdir(), 'essentia-harden-csp-'));
  const file = path.join(dir, 'page.html');
  writeFileSync(file, html);
  try {
    const { stdout } = await run('node', ['scripts/harden-csp.mjs'], {
      cwd: website,
      env: { ...process.env, OUT_DIR: dir },
    });
    return { code: 0, output: stdout, hardened: readFileSync(file, 'utf8') };
  } catch (error) {
    const failure = error as { code?: number; stderr?: string };
    return {
      code: failure.code ?? 1,
      output: failure.stderr ?? '',
      hardened: readFileSync(file, 'utf8'),
    };
  }
}

const page = (policy: string, body = '<style>a{color:red}</style>') =>
  `<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="${policy}" />${body}</head><body></body></html>`;

describe('T8 harden-csp refuses to leave a weakened policy behind', () => {
  it('rewrites unsafe-inline into a sha256 allowlist', async () => {
    const { code, hardened } = await harden(
      page("default-src 'none'; style-src 'self' 'unsafe-inline'"),
    );
    expect(code).toBe(0);
    expect(hardened).toMatch(/style-src 'self' 'sha256-[A-Za-z0-9+/=]+'/);
    expect(hardened).not.toContain("'unsafe-inline'");
  });

  it('refuses a policy whose unsafe-hashes survives the rewrite', async () => {
    // This is the failure mode the keyword list exists for: the rewrite
    // consumes `'unsafe-inline'` and hands back
    // `style-src 'self' 'sha256-…' 'unsafe-hashes'`, which looks hardened and
    // still allows every per-element `style=""` attribute on the page.
    const { code, output } = await harden(
      page(
        "default-src 'none'; style-src 'self' 'unsafe-inline' 'unsafe-hashes'",
      ),
    );
    expect(code).not.toBe(0);
    expect(output).toMatch(/CSP hardening incomplete/);
    expect(output).toContain("'unsafe-hashes'");
  });

  it('refuses a policy whose unsafe-eval survives the rewrite', async () => {
    const { code, output } = await harden(
      page(
        "default-src 'none'; script-src 'self' 'unsafe-inline' 'unsafe-eval'",
        '<script>console.log(1)</script>',
      ),
    );
    expect(code).not.toBe(0);
    expect(output).toMatch(/CSP hardening incomplete/);
    expect(output).toContain("'unsafe-eval'");
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

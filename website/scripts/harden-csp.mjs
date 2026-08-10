import { createHash } from 'node:crypto';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(process.env.OUT_DIR ?? 'dist');
const files = [];
async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) await walk(file);
    else if (entry.name.endsWith('.html')) files.push(file);
  }
}
const hash = (value) =>
  `'sha256-${createHash('sha256').update(value).digest('base64')}'`;
await walk(root);
for (const file of files) {
  let html = await readFile(file, 'utf8');
  const scripts = [
    ...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi),
  ].map((match) => hash(match[1]));
  const styles = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map(
    (match) => hash(match[1]),
  );
  html = html
    .replace(
      "script-src 'self' 'unsafe-inline'",
      `script-src 'self' ${[...new Set(scripts)].join(' ')}`.trim(),
    )
    .replace(
      "style-src 'self' 'unsafe-inline'",
      `style-src 'self' ${[...new Set(styles)].join(' ')}`.trim(),
    );
  // The rewrites above only consume `'unsafe-inline'`, so guarding on that
  // keyword alone left an opening: authoring
  // `style-src 'self' 'unsafe-inline' 'unsafe-hashes'` hardens to
  // `style-src 'self' 'sha256-…' 'unsafe-hashes'` and passes. That is exactly
  // the tempting way to "fix" a blocked per-element `style` attribute, and it
  // re-opens the attribute channel this hardening exists to close.
  // `'unsafe-eval'` is the script-src equivalent. Name all three.
  const weakened = [
    "'unsafe-inline'",
    "'unsafe-hashes'",
    "'unsafe-eval'",
  ].filter((keyword) => html.includes(keyword));
  if (weakened.length)
    throw new Error(
      `${file}: CSP hardening incomplete — ${weakened.join(', ')}`,
    );
  await writeFile(file, html);
}
process.stdout.write(
  `csp: hashed inline content in ${files.length} HTML files\n`,
);

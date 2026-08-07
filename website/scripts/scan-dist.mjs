import { lstat, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const dist = path.resolve(process.env.OUT_DIR ?? 'dist');
const textExtensions = new Set([
  '.html',
  '.js',
  '.json',
  '.css',
  '.xml',
  '.txt',
]);
const allowedExtensions = new Set([
  ...textExtensions,
  '.png',
  '.webp',
  '.avif',
  '.ico',
]);
const forbidden = [
  ['Windows drive path', /(?:^|[^a-z])(?:[A-Z]:[\\/])/i],
  ['UNC path', /\\\\[A-Za-z0-9_.-]+\\/],
  ['private POSIX home', /\/(?:home|Users|root)\/[A-Za-z0-9_.-]+\//],
  ['file URL', /file:\/\//i],
  ['private key', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  ['editor notes field', /\t+notes:\s/i],
  ['source map reference', /sourceMappingURL=/],
  ['unsafe inline CSP', /(?:script|style)-src[^;]*'unsafe-inline'/i],
];
const issues = [];
async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    const info = await lstat(file);
    if (info.isSymbolicLink()) {
      issues.push(`${file}: symlink forbidden`);
      continue;
    }
    if (entry.isDirectory()) await walk(file);
    else {
      const extension = path.extname(entry.name).toLowerCase();
      if (!allowedExtensions.has(extension))
        issues.push(`${file}: unexpected extension ${extension}`);
      if (['.png', '.webp', '.avif'].includes(extension)) {
        const metadata = await sharp(file).metadata();
        if (metadata.exif || metadata.icc || metadata.iptc || metadata.xmp)
          issues.push(`${file}: embedded source metadata`);
        if (
          !metadata.width ||
          !metadata.height ||
          metadata.width > 12_000 ||
          metadata.height > 12_000 ||
          metadata.width * metadata.height > 80_000_000
        )
          issues.push(`${file}: unsafe image dimensions`);
      }
      if (textExtensions.has(extension)) {
        const text = await readFile(file, 'utf8');
        for (const [label, pattern] of forbidden)
          if (pattern.test(text)) issues.push(`${file}: ${label}`);
        // Absence of a policy used to pass: the `'unsafe-inline'` rule above
        // only fires when a CSP is present, so a page that shipped none at all
        // was the least-protected surface and the only one nothing checked.
        if (
          extension === '.html' &&
          !/http-equiv="Content-Security-Policy"/i.test(text)
        )
          issues.push(`${file}: missing Content-Security-Policy`);
      }
    }
  }
}
await walk(dist);
if (issues.length)
  throw new Error(`Public artifact leak scan failed:\n${issues.join('\n')}`);
process.stdout.write('dist scan: clean\n');

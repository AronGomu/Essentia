import { readFile } from 'node:fs/promises';
import path from 'node:path';

/**
 * @param {string} html contents of dist/404.html
 * @param {string} base site base path, e.g. '/' or '/YGO-x-MTG/'
 * @returns {string[]} problems, empty when the document is a valid home redirect
 */
export function assert404(html, base) {
  const problems = [];
  const refreshPattern = new RegExp(
    `content=["']0;\\s*url=${base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']`,
    'i',
  );
  if (!refreshPattern.test(html))
    problems.push(`404.html is missing a zero-delay meta refresh to ${base}`);
  if (!/name=["']robots["'][^>]*noindex/i.test(html))
    problems.push('404.html must stay noindex');
  if (html.includes('Card not found'))
    problems.push('404.html still renders the old not-found page');
  return problems;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const dist = path.resolve(process.env.OUT_DIR ?? 'dist', '404.html');
  const html = await readFile(dist, 'utf8');
  const problems = assert404(html, process.env.BASE_PATH ?? '/');
  if (problems.length) throw new Error(problems.join('\n'));
  process.stdout.write('404: redirects to site root\n');
}

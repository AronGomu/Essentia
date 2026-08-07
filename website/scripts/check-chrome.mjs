import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

export const UTILITY_LINKS = [
  { label: 'Learn about Essentia', path: 'docs/' },
  { label: 'Blog', path: 'blog/' },
  { label: 'Decks', path: 'decks/' },
];

/**
 * @param {string} file dist-relative path, e.g. 'index.html'
 * @param {string} html
 * @param {string} base
 * @returns {string[]} problems for this page
 */
export function chromeIssues(file, html, base) {
  if (file === '404.html') return [];

  const problems = [];
  const navMatch = html.match(/<nav class="utility-nav"[\s\S]*?<\/nav>/);
  const navBlock = navMatch ? navMatch[0] : '';

  for (const { label, path: linkPath } of UTILITY_LINKS) {
    const href = `${base}${linkPath}`;
    const hasHref = navBlock.includes(`href="${href}"`);
    const hasLabel = navBlock.includes(`>${label}<`);
    if (!hasHref || !hasLabel) {
      problems.push(
        `${file}: header is missing the "${label}" link to ${href}`,
      );
    }
  }

  if (navBlock.includes('>Rules<') || navBlock.includes('>Philosophy<')) {
    problems.push(`${file}: header still links to Rules or Philosophy`);
  }

  return problems;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const dist = path.resolve('dist');
  const base = process.env.BASE_PATH ?? '/';

  const walk = async (dir) => {
    const entries = await readdir(dir, { withFileTypes: true });
    const files = [];
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) files.push(...(await walk(full)));
      else if (entry.name.endsWith('.html')) files.push(full);
    }
    return files;
  };

  const files = await walk(dist);
  const problems = [];
  for (const file of files) {
    const html = await readFile(file, 'utf8');
    const relative = path.relative(dist, file);
    problems.push(...chromeIssues(relative, html, base));
  }

  if (problems.length) throw new Error(problems.join('\n'));
  process.stdout.write(`chrome: ${files.length} pages carry the site header\n`);
}

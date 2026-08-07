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

  if (
    file !== 'index.html' &&
    file !== '404.html' &&
    !html.includes('<nav class="breadcrumb"')
  ) {
    problems.push(`${file}: page is missing a breadcrumb`);
  }

  if (file === 'index.html') {
    if (
      !html.includes('The Yu-Gi-Oh! Feel.') ||
      !html.includes('With Magic Rules.')
    ) {
      problems.push(`${file}: hero headline copy changed`);
    }

    if (
      !html.includes(
        'Explore the Essentia project. Discover the best Yu-Gi-Oh has to offer within MTG game system.',
      )
    ) {
      problems.push(`${file}: hero lead copy changed`);
    }

    const heroActionsMatch = html.match(
      /<div class="hero-actions"[\s\S]*?<\/div>/,
    );
    const heroActionsBlock = heroActionsMatch ? heroActionsMatch[0] : '';
    const heroCtaHref = `${base}docs/`;
    if (
      !heroActionsBlock.includes(`href="${heroCtaHref}"`) ||
      !heroActionsBlock.includes('>Learn about Essentia<')
    ) {
      problems.push(
        `${file}: hero CTA must be "Learn about Essentia" pointing at <base>docs/`,
      );
    }

    const heroArtMatch = html.match(/<img class="hero-art"[^>]*>/);
    const heroArtTag = heroArtMatch ? heroArtMatch[0] : '';
    const srcMatch = heroArtTag.match(/src="([^"]*)"/);
    const heroArtSrc = srcMatch ? srcMatch[1] : '';
    const heroArtRe = new RegExp(`^${base}art/[a-z0-9-]+-hero\\.webp$`);
    if (!heroArtRe.test(heroArtSrc)) {
      problems.push(`${file}: hero art must use the section hero image`);
    }
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

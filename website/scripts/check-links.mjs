import { lstat, readFile, readdir, realpath } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

function validateBase(base) {
  if (!base.startsWith('/') || (base !== '/' && !base.endsWith('/')))
    throw new Error(
      `Invalid BASE_PATH ${JSON.stringify(base)}: expected a leading and trailing slash`,
    );
}

async function htmlFiles(directory) {
  const files = [];
  async function walk(current) {
    for (const entry of await readdir(current, { withFileTypes: true })) {
      if (entry.isSymbolicLink()) continue;
      const file = path.join(current, entry.name);
      if (entry.isDirectory()) await walk(file);
      else if (entry.name.endsWith('.html')) files.push(file);
    }
  }
  await walk(directory);
  return files.sort();
}

function srcsetUrls(value) {
  const urls = [];
  let offset = 0;
  while (offset < value.length) {
    while (/[\s,]/.test(value[offset] ?? '')) offset += 1;
    if (offset >= value.length) break;

    const start = offset;
    while (offset < value.length && !/\s/.test(value[offset])) offset += 1;
    const url = value.slice(start, offset).replace(/,+$/, '');
    if (url) urls.push(url);

    if (value[offset - 1] === ',') continue;
    let parentheses = 0;
    while (offset < value.length) {
      if (value[offset] === '(') parentheses += 1;
      else if (value[offset] === ')')
        parentheses = Math.max(0, parentheses - 1);
      else if (value[offset] === ',' && parentheses === 0) {
        offset += 1;
        break;
      }
      offset += 1;
    }
  }
  return urls;
}

function commentEnd(html, start) {
  const standard = html.indexOf('-->', start + 4);
  const alternate = html.indexOf('--!>', start + 4);
  const ends = [standard, alternate].filter((end) => end !== -1);
  if (!ends.length) return html.length;
  const end = Math.min(...ends);
  return end + (end === alternate ? 4 : 3);
}

function rawTextEnd(html, lower, name, start) {
  let close = lower.indexOf(`</${name}`, start);
  while (close !== -1 && !/[\s/>]/.test(lower[close + name.length + 2] ?? ''))
    close = lower.indexOf(`</${name}`, close + name.length + 2);
  if (close === -1) return html.length;
  const end = html.indexOf('>', close);
  return end === -1 ? html.length : end + 1;
}

function startTags(html) {
  const tags = [];
  const lower = html.toLowerCase();
  let offset = 0;
  while (offset < html.length) {
    const start = html.indexOf('<', offset);
    if (start === -1) break;
    if (html.startsWith('<!--', start)) {
      offset = commentEnd(html, start);
      continue;
    }
    if (!/[a-z]/i.test(html[start + 1] ?? '')) {
      offset = start + 1;
      continue;
    }

    let quote = '';
    let end = start + 1;
    for (; end < html.length; end += 1) {
      const character = html[end];
      if (quote) {
        if (character === quote) quote = '';
      } else if (character === '"' || character === "'") quote = character;
      else if (character === '>') break;
    }
    if (end === html.length) break;

    const tag = html.slice(start, end + 1);
    tags.push(tag);
    offset = end + 1;
    const name = tag.match(/^<([^\s/>]+)/)?.[1]?.toLowerCase();
    if (
      name &&
      [
        'iframe',
        'noembed',
        'noframes',
        'script',
        'style',
        'textarea',
        'title',
        'xmp',
      ].includes(name)
    )
      offset = rawTextEnd(html, lower, name, offset);
    else if (name === 'plaintext') offset = html.length;
  }
  return tags;
}

function tagReferences(tag) {
  const references = [];
  let offset = 1;
  while (offset < tag.length && !/[\s/>]/.test(tag[offset])) offset += 1;
  while (offset < tag.length) {
    while (/[\s/]/.test(tag[offset] ?? '')) offset += 1;
    if (tag[offset] === '>' || offset >= tag.length) break;

    const start = offset;
    while (offset < tag.length && !/[\s=/>]/.test(tag[offset])) offset += 1;
    const name = tag.slice(start, offset).toLowerCase();
    while (/\s/.test(tag[offset] ?? '')) offset += 1;

    let value = '';
    if (tag[offset] === '=') {
      offset += 1;
      while (/\s/.test(tag[offset] ?? '')) offset += 1;
      const quote =
        tag[offset] === '"' || tag[offset] === "'" ? tag[offset] : '';
      if (quote) offset += 1;
      const valueStart = offset;
      while (
        offset < tag.length &&
        (quote ? tag[offset] !== quote : !/[\s>]/.test(tag[offset]))
      )
        offset += 1;
      value = tag.slice(valueStart, offset);
      if (quote && tag[offset] === quote) offset += 1;
    }

    if (name === 'srcset') references.push(...srcsetUrls(value));
    else if (name === 'href' || name === 'src') references.push(value);
  }
  return references;
}

function internalReferences(html) {
  return startTags(html).flatMap(tagReferences);
}

function lookupRelative({ value, file, dist, base }) {
  const clean = value.split(/[?#]/, 1)[0];
  if (!clean || /^(?:https?:|mailto:|data:)/i.test(clean)) return null;
  const owner = path.relative(dist, path.dirname(file)).replaceAll('\\', '/');
  const resolved = clean.startsWith('/')
    ? path.posix.resolve('/', clean)
    : path.posix.resolve(base, owner, clean);
  const baseRoot = base === '/' ? '/' : base.slice(0, -1);
  if (base !== '/' && resolved !== baseRoot && !resolved.startsWith(base))
    return { outsideBase: true };
  return {
    relative: resolved === baseRoot ? '' : resolved.slice(base.length),
  };
}

async function lstatWithoutLinks(root, target) {
  const relative = path.relative(root, target);
  if (
    relative === '..' ||
    relative.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relative)
  )
    return null;
  let current = root;
  let info = await lstat(current);
  for (const segment of relative.split(path.sep).filter(Boolean)) {
    current = path.join(current, segment);
    info = await lstat(current);
    if (info.isSymbolicLink()) return null;
  }
  return info;
}

async function targetExists(root, relative) {
  try {
    let target = path.join(root, relative);
    let info = await lstatWithoutLinks(root, target);
    if (!info) return false;
    if (info.isDirectory()) {
      target = path.join(target, 'index.html');
      info = await lstatWithoutLinks(root, target);
    }
    return Boolean(info?.isFile());
  } catch {
    return false;
  }
}

export async function collectBrokenInternalLinks({ dist, base }) {
  validateBase(base);
  const root = await realpath(path.resolve(dist));
  const issues = [];
  for (const file of await htmlFiles(root)) {
    const page = path.relative(root, file).replaceAll('\\', '/');
    const text = await readFile(file, 'utf8');
    for (const value of internalReferences(text)) {
      const lookup = lookupRelative({ value, file, dist: root, base });
      if (!lookup) continue;
      if (lookup.outsideBase) {
        issues.push(`${page} → ${value} (outside BASE_PATH ${base})`);
        continue;
      }
      if (!(await targetExists(root, lookup.relative)))
        issues.push(`${page} → ${value}`);
    }
  }
  return [...new Set(issues)].sort();
}

async function main() {
  const dist = path.resolve(process.env.OUT_DIR ?? 'dist');
  const base = process.env.BASE_PATH ?? '/';
  const [issues, pages] = await Promise.all([
    collectBrokenInternalLinks({ dist, base }),
    htmlFiles(dist),
  ]);
  if (issues.length)
    throw new Error(`Broken internal links:\n${issues.join('\n')}`);
  process.stdout.write(`links: ${pages.length} pages clean\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  await main();

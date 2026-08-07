function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function inline(value: string, base: string): string {
  let html = escapeHtml(value);
  html = html.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    (_match, label: string, rawUrl: string) => {
      const url = rawUrl.trim();
      if (!/^(?:https:\/\/|mailto:|#|\/)/i.test(url))
        throw new Error(`Unsafe Markdown URL: ${url}`);
      const href = url.startsWith('/')
        ? `${base.replace(/\/$/, '')}${url}`
        : url;
      const external = url.startsWith('https://')
        ? ' rel="noopener noreferrer"'
        : '';
      return `<a href="${escapeHtml(href)}"${external}>${label}</a>`;
    },
  );
  html = html
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/_([^_]+)_/g, '<em>$1</em>');
  return html;
}

export function headingSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function splitBlocks(value: string): string[] {
  const blocks: string[] = [];
  const lines = value.split('\n');
  let buffer: string[] = [];
  let inFence = false;

  const flush = () => {
    const text = buffer.join('\n').trim();
    if (text) blocks.push(text);
    buffer = [];
  };

  for (const line of lines) {
    if (/^```/.test(line.trim())) {
      inFence = !inFence;
      buffer.push(line);
      continue;
    }
    if (!inFence && /^\s*$/.test(line)) {
      flush();
      continue;
    }
    buffer.push(line);
  }
  if (inFence) throw new Error('Unterminated code fence');
  flush();
  return blocks;
}

function renderOrderedList(lines: string[], base: string): string {
  const items = lines
    .map((line) => inline(line.replace(/^\d+\.\s+/, ''), base))
    .map((item) => `<li>${item}</li>`)
    .join('');
  return `<ol>${items}</ol>`;
}

function renderUnorderedList(lines: string[], base: string): string {
  let html = '<ul>';
  let nestedOpen = false;
  let topItemOpen = false;
  for (const line of lines) {
    const nestedMatch = /^\s{2,}-\s+(.*)$/.exec(line);
    if (nestedMatch) {
      if (!nestedOpen) {
        html += '<ul>';
        nestedOpen = true;
      }
      html += `<li>${inline(nestedMatch[1]!, base)}</li>`;
      continue;
    }
    if (nestedOpen) {
      html += '</ul></li>';
      nestedOpen = false;
      topItemOpen = false;
    } else if (topItemOpen) {
      html += '</li>';
    }
    const text = line.replace(/^-\s+/, '');
    html += `<li>${inline(text, base)}`;
    topItemOpen = true;
  }
  if (nestedOpen) html += '</ul></li>';
  else if (topItemOpen) html += '</li>';
  html += '</ul>';
  return html;
}

function renderTable(lines: string[], base: string): string {
  const parseRow = (line: string): string[] =>
    line
      .trim()
      .replace(/^\|/, '')
      .replace(/\|$/, '')
      .split('|')
      .map((cell) => cell.trim());

  const header = parseRow(lines[0]!);
  const rows = lines.slice(2).map(parseRow);

  const headHtml = `<thead><tr>${header
    .map((cell) => `<th>${inline(cell, base)}</th>`)
    .join('')}</tr></thead>`;

  const bodyHtml = `<tbody>${rows
    .map((row) => {
      const padded = header.map((_, i) => row[i] ?? '');
      return `<tr>${padded
        .map((cell) => `<td>${inline(cell, base)}</td>`)
        .join('')}</tr>`;
    })
    .join('')}</tbody>`;

  return `<table>${headHtml}${bodyHtml}</table>`;
}

function block(text: string, base: string): string {
  const lines = text.split('\n');

  if (lines.every((line) => /^-\s+|^\s{2,}-\s+/.test(line)))
    return renderUnorderedList(lines, base);

  if (lines.every((line) => /^\d+\.\s+/.test(line)))
    return renderOrderedList(lines, base);

  const fence = /^```.*\n([\s\S]*)\n```$/.exec(text);
  if (fence) return `<pre><code>${escapeHtml(fence[1]!)}</code></pre>`;

  const heading = /^(#{1,4})\s+(.+)$/.exec(text);
  if (heading) {
    const level = heading[1]!.length;
    const label = heading[2]!;
    const id = headingSlug(label);
    return `<h${level} id="${id}">${inline(label, base)}</h${level}>`;
  }

  if (lines.every((line) => /^>\s?/.test(line))) {
    const inner = lines.map((line) => line.replace(/^>\s?/, '')).join(' ');
    return `<blockquote><p>${inline(inner, base)}</p></blockquote>`;
  }

  if (
    lines.length >= 2 &&
    /^\|.*\|$/.test(lines[0]!.trim()) &&
    /^\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?$/.test(lines[1]!.trim())
  )
    return renderTable(lines, base);

  if (text.trim() === '---') return '<hr>';

  return `<p>${lines.map((line) => inline(line, base)).join('<br>')}</p>`;
}

export function renderSafeMarkdown(value: string, base = '/'): string {
  return splitBlocks(value)
    .map((text) => block(text, base))
    .join('');
}

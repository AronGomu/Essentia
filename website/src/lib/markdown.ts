// Explicit extension: the content build imports this module through Node's
// type stripping, which resolves no extensions of its own.
import { BASIC_LANDS, mentionKey, type CardMention } from './card-mentions.ts';

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

/**
 * Card names are matched against the catalog, which holds them unescaped:
 * `Ash Blossom & Joyous Spring` reaches the mention rule as
 * `Ash Blossom &amp; Joyous Spring` because escaping runs first.
 */
function unescapeHtml(value: string): string {
  return value
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&amp;', '&');
}

/**
 * Resolves an authored card name to its page and hover-preview attributes.
 * Supplied by the component that owns the catalog; this module stays free of
 * catalog data so it can render any authored corpus in isolation.
 */
export type CardMentionResolver = (name: string) => CardMention;

export interface MarkdownOptions {
  resolveCard?: CardMentionResolver;
}

function requireResolver(
  options: MarkdownOptions | undefined,
): CardMentionResolver {
  if (!options?.resolveCard)
    throw new Error('Card mentions need a resolveCard option');
  return options.resolveCard;
}

/** Whether a name is a card, without the resolver's authoring error. */
function findsCard(resolve: CardMentionResolver, name: string): boolean {
  try {
    resolve(name);
    return true;
  } catch {
    return false;
  }
}

/** The attribute set a gallery tile publishes, so one hover overlay serves both. */
function cardAnchor(mention: CardMention, label: string): string {
  return (
    `<a class="card-mention" href="${escapeHtml(mention.href)}"` +
    ` data-card-preview="${escapeHtml(mention.preview)}"` +
    ` data-card-keywords="${escapeHtml(mention.keywords.join(','))}">` +
    `${escapeHtml(label)}</a>`
  );
}

/**
 * Emphasis must never run over markup this function has already produced, or
 * it corrupts identifiers: `cards_mse/` inside a code span or an `href` used
 * to come back as `cards<em>mse/`, which mangled prose and broke links.
 *
 * So generated fragments — link tags and code spans — are parked as
 * placeholder tokens, `**`/`_` run over what is left (real prose only), and
 * the fragments are spliced back at the end. The sentinel is a private-use
 * codepoint, which carries no meaning in an authored document; any that slips
 * in is dropped up front so it can never be mistaken for a token.
 */
const PARK = '\uE000';

const IMAGE_SCALES = Array.from(
  { length: 20 },
  (_unused, index) => (index + 1) * 5,
);

function imageScale(token: string | undefined): number {
  if (token === undefined) return 100;
  const value = Number(token);
  // The scale is a CSS class, not an inline style: this site's CSP forbids
  // per-element `style` attributes, so only the authored ladder can be used.
  if (!IMAGE_SCALES.includes(value))
    throw new Error(`Unsupported Markdown image scale: ${token}%`);
  return value;
}

function inline(
  value: string,
  base: string,
  options?: MarkdownOptions,
): string {
  const parked: string[] = [];
  const park = (fragment: string): string => {
    parked.push(fragment);
    return `${PARK}${parked.length - 1}${PARK}`;
  };

  let html = escapeHtml(value).replaceAll(PARK, '');

  // Code spans park before every other rule: their content is literal, so a
  // `[[Card]]` or `[x](y)` printed inside backticks — as the authoring docs
  // do — must survive as text rather than become markup.
  html = html.replace(/`([^`]+)`/g, (_match, code: string) =>
    park(`<code>${code}</code>`),
  );

  html = html.replace(
    /!\[([^\]|]*)(?:\|(\d{1,3})%)?\]\(([^)\s]+)\)/g,
    (_match, alt: string, rawScale: string | undefined, rawUrl: string) => {
      const url = rawUrl.trim();
      // `//host/x.png` is protocol-relative, not site-relative: it loads from a
      // third-party origin. Only a single leading slash is a local asset.
      if (!url.startsWith('/') || url.startsWith('//'))
        throw new Error(`Unsafe Markdown image URL: ${url}`);
      const scale = imageScale(rawScale);
      const src = `${base.replace(/\/$/, '')}${url}`;
      return park(
        `<img class="md-image md-image-scale-${scale}" src="${src}" alt="${alt}" loading="lazy" decoding="async">`,
      );
    },
  );

  // `[[Name]]` and `[[Name|display text]]`. Runs before the link rule so a
  // mention can never be read as a link with a bracketed label.
  html = html.replace(
    /\[\[([^\]|]+)(?:\|([^\]|]+))?\]\]/g,
    (_match, rawName: string, rawLabel: string | undefined) => {
      const mention = requireResolver(options)(unescapeHtml(rawName.trim()));
      const label =
        rawLabel === undefined ? mention.name : unescapeHtml(rawLabel.trim());
      return park(cardAnchor(mention, label));
    },
  );

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
      // `href` is already escaped — `escapeHtml` ran over the whole string
      // before the URL was captured. Escaping it again turned `&` into
      // `&amp;amp;` and resolved to the wrong URL.
      return `${park(`<a href="${href}"${external}>`)}${label}${park('</a>')}`;
    },
  );

  html = html
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    // Intra-word underscores are identifiers, not emphasis: `_` only opens and
    // closes on a word boundary. The corpus carries no intentional `_x_`.
    .replace(/(^|[^\w])_([^\s_][^_]*)_(?!\w)/g, '$1<em>$2</em>');

  // Parked fragments never contain a sentinel, so one pass restores them all.
  const parkedRe = new RegExp(`${PARK}(\\d+)${PARK}`, 'g');
  return html.replace(
    parkedRe,
    (_match, index: string) => parked[Number(index)] ?? '',
  );
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

function renderOrderedList(
  lines: string[],
  base: string,
  options?: MarkdownOptions,
): string {
  const items = lines
    .map((line) => inline(line.replace(/^\d+\.\s+/, ''), base, options))
    .map((item) => `<li>${item}</li>`)
    .join('');
  return `<ol>${items}</ol>`;
}

function renderUnorderedList(
  lines: string[],
  base: string,
  options?: MarkdownOptions,
): string {
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
      html += `<li>${inline(nestedMatch[1]!, base, options)}</li>`;
      continue;
    }
    if (nestedOpen) {
      html += '</ul></li>';
      nestedOpen = false;
    } else if (topItemOpen) {
      html += '</li>';
    }
    const text = line.replace(/^-\s+/, '');
    html += `<li>${inline(text, base, options)}`;
    topItemOpen = true;
  }
  if (nestedOpen) html += '</ul></li>';
  else if (topItemOpen) html += '</li>';
  html += '</ul>';
  return html;
}

function renderTable(
  lines: string[],
  base: string,
  options?: MarkdownOptions,
): string {
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
    .map((cell) => `<th>${inline(cell, base, options)}</th>`)
    .join('')}</tr></thead>`;

  const bodyHtml = `<tbody>${rows
    .map((row) => {
      const padded = header.map((_, i) => row[i] ?? '');
      return `<tr>${padded
        .map((cell) => `<td>${inline(cell, base, options)}</td>`)
        .join('')}</tr>`;
    })
    .join('')}</tbody>`;

  return `<table>${headHtml}${bodyHtml}</table>`;
}

/**
 * A ```decklist fence. Each entry is `quantity name`; any other non-empty line
 * is a zone label (`Sideboard`, `Flex`). Every named card is linked and gains
 * the hover preview, so a list stays a list to write and becomes a browsable
 * one to read. Unknown names throw — the whole point is that no card in a
 * published list is left unlinked by a typo.
 */
/**
 * The only lines a decklist may carry beside its entries. An allowlist, not a
 * fallback: any other unquantified line is a card whose quantity or spelling
 * is wrong, and reading it as a zone heading would hide the card instead.
 */
const DECKLIST_ZONES = new Set([
  'main',
  'main deck',
  'deck',
  'sideboard',
  'extra',
  'extra deck',
  'flex',
]);

function renderDecklist(body: string, options?: MarkdownOptions): string {
  const resolve = requireResolver(options);
  let html = '<div class="decklist">';
  let listOpen = false;

  const closeList = () => {
    if (listOpen) html += '</ul>';
    listOpen = false;
  };

  for (const raw of body.split('\n')) {
    const line = raw.trim();
    if (line === '') continue;

    const entry = /^(\d+)\s+(.+)$/.exec(line);
    if (!entry) {
      const zone = mentionKey(line.replace(/\(.*\)/, '').replace(/:$/, ''));
      if (!DECKLIST_ZONES.has(zone)) {
        if (BASIC_LANDS.has(zone) || findsCard(resolve, line))
          throw new Error(`Decklist entry needs a quantity: ${line}`);
        throw new Error(`Unknown decklist line: ${line}`);
      }
      closeList();
      html += `<p class="decklist-zone">${escapeHtml(line)}</p>`;
      continue;
    }

    if (!listOpen) {
      html += '<ul class="decklist-lines">';
      listOpen = true;
    }
    const count = `<span class="decklist-count">${entry[1]!}</span>`;
    const name = entry[2]!.trim();
    let printed: string;
    if (BASIC_LANDS.has(mentionKey(name))) {
      printed = `<span class="decklist-land">${escapeHtml(name)}</span>`;
    } else {
      // The printed name comes from the catalog, so a list written with a
      // nickname or sloppy case still reads as the card's real name.
      const mention = resolve(name);
      printed = cardAnchor(mention, mention.name);
    }
    html += `<li>${count} ${printed}</li>`;
  }

  closeList();
  return `${html}</div>`;
}

function block(text: string, base: string, options?: MarkdownOptions): string {
  const lines = text.split('\n');

  if (lines.every((line) => /^-\s+|^\s{2,}-\s+/.test(line)))
    return renderUnorderedList(lines, base, options);

  if (lines.every((line) => /^\d+\.\s+/.test(line)))
    return renderOrderedList(lines, base, options);

  const fence = /^```(\S*)[^\n]*\n([\s\S]*)\n```$/.exec(text);
  if (fence) {
    if (fence[1] === 'decklist') return renderDecklist(fence[2]!, options);
    return `<pre><code>${escapeHtml(fence[2]!)}</code></pre>`;
  }

  const heading = /^(#{1,4})\s+(.+)$/.exec(text);
  if (heading) {
    const level = heading[1]!.length;
    const label = heading[2]!;
    const id = headingSlug(label);
    return `<h${level} id="${id}">${inline(label, base, options)}</h${level}>`;
  }

  if (lines.every((line) => /^>\s?/.test(line))) {
    const inner = lines.map((line) => line.replace(/^>\s?/, '')).join(' ');
    return `<blockquote><p>${inline(inner, base, options)}</p></blockquote>`;
  }

  if (
    lines.length >= 2 &&
    /^\|.*\|$/.test(lines[0]!.trim()) &&
    /^\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?$/.test(lines[1]!.trim())
  )
    return renderTable(lines, base, options);

  if (text.trim() === '---') return '<hr>';

  return `<p>${lines.map((line) => inline(line, base, options)).join('<br>')}</p>`;
}

export function renderSafeMarkdown(
  value: string,
  base = '/',
  options?: MarkdownOptions,
): string {
  return splitBlocks(value)
    .map((text) => block(text, base, options))
    .join('');
}

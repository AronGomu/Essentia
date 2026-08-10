import { readFile } from 'node:fs/promises';
import { parse } from '@astrojs/compiler';
import { describe, expect, it } from 'vitest';

const page = await readFile(
  new URL('../../src/pages/cards/[id].astro', import.meta.url),
  'utf8',
);
const { ast } = await parse(page);

type Node = {
  type: string;
  name?: string;
  value?: string;
  attributes?: Array<{ name?: string; value?: string }>;
  children?: Node[];
};

function hasClass(node: Node, className: string) {
  return Boolean(
    node.attributes?.some(
      (attribute) =>
        attribute.name === 'class' &&
        attribute.value?.split(/\s+/).includes(className),
    ),
  );
}

function find(
  node: Node,
  predicate: (candidate: Node) => boolean,
): Node | null {
  if (predicate(node)) return node;
  for (const child of node.children ?? []) {
    const match = find(child, predicate);
    if (match) return match;
  }
  return null;
}

function text(node: Node): string {
  return [node.value ?? '', ...(node.children ?? []).map(text)].join('').trim();
}

describe('card page detail order', () => {
  it('nests facts, Rules, Design notes, release history in DOM order', () => {
    const transcription = find(ast as Node, (node) =>
      hasClass(node, 'card-transcription'),
    );
    expect(transcription).not.toBeNull();

    const labels = (transcription!.children ?? [])
      .map((child) => {
        if (find(child, (node) => hasClass(node, 'card-facts'))) return 'facts';
        const heading = find(
          child,
          (node) =>
            node.name === 'h2' &&
            ['Rules', 'Design notes', 'Release history'].includes(text(node)),
        );
        return heading ? text(heading) : null;
      })
      .filter(Boolean);

    expect(labels).toEqual([
      'facts',
      'Rules',
      'Design notes',
      'Release history',
    ]);
  });
});

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const here = path.dirname(fileURLToPath(import.meta.url));
const css = readFileSync(
  path.join(here, '../../src/styles/global.css'),
  'utf8',
);

/**
 * Grab the body of the standalone rule for `selector`, i.e. the one whose
 * declarations actually drive the animation (as opposed to the
 * `prefers-reduced-motion` block, which also mentions these selectors as
 * part of a comma list but only ever sets `animation: none`).
 */
function ruleBody(selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const bodies = [
    ...css.matchAll(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`, 'g')),
  ].map((m) => m[1] ?? '');
  if (bodies.length === 0) throw new Error(`rule not found: ${selector}`);
  const driving =
    bodies.length === 1
      ? bodies[0]
      : bodies.find((body) => /animation:\s*page-fade-/.test(body));
  if (driving === undefined)
    throw new Error(`driving rule not found: ${selector}`);
  return driving;
}

function animationValue(body: string): string {
  const match = body.match(/animation:\s*([^;]+);/);
  if (!match) throw new Error('rule has no animation declaration');
  return match[1] ?? '';
}

function firstTime(value: string): string {
  const match = value.match(/\b\d+(?:\.\d+)?(?:ms|s)\b/);
  if (!match) throw new Error('no time value found');
  return match[0];
}

describe('page transition cross-fade', () => {
  it('cross-fades with no delay', () => {
    const animation = animationValue(ruleBody('::view-transition-new(root)'));
    // name duration timing-function [delay] iteration-count direction fill-mode …
    // A delay would appear as a second time value (a token ending in ms/s)
    // after the duration. Only one time value should be present.
    const timeValues = animation.match(/\b\d+(?:\.\d+)?(?:ms|s)\b/g) ?? [];
    expect(timeValues).toHaveLength(1);
  });

  it('uses one duration for both halves', () => {
    const oldAnimation = animationValue(
      ruleBody('::view-transition-old(root)'),
    );
    const newAnimation = animationValue(
      ruleBody('::view-transition-new(root)'),
    );
    expect(firstTime(oldAnimation)).toBe(firstTime(newAnimation));
  });

  it('keeps the pair unisolated', () => {
    const body = ruleBody('::view-transition-image-pair(root)');
    expect(body).toMatch(/isolation:\s*auto\s*;/);
  });

  it('drops the legacy black-dip keyframes', () => {
    expect((css.match(/fade-to-black/g) ?? []).length).toBe(0);
    expect((css.match(/fade-from-black/g) ?? []).length).toBe(0);
  });

  it('stops re-animating main', () => {
    const mainRules = css.match(/main\s*\{[^}]*\}/g) ?? [];
    for (const rule of mainRules) {
      expect(rule).not.toMatch(/animation:/);
    }
  });
});

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const here = path.dirname(fileURLToPath(import.meta.url));
const source = readFileSync(
  path.join(here, '../../src/styles/global.css'),
  'utf8',
);
// Assert against declarations only. The sheet documents *why* the view
// transition is gone, and that prose necessarily names the very at-rule and
// pseudo-elements these tests forbid — matching raw text would fail on the
// explanation rather than on a real opt-in.
const css = source.replace(/\/\*[\s\S]*?\*\//g, '');

/**
 * The site opts out of cross-document view transitions. Enabling them put a
 * white flash between the click and the cross-fade — an A/B on the same build
 * showed the flash disappear under `navigation: none` and return under `auto`.
 * Navigation is an instant cut; ordinary CSS transitions on hover surfaces are
 * unaffected and still expected.
 */
describe('page transition', () => {
  it('keeps the cross-document view transition switched off', () => {
    // `@view-transition { navigation: auto }` is the opt-in; the pseudo-element
    // rules only ever matter once it is present.
    expect(css).not.toMatch(/@view-transition\b/);
    expect(css).not.toMatch(/::view-transition/);
  });

  it('drops the page-fade and legacy black-dip keyframes', () => {
    expect((css.match(/page-fade/g) ?? []).length).toBe(0);
    expect((css.match(/fade-to-black/g) ?? []).length).toBe(0);
    expect((css.match(/fade-from-black/g) ?? []).length).toBe(0);
  });

  it('keeps the ordinary hover transitions', () => {
    // Guards the opposite mistake: removing the page transition must not turn
    // into a sweep that strips every `transition:` in the sheet.
    const declarations = css.match(/^\s*transition(?:-[a-z]+)?\s*:/gm) ?? [];
    expect(declarations.length).toBeGreaterThan(0);
  });

  it('stops re-animating main', () => {
    // Match on the selector *list*, not on `main` as a lone selector: the
    // regression that started this was `main, aside { animation: … }`, which a
    // `/main\s*\{/` pattern never sees.
    const mainRules = [...css.matchAll(/([^{}]*)\{([^{}]*)\}/g)].filter(
      (rule) =>
        (rule[1] ?? '')
          .split(',')
          .map((selector) => selector.trim())
          .some(
            (selector) => selector === 'main' || /^main[\s:[.#]/.test(selector),
          ),
    );
    expect(mainRules.length).toBeGreaterThan(0);
    for (const rule of mainRules) {
      expect(rule[2] ?? '').not.toMatch(/animation(?:-name)?\s*:/);
    }
  });
});

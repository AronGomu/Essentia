# T9: Markdown images with % scale

**Plan:** `./ai-artifacts/PLAN_2026_08_12_feedback_batch_2.md`
**Depends:** T8
**Commit outcome:** docs and blog markdown render `![alt](/path)` images, optional `![alt|60%](/path)` scales them, and `/docs/` shows the Nekroz Trishula render at 60%.

## Context (self-contained)

- Goal: feedback batch 2 — cut dev/CI loop cost and fix website card surfaces. This ticket = markdown images (item 11), last slice.
- The renderer is a hand-written safe subset (`src/lib/markdown.ts`) with no image rule at all, so both syntax and scaling are ours to define. Owner chose `![alt|60%](/path)`.
- **Percentage scale is possible, but not through `style=""`**: `harden-csp.mjs` rejects `'unsafe-hashes'` and `scan-dist.mjs` fails any `unsafe-*` CSP token, so per-element style attributes are dead on this site (dist currently contains zero of them). The scale therefore ships as a **class ladder in 5% steps** (`.md-image-scale-60 { width: 60% }`), which is CSP-safe and covers 5–100%.
- This slice: parser rule + CSS ladder + one test image in the docs corpus.
- Out of scope here: `<figure>`/caption syntax, external image hosts, responsive `srcset` for markdown images, lightboxes, changing card image tiers, anything from T1-T8.
- Assumptions in force: image URLs must be site-absolute (`/…`); external and `data:` sources are rejected because CSP is `img-src 'self' data:` and remote art has no rights record. A site-absolute path does not resolve when the same `.md` is read on GitHub — accepted, the website is the target surface.
- **From T8:** `BaseLayout.astro` has `page?`/`background?` props and injects a hashed `<style>` for `--page-photo`; `global.css` `body::before` now paints atmosphere + dim veil + `var(--page-photo, none)`; `public/backgrounds/*.webp` exist with provenance. Nothing from T8 is edited here.

## Requirements

- Syntax: `![alt](/path)` and `![alt|N%](/path)` where `N` is a multiple of 5 in 5…100. No scale means 100%.
- Emitted markup: `<img class="md-image md-image-scale-N" src="<base-prefixed path>" alt="<alt>" loading="lazy" decoding="async">`. Alt may be empty.
- The image rule runs **before** the link rule and its output is parked, so `![x](/y)` never turns into `!<a …>x</a>` and the `<img>` is never re-processed by emphasis rules.
- Rejections throw with a clear message: `Unsafe Markdown image URL: <url>` for anything not starting `/`, and `Unsupported Markdown image scale: <token>` for a non-multiple of 5 or out-of-range value.
- CSS: one `.md-image` base rule plus 20 authored `.md-image-scale-{5,10,…,100}` rules in `@layer components`.
- Docs test image: `docs/PRESENTATION.md` gains one image line pointing at `/generated/releases/alpha-LOTA-0001-Alpha-0-1/nekroz-trishula-display.webp` at `60%`, visible at `http://localhost:4201/docs/`.

## Inputs

- `website/src/lib/markdown.ts` — `inline(value, base)` escapes HTML first (`escapeHtml`), then: parks link tags via `html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, …)` with the URL guard `if (!/^(?:https:\/\/|mailto:|#|\/)/i.test(url)) throw new Error(\`Unsafe Markdown URL: ${url}\`)` and base prefixing `url.startsWith('/') ? \`${base.replace(/\/$/, '')}${url}\` : url`; then parks code spans; then applies `**strong**` and `_em_`; then restores parked fragments via the `PARK = '\uE000'` sentinel and `park()` helper. Exported: `headingSlug`, `renderSafeMarkdown(value, base = '/')`.
- `website/src/components/Markdown.astro` — `renderSafeMarkdown(value, import.meta.env.BASE_URL)` into `<div class={className} set:html={html} />`.
- `website/scripts/content/docs.mjs` — `rewriteDocLinks(body, relativePath, knownPaths)` runs `body.replace(/\[([^\]]+)\]\(([^)]+)\)/g, …)` and returns the match unchanged when the URL starts with `/`, so `![alt|60%](/generated/…)` passes through untouched. `MAX_DOC_BYTES = 262_144`.
- `website/src/lib/docs.ts` — `docDescription` already strips `!\[[^\]]*\]\([^)]*\)` from meta descriptions, so no change is needed there.
- `website/tests/unit/markdown.test.ts` — existing style: `expect(renderSafeMarkdown('…', '/YGO-x-MTG/')).toContain('href="/YGO-x-MTG/…"')`, `expect(() => renderSafeMarkdown('[bad](javascript:alert(1))')).toThrow('Unsafe Markdown URL')`.
- `website/tests/unit/docs-corpus.test.ts` — exercises `docRoute`, `rewriteDocLinks`, `loadDocs` against temp fixtures; `docRoute('docs/PRESENTATION.md') === '/docs/'`.
- `docs/PRESENTATION.md` — the doc rendered at `/docs/`.
- Existing generated asset (present after `npm run content`): `website/public/generated/releases/alpha-LOTA-0001-Alpha-0-1/nekroz-trishula-display.webp` (151 KB, 750 px wide).
- `website/src/styles/global.css` — `@layer components`; `.reading-body` rules start at line 1554; tokens `--ruleline`, `--space-4` (check the tokens block for the exact spacing token in use and pick the nearest existing one).
- **From T8:** see Context.

## TDD

1. **Red** — extend `tests/unit/markdown.test.ts` with the 7 cases below, add `tests/unit/markdown-image-css.test.ts`, add `tests/e2e/docs-image.spec.ts`. All fail.
2. **Green** — impl steps 2-6.
3. **Refactor** — none.

## Test plan

| Test                                                | Input                                                                    | Expect                                                                                     |
| --------------------------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| `renders an image`                                  | `![Trishula](/generated/x.webp)`                                          | contains `<img class="md-image md-image-scale-100" src="/generated/x.webp" alt="Trishula" loading="lazy" decoding="async">` |
| `applies a percentage scale`                        | `![Trishula\|60%](/generated/x.webp)`                                     | class contains `md-image-scale-60`, `alt="Trishula"` (no `\|60%` in alt)                     |
| `prefixes the deployment base`                      | same, base `'/YGO-x-MTG/'`                                                | `src="/YGO-x-MTG/generated/x.webp"`                                                         |
| `does not linkify an image`                         | `![x](/y.webp)`                                                           | no `<a` in output, no literal `!` before the tag                                            |
| `rejects an external image`                         | `![x](https://example.com/y.png)`                                         | throws `Unsafe Markdown image URL`                                                          |
| `rejects an unsupported scale`                      | `![x\|63%](/y.webp)` and `![x\|0%](/y.webp)`                              | throws `Unsupported Markdown image scale`                                                   |
| `keeps a bang before a real link intact`            | `Wow! [link](/a/)`                                                        | renders `<a href="/a/">link</a>` and the `!` stays in the text                               |
| `ladder covers 5 to 100 in fives`                   | `global.css`                                                              | 20 `.md-image-scale-N { width: N% }` rules present, none missing, none extra                 |
| e2e `docs index shows the scaled card image`        | `/docs/`                                                                  | `img.md-image` visible, `naturalWidth > 0`, class includes `md-image-scale-60`, box width ≈ 60% of `.reading-body` width ±2% |

## Impl steps

- [ ] 1. Write the three test files/additions.
- [ ] 2. In `website/src/lib/markdown.ts`, add above `inline`:

  ```ts
  const IMAGE_SCALES = Array.from({ length: 20 }, (_unused, index) => (index + 1) * 5);

  function imageScale(token: string | undefined): number {
    if (token === undefined) return 100;
    const value = Number(token);
    // The scale is a CSS class, not an inline style: this site's CSP forbids
    // per-element `style` attributes, so only the authored ladder can be used.
    if (!IMAGE_SCALES.includes(value))
      throw new Error(`Unsupported Markdown image scale: ${token}%`);
    return value;
  }
  ```

- [ ] 3. In `inline()`, insert the image rule **immediately before** the link rule (after `let html = escapeHtml(value).replaceAll(PARK, '');`):

  ```ts
  html = html.replace(
    /!\[([^\]|]*)(?:\|(\d{1,3})%)?\]\(([^)\s]+)\)/g,
    (_match, alt: string, rawScale: string | undefined, rawUrl: string) => {
      const url = rawUrl.trim();
      if (!url.startsWith('/'))
        throw new Error(`Unsafe Markdown image URL: ${url}`);
      const scale = imageScale(rawScale);
      const src = `${base.replace(/\/$/, '')}${url}`;
      return park(
        `<img class="md-image md-image-scale-${scale}" src="${src}" alt="${alt}" loading="lazy" decoding="async">`,
      );
    },
  );
  ```

  Parking the whole tag is what keeps the link rule and the emphasis rules off it.

- [ ] 4. In `website/src/styles/global.css`, inside `@layer components` next to the `.reading-body` rules, add:

  ```css
  .md-image {
    display: block;
    height: auto;
    margin-block: 1.5rem;
    margin-inline: auto;
    border: 1px solid var(--ruleline);
    border-radius: 0.5rem;
  }
  ```

  followed by 20 authored rules `.md-image-scale-5 { width: 5%; }` … `.md-image-scale-100 { width: 100%; }` (write all 20; no preprocessor is in use).

- [ ] 5. In `docs/PRESENTATION.md`, add one image line in a sensible place in the prose (own paragraph, blank line above and below):

  ```md
  ![Nekroz of Trishula card render|60%](/generated/releases/alpha-LOTA-0001-Alpha-0-1/nekroz-trishula-display.webp)
  ```

- [ ] 6. `cd website && npm run content && npm run build && npx playwright test tests/e2e/docs-image.spec.ts`.

## Outputs

- Files touched: `website/src/lib/markdown.ts`, `website/src/styles/global.css`, `docs/PRESENTATION.md`, `website/tests/unit/markdown.test.ts`, `website/tests/unit/markdown-image-css.test.ts` (new), `website/tests/e2e/docs-image.spec.ts` (new).
- Public API change: markdown corpus (docs + blog + section intros + explanations) accepts `![alt](/path)` and `![alt|N%](/path)`.
- Migrations/config: none. Existing corpus contains no `![…]` syntax, so nothing changes retroactively.

## Validation

- [ ] `cd website && npx vitest run` — no new failures; all image cases pass
- [ ] `cd website && npm run check && npm run lint && npm run format:check`
- [ ] `cd website && npm run build` — `scan-dist` and `harden-csp` must pass, proving no inline style was introduced
- [ ] `cd website && npm run links:check`
- [ ] `cd website && npx playwright test tests/e2e/docs-image.spec.ts tests/e2e/smoke.spec.ts`
- [ ] manual check: `npm run dev`, open `http://localhost:4201/docs/` — Trishula render appears at ~60% of the reading column
- [ ] full batch re-check: `python -m unittest discover -s tests` (21 baseline failures), `python .script/lint_mse_card_style.py` (198 baseline findings, 200 stdout lines), `cd website && npm run ci`
- [ ] commit msg draft: `feat(website): render markdown images with an authored scale ladder`

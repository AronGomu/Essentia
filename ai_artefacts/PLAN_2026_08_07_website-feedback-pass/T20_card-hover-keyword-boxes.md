# T20: Hover keyword boxes

**Plan:** `./ai_artefacts/PLAN_2026_08_07_website-feedback-pass.md`
**Depends:** T18
**Commit outcome:** hovering or focusing a card link shows the enlarged render plus one rounded-border box per Essentia-specific keyword on that card, each carrying its ruling.

## Context (self-contained)

- Goal: ship the UX feedback backlog in `.dev/feedback.md`. Feedback **Card Hover**: "When hovering card and showing bigger picture next to it, also add 1 rounded border textbox for each essentia specific keyword with actual text ruling."
- This slice: the shared hover-preview overlay and the `data-` attributes the trigger elements already carry.
- Out of scope here: the inline rulings inside card rules text (T19) and the card page layout. The two features share the registry but no code.
- Assumptions in force: "essentia specific" means `origin === 'essentia'` in the keyword registry — Magic evergreens like Flying and Trample get no box. The keyword list travels in a `data-` attribute on the trigger, and the ruling text comes from a single JSON payload emitted once per page.

## Requirements

- Every element that already carries `data-card-preview` also carries `data-card-keywords` — a comma-separated list of the card's Essentia keyword terms, empty attribute when none.
- `BaseLayout` emits one `<script type="application/json" id="keyword-rulings">` payload mapping term → ruling, containing only `origin === 'essentia'` keywords.
- The hover overlay renders the image plus, below it, one `<p class="keyword-ruling"><strong>{term}</strong> {ruling}</p>` per keyword, in the card's keyword order.
- The overlay stays hidden on coarse pointers and narrow viewports, exactly as today.
- No CSP change: the JSON block is inline content that `harden-csp.mjs` already hashes.

## Inputs

- `website/src/components/CardHoverPreview.astro` — today it is a bare `<img class="card-hover-preview" alt="" aria-hidden="true" width="400" height="559" decoding="async">` plus an inline `<script>` that: finds the image, tracks `active`, computes `placePreview(target)` from `target.getBoundingClientRect()` (`gap = 16`, width `Math.min(400, window.innerWidth - gap*2)`, sets `--preview-left` / `--preview-top`), and wires `pointerover`, `pointerout`, `focusin`, `focusout`, `scroll`, `resize` against `target.closest('[data-card-preview]')`. Restructure it into a wrapper element without changing the positioning maths.
- `website/src/styles/global.css` — `.card-hover-preview` positioning rules, plus the end-of-file `@media (hover: none), (pointer: coarse), (max-width: 58rem) { .card-hover-preview { display: none; } }` block that must keep suppressing the whole overlay.
- Trigger sites that set `data-card-preview` today: `website/src/pages/index.astro` (new-cards grid), `website/src/components/CardGallery.astro` (gallery cards). Add the keyword attribute at both.
- `website/src/lib/catalog.ts` — `CatalogCard.keywords: string[]` holds the normalised terms extracted from the card's bold text at build time.
- `website/src/layouts/BaseLayout.astro` — the place to emit the JSON payload, next to the existing `<CardHoverPreview />` call in `<body>`.
- `website/scripts/harden-csp.mjs` — hashes every inline `<script>` without a `src`, so the JSON block is covered automatically; it throws if any `'unsafe-inline'` survives.
- **From Depends (T18):** `catalog.keywords` entries are `{ id, term, category, archetype, definition, origin, doc }`; `website/src/lib/catalog.ts` exports `essentiaKeywordsByTerm: Map<string, CatalogKeyword>` holding the 51 entries with `origin === 'essentia'`.

## TDD

1. **Red** — write `website/tests/unit/hover-keywords.test.ts` against a new pure helper `essentiaKeywordsFor` in `website/src/lib/catalog.ts`, and add a gate case to `website/tests/unit/chrome.test.ts`. Both fail.
2. **Green** — add the helper, emit the payload, restructure the overlay, add the attributes.
3. **Refactor** — none.

Exact helper:

```ts
/** The card's keywords that Essentia defines, in printed order, each with its ruling. */
export function essentiaKeywordsFor(card: { keywords: string[] }): Array<{ term: string; definition: string }>
```

Gate rule added to `chromeIssues(file, html, base)`, all files:

- `${file}: card preview triggers must carry keyword data` when the html contains `data-card-preview="` at least once and does not contain `data-card-keywords="` at least as often

Overlay markup after restructuring:

```html
<aside class="card-hover-preview" aria-hidden="true">
  <img alt="" width="400" height="559" decoding="async" />
  <div class="keyword-rulings"></div>
</aside>
```

The script sets `preview.querySelector('img').src`, then rebuilds `.keyword-rulings` from the trigger's `data-card-keywords` split on `,` (dropping empties), looking each term up in the parsed `#keyword-rulings` JSON, and appending one `<p class="keyword-ruling">` per hit with `textContent` assignment only — never `innerHTML`.

## Test plan

| Test | Input | Expect |
| ---- | ----- | ------ |
| `returns Essentia keywords with rulings` | `essentiaKeywordsFor({ keywords: ['Bounce', 'Flying'] })` | one entry, `term === 'Bounce'`, non-empty `definition` |
| `drops Magic evergreens` | `essentiaKeywordsFor({ keywords: ['Flying', 'Trample'] })` | `[]` |
| `preserves printed order` | `['Search', 'Bounce']` | terms come back in that order |
| `ignores unknown terms` | `['Not A Keyword']` | `[]` |
| `flags a page whose triggers lack keyword data` | html with one `data-card-preview="…"` and no `data-card-keywords` | contains `card preview triggers must carry keyword data` |
| `accepts a page with both attributes` | html with matching counts | no such complaint |

Run: `cd website && npx vitest run tests/unit/hover-keywords.test.ts tests/unit/chrome.test.ts`

## Impl steps

- [ ] 1. Add the six cases above to the two test files.
- [ ] 2. Add `essentiaKeywordsFor` to `website/src/lib/catalog.ts`, built on `essentiaKeywordsByTerm`.
- [ ] 3. In `website/src/layouts/BaseLayout.astro`, compute `const keywordRulings = Object.fromEntries(catalog.keywords.filter((keyword) => keyword.origin === 'essentia').map((keyword) => [keyword.term, keyword.definition]));` and emit `<script type="application/json" id="keyword-rulings" set:html={JSON.stringify(keywordRulings)}></script>` immediately before `<CardHoverPreview />`.
- [ ] 4. Restructure `website/src/components/CardHoverPreview.astro` to the `<aside>` markup above; keep every existing event listener, the `placePreview` maths, and the `is-visible` class toggle on the `<aside>` instead of the `<img>`.
- [ ] 5. In the script, parse the payload once: `const rulings = JSON.parse(document.getElementById('keyword-rulings')?.textContent ?? '{}')`. In `showPreview`, clear `.keyword-rulings` with `replaceChildren()` and append one `<p class="keyword-ruling">` per resolved term, building the `<strong>` and the text node with `document.createElement` / `textContent`.
- [ ] 6. In `website/src/components/CardGallery.astro` and `website/src/pages/index.astro`, add `data-card-keywords={essentiaKeywordsFor(card).map((entry) => entry.term).join(',')}` to every element that already has `data-card-preview`. `GalleryCard` does not carry `keywords` today — add `'keywords'` to its `Pick` list and to `toGalleryCard` in `website/src/lib/catalog.ts`.
- [ ] 7. Add the gate rule to `website/scripts/check-chrome.mjs`.
- [ ] 8. Add to `website/src/styles/global.css`:
      `.card-hover-preview { display: grid; gap: 0.5rem; }` (keeping the existing fixed positioning rules on the same selector),
      `.keyword-rulings { display: grid; gap: 0.4rem; }`,
      `.keyword-ruling { border: 1px solid var(--ruleline); border-radius: 0.6rem; padding: 0.45rem 0.6rem; margin: 0; font-size: 0.8rem; background: var(--blackfoil-raised); color: var(--cardstock); max-width: 400px; }`,
      `.keyword-ruling strong { color: var(--accent); margin-right: 0.35rem; }`.
- [ ] 9. Verify the existing coarse-pointer media query still targets `.card-hover-preview` and therefore hides the boxes too.
- [ ] 10. Run `npm run build` (which runs `harden-csp.mjs`), `npm run budgets:check`, `npm run format`, `npm run lint`, `npm run check`.

## Outputs

- Files touched: `website/src/lib/catalog.ts`, `website/src/layouts/BaseLayout.astro`, `website/src/components/CardHoverPreview.astro`, `website/src/components/CardGallery.astro`, `website/src/pages/index.astro`, `website/src/styles/global.css`, `website/scripts/check-chrome.mjs`, `website/tests/unit/hover-keywords.test.ts` (new), `website/tests/unit/chrome.test.ts`.
- Public API: `essentiaKeywordsFor`; `GalleryCard` gains `keywords`.
- No migration.

## Validation

- [ ] `cd website && npx vitest run tests/unit/hover-keywords.test.ts tests/unit/chrome.test.ts` — all pass
- [ ] `cd website && npm run build` — `csp: hashed inline content in <n> HTML files`, no `unsafe-inline` error
- [ ] `cd website && npm run budgets:check` — exit 0
- [ ] manual check: `node scripts/serve-dist.mjs` at ≥ 1200 px, hover a Nekroz card in a gallery — the big render appears with one rounded box per Essentia keyword; hovering a card whose only keywords are Magic evergreens shows the render alone
- [ ] manual check: tab to a card link with the keyboard — the same overlay appears
- [ ] manual check at 390 px — no overlay at all
- [ ] `cd website && npm run ci` — exit 0
- [ ] app functional — hover positioning is unchanged near the viewport edges
- [ ] commit msg draft: `feat(website): show Essentia keyword rulings in the card hover preview`

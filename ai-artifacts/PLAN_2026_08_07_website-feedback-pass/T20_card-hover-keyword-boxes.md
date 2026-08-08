# T20: Hover keyword boxes

**Plan:** `./ai-artifacts/PLAN_2026_08_07_website-feedback-pass.md`
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

- [x] 1. Add the six cases above to the two test files. — `website/tests/unit/hover-keywords.test.ts` (new, 4 cases) + 2 gate cases added to `website/tests/unit/chrome.test.ts`; confirmed red (`essentiaKeywordsFor is not a function`, gate assertions failing) before implementation.
- [x] 2. Add `essentiaKeywordsFor` to `website/src/lib/catalog.ts`, built on `essentiaKeywordsByTerm`.
- [x] 3. In `website/src/layouts/BaseLayout.astro`, compute `keywordRulings` and emit the `<script type="application/json" id="keyword-rulings">` payload immediately before `<CardHoverPreview />`. — verified in `dist/index.html`: 51-entry JSON object, `Flying` absent.
- [x] 4. Restructure `website/src/components/CardHoverPreview.astro` to the `<aside>` markup above; keep every existing event listener, the `placePreview` maths, and the `is-visible` class toggle on the `<aside>`. — verified `dist/index.html` contains exactly `<aside class="card-hover-preview" aria-hidden="true"><img alt="" width="400" height="559" decoding="async"><div class="keyword-rulings"></div></aside>`.
- [x] 5. Parse the payload once and rebuild `.keyword-rulings` in `showPreview` via `replaceChildren()` + `createElement`/`textContent` only. — verified in bundled `dist/index.html` inline script: `n.replaceChildren();...i.className=\`keyword-ruling\`;...a.textContent=t,i.append(a,document.createTextNode(...))` — no `innerHTML`.
- [x] 6. Add `data-card-keywords` to every element carrying `data-card-preview`, and add `'keywords'` to `GalleryCard`'s `Pick` list and `toGalleryCard`. — **Plan defect found**: the ticket's Inputs list named only `CardGallery.astro` and `index.astro` as trigger sites, but `website/src/pages/updates/index.astro` also sets `data-card-preview` (grep: `grep -rln "data-card-preview" src/` → 4 files, not 2). Fixed all three call sites with the identical pattern; the `check-chrome.mjs` gate rule (step 7) would otherwise fail the build on `updates/index.html`.
- [x] 7. Add the gate rule to `website/scripts/check-chrome.mjs`. — **Bug found during validation**: Astro serialises an empty-string attribute (`data-card-keywords=""`) as the bare boolean form `data-card-keywords` with no `="..."`, so the literal `data-card-keywords="` match specified undercounted real pages. Widened the regex to `/data-card-keywords(?:="[^"]*")?[\s>]/g` and added a regression test (`accepts the Astro-collapsed boolean form of an empty attribute`) to `chrome.test.ts`.
- [x] 8. Add the four CSS rules to `website/src/styles/global.css`. — verified in `dist/_astro/*.css`: `.card-hover-preview{...gap:.5rem;display:grid;...}`, `.keyword-rulings{gap:.4rem;display:grid}`, `.keyword-ruling{border:1px solid var(--ruleline);...max-width:400px;...}`, `.keyword-ruling strong{color:var(--accent);margin-right:.35rem}` all present.
- [x] 9. Verify the existing coarse-pointer media query still targets `.card-hover-preview`. — confirmed unchanged in `website/src/styles/global.css:1479-1483` and present in built CSS: `@media (hover:none),(pointer:coarse),(width<=58rem){.card-hover-preview{display:none}}`.
- [x] 10. Run `npm run build`, `npm run budgets:check`, `npm run format`, `npm run lint`, `npm run check`. — all exit 0 (see Validation section).

## Outputs

- Files touched: `website/src/lib/catalog.ts`, `website/src/layouts/BaseLayout.astro`, `website/src/components/CardHoverPreview.astro`, `website/src/components/CardGallery.astro`, `website/src/pages/index.astro`, `website/src/styles/global.css`, `website/scripts/check-chrome.mjs`, `website/tests/unit/hover-keywords.test.ts` (new), `website/tests/unit/chrome.test.ts`.
- Public API: `essentiaKeywordsFor`; `GalleryCard` gains `keywords`.
- No migration.

## Validation

- [x] `cd website && npx vitest run tests/unit/hover-keywords.test.ts tests/unit/chrome.test.ts` — pass: `Test Files 2 passed (2)`, `Tests 34 passed (34)`.
- [x] `cd website && npm run build` — `csp: hashed inline content in 151 HTML files`, no `unsafe-inline` error, `chrome: 151 pages carry the site header`.
- [x] `cd website && npm run budgets:check` — exit 0: `budgets: 9 JS, 151 HTML, 205 images, 50 print masters (16 MiB) within limits`.
- [x] manual check substituted (no browser harness on this host, logged per task instructions): static inspection of `dist/index.html` and `dist/archetypes/burning-abyss/index.html` — a Nekroz/Burning Abyss gallery-card `<a>` carries `data-card-preview` plus `data-card-keywords="Abyssal Curse,Descent,On Send Grave"` etc.; the payload script and `<aside class="card-hover-preview">…<div class="keyword-rulings"></div></aside>` are present and wired; `essentiaKeywordsFor` unit tests cover "Magic evergreens dropped" (`Flying`/`Trample` → `[]`) so a card with only evergreen keywords renders the aside with an empty `.keyword-rulings`.
- [x] manual check substituted: `focusin`/`focusout` listeners are unchanged in the bundled script (verified in `dist/index.html` inline `<script type="module">`) and use the same `[data-card-preview]` closest-match as `pointerover`/`pointerout`, so keyboard tab triggers the identical `showPreview` path — no separate behaviour to lose.
- [x] manual check substituted: the coarse-pointer/narrow-viewport media query `@media (hover:none),(pointer:coarse),(width<=58rem){.card-hover-preview{display:none}}` is unchanged and present in the built CSS; since `.card-hover-preview` is now the `<aside>` wrapping both image and keyword boxes, `display:none` hides the whole overlay including the boxes at ≤58rem/coarse pointers (covers the 390px case).
- [x] `cd website && npm run ci` — exit 0 (`format:check && lint && check && test && build` all passed; 219/219 unit tests, `astro check`: 0 errors).
- [x] app functional — `placePreview` maths (`gap = 16`, `width = Math.min(400, window.innerWidth - gap*2)`, left/top formulas) copied unchanged into the restructured component; verified byte-identical logic in the bundled `dist/index.html` script.
- [x] commit msg draft: `feat(website): show Essentia keyword rulings in the card hover preview`

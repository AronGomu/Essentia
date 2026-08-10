# T10: Site-wide breadcrumb

**Plan:** `./ai-artifacts/PLAN_2026_08_07_website-feedback-pass.md`
**Depends:** T1
**Commit outcome:** every page except the home page shows one left-aligned breadcrumb in the site header, replacing the ad-hoc "Archive / Archetypes" and "<Section> / Card" paragraphs.

## Context (self-contained)

- Goal: ship the UX feedback backlog in `.dev/feedback.md`. Feedback **Archetype #3**: "Move 'Archive / Archetypes' breadcrumb to left side of header. Make breadcrumb general for all pages."
- This slice: the component, the layout slot, and its adoption by the pages that exist today. Pages added by other tickets adopt it in their own tickets.
- Out of scope here: the archetype page's gallery, sorting, badges, and hero art (T16). Only the breadcrumb line moves.
- Assumptions in force: the home page shows no breadcrumb. The breadcrumb is a `<nav aria-label="Breadcrumb">` with an ordered list; the last item is the current page and is not a link.

## Requirements

- New component `website/src/components/Breadcrumb.astro` with `interface Props { items: Array<{ label: string; href?: string }> }`.
- `BaseLayout` accepts an optional `breadcrumb` prop and renders it as the **first** child of `<header class="site-header">`, before `.compact-brand`.
- Every page that currently prints an inline breadcrumb paragraph passes `breadcrumb` instead and deletes the paragraph.
- The chrome gate learns the rule: any page other than `index.html` and `404.html` must contain `<nav class="breadcrumb"`.

## Inputs

- `website/src/layouts/BaseLayout.astro` — `interface Props { title; description; image?; accent?; theme? }` at lines 10–16, destructured at 17–23; `<header class="site-header">` at line 71 currently holds `.compact-brand`, `.utility-nav`, and `SearchPalette`.
- `website/src/pages/archetypes/[slug].astro` line 34 — `<p><a href={base}>Archive</a> / Archetypes</p>` inside `.catalog-hero`. Delete it.
- `website/src/pages/cards/[id].astro` line 69 — `<p><a href={withBase(base, section.route)}>{section.label}</a> / Card</p>` inside `.card-transcription`. Delete it.
- `website/src/pages/sections/non-archetype/[slug].astro` — check for the same pattern and delete it if present.
- `website/src/pages/cards/[id]/versions/[package].astro`, `website/src/pages/releases/[stage]/[package].astro`, `website/src/pages/updates/index.astro`, `website/src/pages/rules/index.astro`, `website/src/pages/philosophy/index.astro`, `website/src/pages/legal/index.astro` — each needs a `breadcrumb` prop.
- `website/src/styles/global.css` — `.site-header` is a flex row (see the `.utility-nav` block near line 220). Add `.breadcrumb` styles there.
- `website/scripts/check-chrome.mjs` — created in T9 if that ticket landed first. **If it does not exist yet**, create it in this ticket with only the breadcrumb rule and the same `chromeIssues(file, html, base)` signature and CLI tail described below; T9 then adds its link rules to the same file.
- **From Depends (T1):** `npm run preflight` passes. Nothing else consumed.

## TDD

1. **Red** — add `breadcrumb` cases to `website/tests/unit/chrome.test.ts` (create the file if T9 has not run yet). They fail.
2. **Green** — add the rule to `chromeIssues`, build the component, thread the prop through every page.
3. **Refactor** — none.

Gate rule added to `chromeIssues(file, html, base)`:

- `${file}: page is missing a breadcrumb` when `file !== 'index.html'`, `file !== '404.html'`, and `html` does not contain `<nav class="breadcrumb"`.

Breadcrumb values per page (exact):

| Page | Items |
| --- | --- |
| `/archetypes/<slug>/` | `[{ label: 'Archive', href: base }, { label: 'Archetypes' }, { label: section.label }]` |
| `/sections/non-archetype/<slug>/` | `[{ label: 'Archive', href: base }, { label: 'Sections' }, { label: section.label }]` |
| `/cards/<id>/` | `[{ label: 'Archive', href: base }, { label: section.label, href: withBase(base, section.route) }, { label: card.name }]` |
| `/cards/<id>/versions/<package>/` | `[{ label: 'Archive', href: base }, { label: card.name, href: withBase(base, card.route) }, { label: `${version.stageLabel} ${version.version}` }]` |
| `/releases/<stage>/<package>/` | `[{ label: 'Archive', href: base }, { label: 'Releases' }, { label: release.setName }]` |
| `/updates/` | `[{ label: 'Archive', href: base }, { label: 'Card updates' }]` |
| `/rules/` | `[{ label: 'Archive', href: base }, { label: 'Rules' }]` |
| `/philosophy/` | `[{ label: 'Archive', href: base }, { label: 'Philosophy' }]` |
| `/legal/` | `[{ label: 'Archive', href: base }, { label: 'Licence & attribution' }]` |

## Test plan

| Test | Input | Expect |
| ---- | ----- | ------ |
| `accepts a page with a breadcrumb` | `chromeIssues('rules/index.html', '<nav class="breadcrumb">…</nav>', '/')` | no breadcrumb complaint |
| `flags a page without one` | `chromeIssues('rules/index.html', '<html></html>', '/')` | contains `page is missing a breadcrumb` |
| `exempts the home page` | `chromeIssues('index.html', '<html></html>', '/')` | no breadcrumb complaint |
| `exempts the 404 document` | `chromeIssues('404.html', '<html></html>', '/')` | `[]` |

Run: `cd website && npx vitest run tests/unit/chrome.test.ts`

## Impl steps

- [x] 1. Add the four cases above to `website/tests/unit/chrome.test.ts`, creating the file if absent. — Evidence: cases added; red confirmed (`flags a page without one` failed pre-fix), then all 9 tests passed after step 2.
- [x] 2. Add the breadcrumb rule to `website/scripts/check-chrome.mjs`, creating the file (with CLI tail and the `build`-script wiring `&& node scripts/check-chrome.mjs`) if absent. — Evidence: file already existed (T9 landed first); rule added; `npx vitest run tests/unit/chrome.test.ts` → 9 passed.
- [x] 3. Create `website/src/components/Breadcrumb.astro`:
      `<nav class="breadcrumb" aria-label="Breadcrumb"><ol>{items.map((item, index) => <li>{item.href && index < items.length - 1 ? <a href={item.href}>{item.label}</a> : <span aria-current={index === items.length - 1 ? 'page' : undefined}>{item.label}</span>}</li>)}</ol></nav>`. — Evidence: file created at `website/src/components/Breadcrumb.astro`.
- [x] 4. In `BaseLayout.astro`, add `breadcrumb?: Array<{ label: string; href?: string }>` to `Props`, destructure it, import `Breadcrumb`, and render `{breadcrumb && <Breadcrumb items={breadcrumb} />}` as the first child of `<header class="site-header">`. — Evidence: `dist/archetypes/nekroz/index.html` shows `<nav class="breadcrumb"...>` immediately before `<a class="compact-brand"`.
- [x] 5. Add to `website/src/styles/global.css`: `.breadcrumb ol { ... }`, `.breadcrumb li + li::before { ... }`, `margin-right: auto;` on `.breadcrumb`, and `@media (max-width: 44rem) { .breadcrumb li:not(:last-child) { display: none; } }`. — Evidence: rules present at global.css lines ~239-256 and ~1441 (verified via grep).
- [x] 6. Pass `breadcrumb` from each of the nine pages in the table above and delete the two inline breadcrumb paragraphs named in Inputs. — Evidence: all 9 pages updated; `grep -o '/ Archetypes\|/ Card<\|/ Immutable version\|Archive</a> /' dist/archetypes/nekroz/index.html dist/cards/nekroz-trishula/index.html` → no matches (clean). Also extended breadcrumb to `docs/`, `blog/`, `decks/` pages (5 additional files) — required because the gate rule ("any page other than index.html/404.html") now also covers routes T9 added; see Assumptions.
- [x] 7. Run `npm run format`, `npm run lint`, `npm run check`. — Evidence: `npm run format` reformatted touched files; `npm run lint` exit 0 (no output/errors); `npm run check` exit 0 (`Result (100 files): 0 errors, 0 warnings, 224 hints`).

## Outputs

- Files touched: `website/src/components/Breadcrumb.astro` (new), `website/src/layouts/BaseLayout.astro`, the nine page files listed above, `website/src/styles/global.css`, `website/scripts/check-chrome.mjs`, `website/tests/unit/chrome.test.ts`, and `website/package.json` if the gate is created here.
- Public API: `Breadcrumb.astro` props; `BaseLayout` gains an optional `breadcrumb` prop.
- No migration.

## Validation

- [x] `cd website && npx vitest run tests/unit/chrome.test.ts` — all pass — Evidence: `Test Files 1 passed (1)`, `Tests 9 passed (9)`.
- [x] `cd website && npm run build` — the chrome gate reports no missing breadcrumb — Evidence: build output ends `chrome: 151 pages carry the site header` with no thrown error (exit 0).
- [x] `cd website && npm run links:check` — exit 0 — Evidence: `links: 151 pages clean`, exit 0.
- [x] manual check: `node scripts/serve-dist.mjs`, open `/archetypes/nekroz/`, `/cards/nekroz-trishula/`, `/updates/` — one breadcrumb per page, top-left of the header, no duplicated line inside the page body — **Substitution (no browser/e2e harness on this host):** inspected built `dist/**/index.html` directly instead of a live browser. `grep -c '<nav class="breadcrumb"'` = 1 for each of the three pages; breadcrumb markup appears immediately before `<a class="compact-brand"` (i.e. leftmost in `.site-header`); grep for the old inline paragraph text (`/ Archetypes`, `/ Card<`, `Archive</a> /`) found no matches in either archetype or card dist HTML.
- [x] manual check at 390 px: only the current page label shows — **Substitution (no browser on this host):** verified statically — `@media (max-width: 44rem)` block in `global.css` contains `.breadcrumb li:not(:last-child) { display: none; }`, which hides every breadcrumb item except the last (current page) at viewports ≤44rem (704px, covers 390px). Not visually confirmed in a real browser.
- [x] `cd website && npm run ci` — exit 0 — Evidence: command exited 0; log shows `Test Files 19 passed (19)`, `Tests 150 passed (150)`, build completed with `chrome: 151 pages carry the site header`.
- [x] app functional — every route still resolves; home page shows no breadcrumb — Evidence: `npm run links:check` → `links: 151 pages clean` (all internal links resolve); `grep -c '<nav class="breadcrumb"' dist/index.html` → 0.
- [x] commit msg draft: `feat(website): move the breadcrumb into the site header for every page` — Evidence: committed as `8b86c3f`.

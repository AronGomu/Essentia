# T10: Site-wide breadcrumb

**Plan:** `./ai_artefacts/PLAN_2026_08_07_website-feedback-pass.md`
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

- [ ] 1. Add the four cases above to `website/tests/unit/chrome.test.ts`, creating the file if absent.
- [ ] 2. Add the breadcrumb rule to `website/scripts/check-chrome.mjs`, creating the file (with CLI tail and the `build`-script wiring `&& node scripts/check-chrome.mjs`) if absent.
- [ ] 3. Create `website/src/components/Breadcrumb.astro`:
      `<nav class="breadcrumb" aria-label="Breadcrumb"><ol>{items.map((item, index) => <li>{item.href && index < items.length - 1 ? <a href={item.href}>{item.label}</a> : <span aria-current={index === items.length - 1 ? 'page' : undefined}>{item.label}</span>}</li>)}</ol></nav>`.
- [ ] 4. In `BaseLayout.astro`, add `breadcrumb?: Array<{ label: string; href?: string }>` to `Props`, destructure it, import `Breadcrumb`, and render `{breadcrumb && <Breadcrumb items={breadcrumb} />}` as the first child of `<header class="site-header">`.
- [ ] 5. Add to `website/src/styles/global.css`: `.breadcrumb ol { display: flex; flex-wrap: wrap; gap: 0.35rem; list-style: none; margin: 0; padding: 0; font-size: 0.82rem; color: var(--silver-ink); }` and `.breadcrumb li + li::before { content: '/'; margin-right: 0.35rem; opacity: 0.6; }`, plus `margin-right: auto;` on `.breadcrumb` so the rest of the header stays right-aligned. Under `@media (max-width: 44rem)` hide all but the last item: `.breadcrumb li:not(:last-child) { display: none; }`.
- [ ] 6. Pass `breadcrumb` from each of the nine pages in the table above and delete the two inline breadcrumb paragraphs named in Inputs.
- [ ] 7. Run `npm run format`, `npm run lint`, `npm run check`.

## Outputs

- Files touched: `website/src/components/Breadcrumb.astro` (new), `website/src/layouts/BaseLayout.astro`, the nine page files listed above, `website/src/styles/global.css`, `website/scripts/check-chrome.mjs`, `website/tests/unit/chrome.test.ts`, and `website/package.json` if the gate is created here.
- Public API: `Breadcrumb.astro` props; `BaseLayout` gains an optional `breadcrumb` prop.
- No migration.

## Validation

- [ ] `cd website && npx vitest run tests/unit/chrome.test.ts` — all pass
- [ ] `cd website && npm run build` — the chrome gate reports no missing breadcrumb
- [ ] `cd website && npm run links:check` — exit 0
- [ ] manual check: `node scripts/serve-dist.mjs`, open `/archetypes/nekroz/`, `/cards/nekroz-trishula/`, `/updates/` — one breadcrumb per page, top-left of the header, no duplicated line inside the page body
- [ ] manual check at 390 px: only the current page label shows
- [ ] `cd website && npm run ci` — exit 0
- [ ] app functional — every route still resolves; home page shows no breadcrumb
- [ ] commit msg draft: `feat(website): move the breadcrumb into the site header for every page`

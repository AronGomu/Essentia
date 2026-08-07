# T9: Header nav three buttons

**Plan:** `./ai_artefacts/PLAN_2026_08_07_website-feedback-pass.md`
**Depends:** T5, T6, T8
**Commit outcome:** the site header shows exactly three utility buttons — Learn about Essentia, Blog, Decks — on every page, and a build gate keeps them there.

## Context (self-contained)

- Goal: ship the UX feedback backlog in `.dev/feedback.md`. Feedback **Home #6**: "Remove 'Rules and Philosophy' buttons from header. Replace them by 3 button, from left to right: 'Learn about Essentia' (→ first page of doc), 'Blog' (→ blog section), 'Decks' (→ decks list page)."
- This slice: the header only, plus a reusable dist-level chrome gate that later tickets extend.
- Out of scope here: deleting `/rules/` or `/philosophy/` — both pages stay published and stay reachable from the docs corpus and from in-page links. Do not touch the left catalog rail (`Navigation.svelte`), the search palette, or the footer.
- Assumptions in force: e2e cannot run on this host, so the gate is a Node script over `dist/`.

## Requirements

- `website/src/layouts/BaseLayout.astro` renders `<nav class="utility-nav" aria-label="Sections">` with exactly three links in this order:
  1. `Learn about Essentia` → `${base}docs/`
  2. `Blog` → `${base}blog/`
  3. `Decks` → `${base}decks/`
- The active link carries `aria-current="page"` when the current pathname starts with that link's path.
- The `informationPage` computation (rules/philosophy) is deleted.
- New gate `website/scripts/check-chrome.mjs` asserts the three links exist on every built HTML page, wired into `npm run build`.

## Inputs

- `website/src/layouts/BaseLayout.astro` — lines 34–38 hold the `informationPage` ternary to delete; lines 71–86 hold `<header class="site-header">` with `.compact-brand`, the `.utility-nav` with the Rules and Philosophy links to replace, and `<SearchPalette client:load … />` which stays.
- `website/src/styles/global.css` — `.utility-nav` at line ~220 and `.utility-nav a` at ~225 already style this nav; `@media (max-width: 44rem)` at the end shrinks it. Only widen the mobile rule if three labels overflow.
- `website/scripts/check-404.mjs` — style reference for a dist gate (added in T2).
- `website/package.json` — `build` script; append the new gate.
- **From Depends (T5):** `/docs/` exists and is the project presentation page.
- **From Depends (T6):** `/blog/` exists and lists posts.
- **From Depends (T8):** `/decks/` exists and manages browser-local decklists.

## TDD

1. **Red** — write `website/tests/unit/chrome.test.ts` first against `chromeIssues` from `../../scripts/check-chrome.mjs`. Fails: module missing.
2. **Green** — implement the gate, then edit `BaseLayout.astro` until `npm run build` passes it.
3. **Refactor** — none. Later tickets (T10, T12, T14, T16, T22) extend `chromeIssues` with more rules.

Exact signature:

```js
/**
 * @param {string} file dist-relative path, e.g. 'index.html'
 * @param {string} html
 * @param {string} base
 * @returns {string[]} problems for this page
 */
export function chromeIssues(file, html, base)
```

Rules this ticket adds:

- `${file}: header is missing the "<label>" link to <href>` for each of the three expected `{ label, href }` pairs when `html` does not contain both the exact `href="<base><path>"` and the exact label text inside the `utility-nav` block. Locate that block with `/<nav class="utility-nav"[\s\S]*?<\/nav>/`.
- `${file}: header still links to Rules or Philosophy` when the utility-nav block contains `>Rules<` or `>Philosophy<`.
- Pages exempt from the check: `404.html` (it is a bare redirect document) and any file under `cards/*/versions/`? No — those use `BaseLayout` too and are **not** exempt. Only `404.html` is exempt.

CLI tail: walk `dist` for `.html`, accumulate `chromeIssues(relative, html, process.env.BASE_PATH ?? '/')`, throw on any, else `process.stdout.write(\`chrome: ${count} pages carry the site header\n\`)`.

## Test plan

| Test | Input | Expect |
| ---- | ----- | ------ |
| `accepts a compliant header` | html whose utility-nav has the three links with base `/` | `[]` |
| `flags a missing Decks link` | same html minus the Decks anchor | contains `header is missing the "Decks" link to /decks/` |
| `flags a leftover Rules link` | utility-nav containing `>Rules<` | contains `header still links to Rules or Philosophy` |
| `honours a subpath base` | links `href="/YGO-x-MTG/docs/"`, base `/YGO-x-MTG/` | `[]` |
| `exempts the 404 document` | `chromeIssues('404.html', '<html></html>', '/')` | `[]` |

Run: `cd website && npx vitest run tests/unit/chrome.test.ts`

## Impl steps

- [ ] 1. Create `website/tests/unit/chrome.test.ts` with the five cases above.
- [ ] 2. Create `website/scripts/check-chrome.mjs` exporting `chromeIssues` plus the CLI tail, with the expected links declared as a module constant `export const UTILITY_LINKS = [{ label: 'Learn about Essentia', path: 'docs/' }, { label: 'Blog', path: 'blog/' }, { label: 'Decks', path: 'decks/' }]`.
- [ ] 3. In `website/src/layouts/BaseLayout.astro`, delete the `const informationPage = …` block.
- [ ] 4. Replace the two anchors inside `<nav class="utility-nav" aria-label="Information">` with the three links, and change the label to `aria-label="Sections"`. Compute the active state with `const section = ['docs/', 'blog/', 'decks/'].find((path) => Astro.url.pathname.startsWith(`${base}${path}`));` and set `aria-current={section === path ? 'page' : undefined}`.
- [ ] 5. Append ` && node scripts/check-chrome.mjs` to the `build` script in `website/package.json`, after `check-404.mjs`.
- [ ] 6. If the three labels wrap badly under 44rem, shorten only the visual presentation with CSS (`.utility-nav a { white-space: nowrap; }` plus horizontal scroll `overflow-x: auto` on `.utility-nav`) — never change the label text, the gate asserts it.
- [ ] 7. Run `npm run format`, `npm run lint`, `npm run check`.

## Outputs

- Files touched: `website/src/layouts/BaseLayout.astro`, `website/scripts/check-chrome.mjs` (new), `website/tests/unit/chrome.test.ts` (new), `website/package.json`, `website/src/styles/global.css` (only if the mobile rule needs it).
- Behaviour: every page's header now points at the docs, blog, and decks trees.
- No migration.

## Validation

- [ ] `cd website && npx vitest run tests/unit/chrome.test.ts` — 5 passed
- [ ] `cd website && npm run build` — ends with `chrome: <n> pages carry the site header`
- [ ] `cd website && npm run links:check` — exit 0
- [ ] manual check: `node scripts/serve-dist.mjs`, click each of the three header buttons from `/`, `/cards/nekroz-trishula/`, and `/archetypes/nekroz/`
- [ ] manual check at 390 px width: the three buttons remain reachable and each hit target is at least 2.45 rem tall
- [ ] `cd website && npm run ci` — exit 0
- [ ] app functional — `/rules/` and `/philosophy/` still build and still resolve
- [ ] commit msg draft: `feat(website): point the site header at docs, blog, and decks`

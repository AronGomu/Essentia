# T6: Collapsible docs rail, Docs/Blog switch removed

**Plan:** `./ai-artifacts/PLAN_2026_08_13_feedback_batch_3.md`
**Depends:** T5
**Commit outcome:** Docs groups in the left rail collapse and remember their state; the
current page's group is open on arrival; the redundant Docs/Blog switch is gone from the
desktop rail and the mobile drawer.

## Context (self-contained)

- Goal: the docs rail lists every group expanded, one flat `<p class="nav-label">` heading
  per group followed by a `<ul>`. With one group per archetype the rail is unusable, and the
  Docs/Blog switch at its top duplicates the header's own Learn / Blog / Decks nav.
- This slice: rail UI only — collapsing, persistence, switch removal. Doc data already
  arrives grouped from T5.
- Out of scope here: the blog rail's shape (T7), the catalog rail's existing collapse
  toggle (`applyRailState` / `essentia.v1.catalog-rail`), any docs content change.
- Assumptions in force: root-level docs form the group with key `''` and render as bare
  links above every collapsible group, with no heading and no disclosure.

**From Depends (T5) — spell out, do not go looking:**

- `loadDocs(root = ROOT)` takes no groups argument. Every `CatalogDoc` carries
  `group` (the first path segment under `docs/`, or `''` for a root-level doc),
  `groupLabel` (Title Case, numeric prefix stripped, `''` for root docs), and `order`.
- `website/src/lib/docs.ts::docsRailGroups(docs)` still returns
  `Array<{ key, label, docs: Array<{ route, title }> }>` in catalog order, so the root group
  arrives first with `key === ''` and `label === ''`.
- `website/content/reading-order.json` no longer has a `docs` array; its `blog` array is
  untouched by T5.
- Routes now keep numeric prefixes: `/docs/01-general-rules/01-zones/`.

## Requirements

- Each non-root group renders as a `<details>` with a `<summary>` carrying its label.
- The group containing the current page is open; every other group is closed.
- Open/closed state persists per group under localStorage key
  `essentia.v1.docs-group.{key}`, read on mount and written on toggle.
- A persisted state loses to the current page: the active group is always open on arrival.
- Root-level docs (`key === ''`) render as a plain `<ul>` above the first `<details>`, with
  no heading and no disclosure.
- The `reading-switch` block (`Docs` / `Blog` links) is deleted from both the desktop rail
  and the mobile drawer.
- With JavaScript disabled the rail still renders; `<details>` without the `open` attribute
  is simply closed, and the active group carries `open` from server-rendered markup.

## Inputs

- `website/src/components/Navigation.svelte` — 260 lines. Props: `sections`, `currentPath`,
  `base`, `mode: 'catalog' | 'reading'`, `readingKind`, `readingGroups`. Two render sites
  for reading mode: the desktop `<nav id="desktop-catalog">` (the `{:else}` branch, with the
  `reading-switch` div then `{#each readingGroups as group}` emitting
  `<p class="nav-label">{group.label}</p><ul>…`), and the mobile `<dialog class="mobile-drawer">`
  with the same structure. Helpers already present: `href(route)`, `current(route)`,
  `readRailState` / `applyRailState` / `toggleRailState` / `writeRailState` from
  `website/src/lib/catalog-rail`.
- `website/src/lib/reading-nav.ts` — `readingNavGroups(kind, source)` returns
  `Array<{ key, label, items: Array<{ route, title, meta? }> }>`; the docs branch maps
  `docsRailGroups`. `readingKindFor(pathname, base)` returns `'docs' | 'blog' | null`.
- `website/src/lib/storage.ts` — existing helpers for guarded localStorage access; reuse
  them rather than touching `localStorage` directly.
- `website/src/styles/global.css` — `.nav-label`, `.desktop-catalog`, `.drawer-panel`
  styles. `summary` needs `cursor: pointer; list-style: none;` and a rotating marker.
- Existing tests: `website/tests/unit/reading-shell.test.ts`,
  `website/tests/unit/catalog-rail.test.ts`, `website/tests/e2e/showcase.spec.ts`.

## TDD

1. **Red** — write `website/tests/unit/docs-rail-groups.test.ts` against the two new pure
   functions below; watch it fail.
2. **Green** — implement the helpers, then the Svelte markup.
3. **Refactor** — only if needed. Keep green.

## Test plan

New pure helpers in `website/src/lib/docs.ts`:
`export function docsGroupStorageKey(key: string): string` and
`export function isGroupOpen(group, currentPath, persisted)`.

File: `website/tests/unit/docs-rail-groups.test.ts`

| Test                                                        | Input                                                                            | Expect                              |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------- | ------------------------------------ |
| `docsGroupStorageKey namespaces the group`                  | `'01_general_rules'`                                                              | `'essentia.v1.docs-group.01_general_rules'` |
| `the group holding the current page is open`                | group with `/docs/01-general-rules/01-zones/`, current path the same, persisted `false` | `true`                          |
| `a persisted open group stays open away from it`            | unrelated group, persisted `true`                                                 | `true`                               |
| `a group with no persisted state is closed by default`      | unrelated group, persisted `null`                                                 | `false`                              |
| `the root group is always open`                             | group with `key === ''`                                                           | `true`                               |

File: `website/tests/e2e/docs-rail.spec.ts` (new)

| Test                                                     | Input                                         | Expect                                                                    |
| -------------------------------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------- |
| `the active group is open and others are closed`         | any nested doc route from the built catalog    | its `<details>` has `open`; at least one sibling `<details>` does not      |
| `toggling a group persists across navigation`            | open a closed group, navigate to `/docs/`, back | that group is still open                                                  |
| `the rail has no Docs/Blog switch`                       | `/docs/`                                       | `page.locator('.reading-switch')` has count 0                             |
| `the mobile drawer has no Docs/Blog switch`              | `/docs/` at 400 px, drawer opened              | same, count 0                                                             |

Run: `cd website && npx vitest run tests/unit/docs-rail-groups.test.ts` then
`cd website && npm run build && npx playwright test tests/e2e/docs-rail.spec.ts`.

## Impl steps

- [ ] 1. In `website/src/lib/docs.ts`, add `docsGroupStorageKey(key)` returning
      `` `essentia.v1.docs-group.${key}` ``.
- [ ] 2. In the same file, add
      `export function isGroupOpen(group: { key: string; docs: Array<{ route: string }> }, currentPath: string, persisted: boolean | null): boolean`
      returning `true` when `group.key === ''`, when any `doc.route` matches `currentPath`
      (compare with a trailing slash on both sides), or when `persisted === true`;
      otherwise `false`.
- [ ] 3. In `website/src/lib/reading-nav.ts`, keep the docs branch as it is; confirm the
      root group's `key`/`label` pass through as `''`.
- [ ] 4. In `website/src/components/Navigation.svelte`, delete both `.reading-switch`
      blocks and the now-unused `readingKind` usages inside them. Keep the `readingKind`
      prop, which still drives `mode`.
- [ ] 5. Replace the desktop reading branch with: for `group.key === ''` a bare
      `<ul>` of items; for every other group a
      `<details open={openState[group.key]} on:toggle={…}><summary>{group.label}</summary><ul>…</ul></details>`.
- [ ] 6. Mirror the exact same structure in the mobile drawer branch.
- [ ] 7. Add `let openState: Record<string, boolean> = {};` initialised in `onMount` from
      `isGroupOpen(group, currentPath, readPersistedGroup(group.key))`, where
      `readPersistedGroup` uses the guarded reader from `website/src/lib/storage.ts`.
- [ ] 8. On `toggle`, write the new state with the guarded writer under
      `docsGroupStorageKey(group.key)`.
- [ ] 9. Server-render `open` for the active group so the markup is correct before
      hydration: compute it in the template from `isGroupOpen(group, currentPath, null)`.
- [ ] 10. In `website/src/styles/global.css`, style `summary` inside the rail: remove the
      default marker (`list-style: none; &::-webkit-details-marker { display: none; }`),
      reuse `.nav-label`'s typography, add a `▸` / `▾` indicator, and give it a
      `:focus-visible` outline consistent with the rest of the rail.
- [ ] 11. Write the two test files per the test plan.
- [ ] 12. Update `docs/website-shell-chrome.html`: the rail's reading mode now uses
      collapsible groups and no longer carries a section switcher.

## Outputs

- Touched: `website/src/components/Navigation.svelte`, `website/src/lib/docs.ts`,
  `website/src/styles/global.css`, `website/tests/unit/docs-rail-groups.test.ts` (new),
  `website/tests/e2e/docs-rail.spec.ts` (new), `docs/website-shell-chrome.html`.
- New localStorage keys: `essentia.v1.docs-group.{group}`.
- Removed UI: the rail's Docs/Blog switch, desktop and mobile.

## Validation

- [ ] `cd website && npx vitest run` — whole unit suite green
- [ ] `cd website && npm run check` — no Svelte or TS error
- [ ] `cd website && npm run build && npm run test:e2e` — green, including the new spec
- [ ] manual check on `/docs/01-general-rules/01-zones/` (or the current equivalent): its
      group is open, others closed; collapsing one and reloading keeps it collapsed
- [ ] manual check at 400 px: the drawer shows the same groups and no switch; the header
      still offers Learn / Blog / Decks
- [ ] keyboard check: `Tab` reaches every `<summary>`, `Enter` toggles, focus stays trapped
      inside the open drawer
- [ ] commit msg draft: `feat(website): collapse docs rail groups and drop the rail switch`

# T10: Global Find palette

**Plan:** `./ai-artifacts/PLAN_2026_08_07_website-feedback-pass-2.md`
**Depends:** T8
**Commit outcome:** The header palette is called "Find" and searches cards, docs, blog posts and published decks, grouped by kind, each result linking to its page.

## Context (self-contained)

- Goal: ship feedback batch 2 on the Astro site under `website/`.
- This slice: the feedback line *"Rename the 'find a card' search bar to 'find'. It should
  now be able to find docs, blog article and decks. Update the search modal to allow to
  distinguish between all of them. Clicking on redirect to their page."*
- Out of scope here: full-text search inside doc bodies (title + group only), the deck
  *editor*'s behaviour beyond deep-linking, the reading surfaces (T9), the catalog rail (T5).
- Assumptions in force: **A6** — "decks" means **both** kinds:
  - **published** decks from `catalog.releases[].decks`, indexed at build time;
  - **browser-local** decks from `localStorage` key `essentia.v1.decks`, indexed **at
    runtime, in the visitor's own browser only**.

  Local decks must never reach the built HTML. The build-time index contains published
  decks only; the palette merges the local ones after mount. That is a hard privacy
  boundary and it is asserted by a test (`buildFindEntries` never emits a local entry) and
  by the existing `scan-dist` gate.

## What T8 (Depends) produced

Blog articles are authored at `blog/YYYY-MM-DD-slug.md`; `catalog.posts` entries are
`{ slug, route: '/blog/<slug>/', title, date, author, summary, tags, body }` sorted newest
first, and `npm run content` regenerates them. Post routes are unchanged (`/blog/<slug>/`).

## Current implementation

`website/src/components/SearchPalette.svelte`:

- Props `cards: Array<Pick<CatalogCard,'id'|'name'|'matchNames'|'route'|'sectionSlug'|'manifestIndex'>>` and `base: string`.
- Trigger button `<button class="search-trigger">⌕ Find a card ⌘ K</button>`; `Ctrl/⌘+K` toggles.
- `<dialog class="search-dialog">` with `<h2 id="search-title">Find a card</h2>`, a
  `<label for="global-card-search">Search current or former card name</label>`, a combobox
  input, an `aria-live` result count, and `<ul role="listbox">` of
  `<li role="option" id={`search-result-${card.id}`}>` showing `<strong>{name}</strong><span>{sectionSlug}</span>`.
- Scoring: `cardNameScore(name, needle)` from `website/src/lib/search.ts` over
  `card.matchNames`, ascending, tie-broken by `manifestIndex` then `id`; top 12.
- Mounted from `website/src/layouts/BaseLayout.astro` line 104 with `client:load`, fed by
  `searchCards` built at line 40.
- Styles: `.search-trigger` (line 428), `.search-dialog` (437), `.search-panel` (446),
  `.search-panel li[role='option']` (464), `.search-panel li[aria-selected='true']` (471),
  `.search-empty` (478), plus the `@media (max-width: 44rem)` tweaks at line 1002.
- `website/tests/e2e/showcase.spec.ts` line 61 clicks
  `page.getByRole('button', { name: /Find a card/ })` — must be updated.

Published decks render in `website/src/pages/releases/[stage]/[package].astro` line 59-62 as
`<h3>{deck.id}</h3>` with **no anchor id** — this ticket adds one.

Browser-local decks live in `website/src/components/DeckManager.svelte`:

- `onMount` does `store = readStored(DECKS_KEY, migrateDecks) ?? EMPTY_STORE;` where
  `DECKS_KEY = 'decks'` and `readStored` (in `src/lib/storage.ts`) prefixes it with
  `essentia.v1.`. `migrateDecks` and the `Deck` / `DeckStore` types live in `src/lib/decks.ts`.
- A `Deck` is `{ id, name, created, updated, main: DeckEntry[], extra: DeckEntry[] }`;
  `id` is a `crypto.randomUUID()`.
- Selection is component-internal state `let selectedId: string | null = null`, set by the
  per-deck **Open** button (line 149). There is **no deep link** today — `/decks/` always
  opens with nothing selected, so a Find result has nothing to point at until this ticket
  adds one.

## Requirements

- Trigger label and dialog heading become **Find**; input label becomes
  `Search cards, docs, blog posts and decks`; input id becomes `global-find`.
- Four indexed kinds with a stable display order: `card`, `doc`, `post`, `deck`.
- The `deck` kind holds **both** sources. Inside the group, the visitor's own decks come
  first (they are theirs), then published decks; each sub-run keeps its own `order`.
  The `detail` column names the source: `Saved in this browser` versus
  `<setName> <version>`.
- Local decks are read once per palette mount and never serialised into any built file.
  When `localStorage` is unavailable or empty, the palette behaves exactly as it does with
  published decks alone — no error, no empty group.
- Results are grouped under a heading per kind (`Cards`, `Docs`, `Blog`, `Decks`), each row
  showing the entry title plus a kind-specific sublabel, and every row carries a
  `data-find-kind` attribute so the kind is machine-visible.
- A filter row of buttons — `All`, `Cards`, `Docs`, `Blog`, `Decks` — narrows the result set;
  `All` is the default and shows at most 6 entries per kind.
- Enter / click navigates to the entry's `route`, resolved through `withBase`.
- Empty query shows the first entries of every kind (a browsable index), not nothing.
- Keyboard model is unchanged: `⌘/Ctrl+K` toggles, `ArrowUp`/`ArrowDown` move the active
  row across group boundaries, `Enter` navigates, `Esc` closes, focus returns to the trigger.
- Published decks get an anchor on the release page so `route` resolves.

## Inputs

- `website/src/components/SearchPalette.svelte`, `website/src/layouts/BaseLayout.astro`,
  `website/src/lib/search.ts`, `website/src/lib/catalog.ts`
  (`catalog.cards`, `catalog.docs`, `catalog.posts`, `catalog.releases`, `withBase`, `formatDate`).
- `website/src/pages/releases/[stage]/[package].astro` lines 56-70.
- `website/tests/unit/search.test.ts`, `website/tests/e2e/showcase.spec.ts`,
  `website/scripts/check-chrome.mjs`, `website/scripts/check-budgets.mjs`.
- **From Depends (T8):** `catalog.posts` shape and ordering as described above.

## New module contract

`website/src/lib/find.ts`:

```ts
export type FindKind = 'card' | 'doc' | 'post' | 'deck';
export const FIND_KINDS: readonly FindKind[] = ['card', 'doc', 'post', 'deck'];
export const FIND_KIND_LABEL: Record<FindKind, string> = {
  card: 'Cards', doc: 'Docs', post: 'Blog', deck: 'Decks',
};

export interface FindEntry {
  /** unique across kinds and sources: `${kind}:${source}:${id}` */
  key: string;
  kind: FindKind;
  /** only meaningful for `kind: 'deck'`; 'catalog' for every other kind */
  source: 'catalog' | 'local';
  /** primary label shown in the row */
  title: string;
  /** secondary label shown right-aligned in the row */
  detail: string;
  /** catalog route, e.g. `/cards/nekroz-brionac/` or `/releases/alpha/x/#deck-y` */
  route: string;
  /** every string the entry may be matched on */
  matchNames: string[];
  /** stable tiebreaker inside a kind */
  order: number;
}

export interface FindCatalogInput {
  cards: ReadonlyArray<{ id: string; name: string; matchNames: string[]; route: string; sectionLabel: string; manifestIndex: number }>;
  docs: ReadonlyArray<{ id: string; title: string; route: string; groupLabel: string }>;
  posts: ReadonlyArray<{ slug: string; title: string; route: string; date: string }>;
  releases: ReadonlyArray<{ id: string; setName: string; version: string; route: string; decks: ReadonlyArray<{ id: string; cards: string[] }> }>;
}

/** Build-time index. NEVER emits `source: 'local'` — local decks are private. */
export function buildFindEntries(input: FindCatalogInput): FindEntry[];

/** Runtime-only index of the visitor's own decks, merged after mount. */
export function localDeckEntries(
  decks: ReadonlyArray<{ id: string; name: string; updated: string }>,
): FindEntry[];

export interface FindGroup { kind: FindKind; label: string; entries: FindEntry[] }

export function findGroups(
  entries: readonly FindEntry[],
  query: string,
  kind: FindKind | null,
  perKind: number,
): FindGroup[];
```

Construction rules — every entry gets `source: 'catalog'` unless stated:

- card → `{ key: 'card:catalog:'+id, kind:'card', title: name, detail: sectionLabel, route, matchNames, order: manifestIndex }`
- doc → `{ key: 'doc:catalog:'+id, kind:'doc', title, detail: groupLabel, route, matchNames: [title], order: index }`
- post → `{ key: 'post:catalog:'+slug, kind:'post', title, detail: date, route, matchNames: [title], order: index }`
- published deck → for every release, every deck:
  `{ key: 'deck:catalog:'+release.id+':'+deck.id, kind:'deck', source:'catalog', title: deckTitle(deck.id), detail: `${release.setName} ${release.version}`, route: `${release.route}#deck-${deck.id}`, matchNames: [deckTitle(deck.id), deck.id], order: 1000 + index }`
  where `deckTitle` replaces `-` with a space and upper-cases the first letter of each word.
- local deck (`localDeckEntries` only) →
  `{ key: 'deck:local:'+deck.id, kind:'deck', source:'local', title: deck.name, detail: 'Saved in this browser', route: '/decks/#deck-'+deck.id, matchNames: [deck.name], order: index }`
  Input decks are sorted by `updated` descending, then `name`, before indexing.

The `order` offset (`1000 +`) is what puts the visitor's own decks above the published ones
inside the group, with no special case in the sort.

`findGroups` rules:

- Score with `cardNameScore` (imported from `./search`) over `matchNames`, take the minimum;
  drop non-finite scores.
- Empty query → score 0 for everything, preserving `order`.
- `kind !== null` → only that kind, and `perKind` is ignored (cap 24).
- Sort inside a kind by `score`, then `order`, then `key`.
- Return groups in `FIND_KINDS` order, dropping empty ones.

## Check plan

| Test                                        | Input                                                        | Expect                                                     |
| ------------------------------------------- | ------------------------------------------------------------ | ----------------------------------------------------------- |
| `indexes every kind`                        | fixture catalog with 2 cards, 2 docs, 1 post, 1 release/2 decks | 7 entries, kinds `['card','card','doc','doc','post','deck','deck']` after `FIND_KINDS` grouping |
| `builds a deck route with its anchor`       | release `{route:'/releases/alpha/x/', decks:[{id:'burning-abyss'}]}` | `route === '/releases/alpha/x/#deck-burning-abyss'`         |
| `titles a deck from its slug`               | deck id `burning-abyss`                                       | `title === 'Burning Abyss'`                                 |
| `groups a query across kinds`               | query `nek`                                                   | groups appear in `card, doc, post, deck` order              |
| `caps entries per kind when unfiltered`     | 20 cards, `perKind: 6`                                        | card group has 6 entries                                     |
| `ignores the cap when a kind is selected`   | 20 cards, `kind: 'card'`                                      | card group has 20 entries, no other group                    |
| `returns a browsable index for an empty query` | `''`                                                       | every kind present, ordered by `order`                       |
| `drops kinds with no match`                 | query matching only cards                                     | exactly one group                                            |
| `keys are unique across kinds`              | fixture where a card and a doc share a title                  | `new Set(keys).size === entries.length`                      |
| `never indexes a local deck at build time`  | `buildFindEntries(fixture)`                                   | `entries.every(e => e.source === 'catalog')`                 |
| `indexes a local deck by name`              | `localDeckEntries([{id:'u1',name:'My Nekroz',updated:'2026-08-05'}])` | `{ key:'deck:local:u1', kind:'deck', source:'local', title:'My Nekroz', detail:'Saved in this browser', route:'/decks/#deck-u1' }` |
| `sorts local decks by most recently updated`| two local decks updated `2026-08-01` and `2026-08-06`         | the `2026-08-06` deck has the lower `order`                  |
| `puts local decks above published ones`     | `findGroups([...local, ...published], '', null, 6)`           | the deck group lists every `source:'local'` entry before any `source:'catalog'` entry |
| `returns nothing for an empty deck store`   | `localDeckEntries([])`                                        | `[]`                                                          |

Plus two build gate rows in `website/tests/unit/chrome.test.ts`:

- `chromeIssues` flags html whose header lacks `>Find<` with
  `` `${file}: header is missing the Find palette` ``.
- `chromeIssues` flags html containing `"deck:local:"` with
  `` `${file}: a browser-local deck leaked into the built page` `` — the privacy boundary
  is enforced by the build, not only by review.

And a deck deep-link test in `website/tests/unit/deck-deep-link.test.ts` over a new pure
helper `deckIdFromHash(hash: string): string | null` in `src/lib/decks.ts`:

| Test                                | Input             | Expect  |
| ----------------------------------- | ----------------- | ------- |
| `reads a deck id from the hash`     | `'#deck-u1'`      | `'u1'`  |
| `ignores an unrelated hash`         | `'#section-two'`  | `null`  |
| `ignores an empty hash`             | `''`              | `null`  |

## TDD

1. **Red** — write `website/tests/unit/find.test.ts` (9 rows) and the `chrome.test.ts` row.
   Run `cd website && npx vitest run tests/unit/find.test.ts tests/unit/chrome.test.ts` — red.
2. **Green** — add `src/lib/find.ts`, rewrite the palette, wire `BaseLayout`, add the gate.
3. **Refactor** — restyle the modal groups; update the e2e spec.

## Impl steps

- [x] 1. Write `website/tests/unit/find.test.ts` with all 14 rows, using inline fixtures
      (do **not** import the real catalog — the test must not depend on card data).
      *Criterion:* `website/tests/unit/find.test.ts` exists, imports no catalog module,
      and vitest collects 14 `it` rows. **Met** — 14 rows across 3 describes; only
      `../../src/lib/find` is imported.
- [x] 2. Add the two gate rows to `website/tests/unit/chrome.test.ts` and create
      `website/tests/unit/deck-deep-link.test.ts`; run all three — red.
      *Criterion:* `npx vitest run tests/unit/find.test.ts tests/unit/deck-deep-link.test.ts
      tests/unit/chrome.test.ts` fails. **Met** — `Test Files 3 failed (3) / Tests 6 failed |
      51 passed`; `find.test.ts` errors on `Cannot find module '../../src/lib/find'`,
      chrome rows `flags a header whose palette still says "Find a card"`,
      `flags a header with no palette trigger at all`, `flags a page carrying a local deck key`
      all red.
- [x] 3. Create `website/src/lib/find.ts` implementing the contract above, importing
      `{ cardNameScore, normalizeCardName }` from `'./search'`. Leave `search.ts` unchanged.
      *Criterion:* `website/src/lib/find.ts` exists and exports `FIND_KINDS`,
      `FIND_KIND_LABEL`, `buildFindEntries`, `localDeckEntries`, `findGroups`;
      `git diff --stat -- src/lib/search.ts` is empty. **Met.**
- [x] 3a. Add to `website/src/lib/decks.ts`:
      ```ts
      /** `#deck-<id>` → `<id>`; anything else → null. Shared by DeckManager and Find. */
      export function deckIdFromHash(hash: string): string | null {
        const match = /^#deck-(.+)$/.exec(hash);
        return match ? match[1] : null;
      }
      ```
      *Criterion:* `deckIdFromHash` exported from `src/lib/decks.ts` and
      `tests/unit/deck-deep-link.test.ts` green. **Met.**
- [x] 4. Run the tests — green on the pure-function rows.
      *Criterion:* `npx vitest run tests/unit/find.test.ts tests/unit/deck-deep-link.test.ts
      tests/unit/chrome.test.ts` → exit 0. **Met** — `Test Files 3 passed (3) / Tests 71 passed (71)`.
- [x] 5. `git mv website/src/components/SearchPalette.svelte website/src/components/FindPalette.svelte`.
      *Criterion:* `git status` shows `D SearchPalette.svelte` + `FindPalette.svelte`, and no
      file references `SearchPalette`. **Met.**
- [x] 6. Rewrite `FindPalette.svelte`:
      - Props: `export let entries: FindEntry[];` and `export let base: string;`.
      - State: `query = ''`, `kind: FindKind | null = null`, `active = 0`,
        `let localEntries: FindEntry[] = [];`.
      - Read the visitor's decks once, after mount — never during SSR:
        ```ts
        import { onMount } from 'svelte';
        import { readStored } from '../lib/storage';
        import { DECKS_KEY, migrateDecks } from '../lib/decks';
        import { localDeckEntries } from '../lib/find';
        onMount(() => {
          const store = readStored(DECKS_KEY, migrateDecks);
          localEntries = store ? localDeckEntries(store.decks) : [];
        });
        ```
        `readStored` already swallows a blocked or corrupt `localStorage` and returns `null`,
        so no extra guard is needed.
      - Refresh on every open so a deck created in another tab shows up:
        call the same three lines from `open()`.
      - `$: groups = findGroups([...entries, ...localEntries], query, kind, 6);`
      - `$: flat = groups.flatMap((group) => group.entries);` — the arrow-key traversal list.
      - Trigger: `<span aria-hidden="true">⌕</span><span>Find</span><kbd>⌘ K</kbd>`.
      - Dialog heading `<h2 id="search-title">Find</h2>`;
        `<label for="global-find">Search cards, docs, blog posts and decks</label>`;
        input `id="global-find"`.
      - Filter row:
        ```svelte
        <div class="find-filters" role="group" aria-label="Filter by kind">
          <button aria-pressed={kind === null} on:click={() => (kind = null)}>All</button>
          {#each FIND_KINDS as value}
            <button aria-pressed={kind === value} on:click={() => (kind = value)}>{FIND_KIND_LABEL[value]}</button>
          {/each}
        </div>
        ```
      - Results: one `<li role="presentation" class="find-group-label">{group.label}</li>`
        per group followed by its `<li role="option" id={`find-result-${entry.key}`}
        data-find-kind={entry.kind} aria-selected={flat[active]?.key === entry.key}>` rows
        rendering `<strong>{entry.title}</strong><span>{entry.detail}</span>`.
      - Keep `open`, `close`, `onWindowKeydown`, `keepActiveVisible`, `onInputKeydown`
        semantics; `navigate(route)` becomes `window.location.href = withBase(base, route)`.
      - Empty state: `<p id="find-results" class="search-empty">Nothing matches “{query}”.</p>`.
      *Criterion:* built `dist/index.html` carries `<span>Find</span>` and rows for every kind.
      **Met** — `data-find-kind` counts in `dist/index.html`: 6 card, 6 doc, 1 post, 2 deck.
      *Deviation:* `withBase` is inlined as a local `href` helper instead of imported from
      `../lib/catalog`. Importing it put the whole generated catalog in the island chunk
      (`FindPalette` js 386,281 B, over the 350 KiB total JS budget — `budgets:check` threw);
      inlined, the chunk is 4,995 B and budgets pass. Identical string arithmetic.
- [x] 7. In `website/src/layouts/BaseLayout.astro`: replace the `SearchPalette` import with
      `import FindPalette from '../components/FindPalette.svelte';`, replace the
      `searchCards` const (lines 40-49) with
      ```ts
      const findEntries = buildFindEntries({
        cards: catalog.cards.map(({ id, name, matchNames, route, sectionLabel, manifestIndex }) => ({ id, name, matchNames, route, sectionLabel, manifestIndex })),
        docs: catalog.docs.map(({ id, title, route, groupLabel }) => ({ id, title, route, groupLabel })),
        posts: catalog.posts.map(({ slug, title, route, date }) => ({ slug, title, route, date })),
        releases: catalog.releases.map(({ id, setName, version, route, decks }) => ({ id, setName, version, route, decks })),
      });
      ```
      and the element at line 104 with `<FindPalette client:load entries={findEntries} {base} />`.
      *Criterion:* `npm run ci` builds 151 pages and every one carries the palette. **Met** —
      `chrome: 151 pages carry the site header` with the new Find gate armed.
- [x] 8. In `website/src/pages/releases/[stage]/[package].astro`, change the deck heading to
      `<h3 id={`deck-${deck.id}`}>{deck.id}</h3>` and add
      `scroll-margin-top: calc(var(--header) + 1rem);` for `[id^='deck-']` in `global.css`.
      *Criterion:* the built release page carries the anchors the deck routes point at.
      **Met** — `dist/releases/alpha/LOTA-0001-Alpha-0-1/index.html` has `id="deck-burning-abyss"`
      and `id="deck-nekroz"`.
- [x] 8a. Make `/decks/` deep-linkable in `website/src/components/DeckManager.svelte`:
      - import `deckIdFromHash` from `'../lib/decks'`;
      - inside the existing `onMount`, after `store = readStored(...)`, add
        `selectedId = deckIdFromHash(globalThis.location.hash);` and clear it when no deck
        in `store.decks` has that id, so a stale link opens the list instead of nothing;
      - add `window.addEventListener('hashchange', …)` doing the same, so a Find result
        picked while already on `/decks/` switches the open deck;
      - in the per-deck **Open** handler (line 149), also set
        `globalThis.history.replaceState(null, '', `#deck-${deck.id}`)` so the URL always
        reflects the open deck and can be shared back into Find.
      *Criterion:* `deckIdFromHash` is imported and used on mount + `hashchange`, the Open
      handler calls `history.replaceState`, and `astro check` reports 0 errors. **Met** —
      `selectFromHash()` guards against a stale id by clearing `selectedId`; the listener is
      removed in the `onMount` teardown. Pure-function half proven by
      `tests/unit/deck-deep-link.test.ts` (3 rows green). Browser half is e2e-only — see 12a.
- [x] 9. Add styles to `website/src/styles/global.css` next to the existing `.search-panel`
      rules:
      ```css
      .find-filters {
        display: flex;
        flex-wrap: wrap;
        gap: 0.35rem;
        margin: 0.75rem 0 0;
      }
      .find-filters button {
        padding: 0.35rem 0.7rem;
        font-size: 0.85rem;
      }
      .find-filters button[aria-pressed='true'] {
        border-color: var(--accent);
        background: color-mix(in oklch, var(--accent) 18%, var(--sleeve));
      }
      .find-group-label {
        color: var(--silver-ink);
        font: 0.72rem/1.2 var(--font-display);
        letter-spacing: 0.08em;
        text-transform: uppercase;
        padding: 0.9rem 0.75rem 0.35rem;
      }
      .search-panel li[role='option'] strong {
        font-weight: 600;
      }
      ```
      *Criterion:* the rules exist in `@layer components` and `npm run format:check` +
      `astro check` pass. **Met.** *Extra:* dropped `text-transform: capitalize` from
      `.search-panel li span` — the detail column now carries already-cased text
      (`Saved in this browser`, a set name, a date), which that rule would have title-cased.
- [x] 10. In `website/scripts/check-chrome.mjs::chromeIssues`, add after the utility-link
      loop (keeping the `404.html` early-out):
      ```js
      if (!html.includes('class="search-trigger"') || !/>Find<\/span>/.test(html))
        problems.push(`${file}: header is missing the Find palette`);
      // Browser-local decks are read at runtime, in the visitor's own browser.
      // Seeing one in a built file means the index was assembled at build time.
      if (html.includes('deck:local:'))
        problems.push(`${file}: a browser-local deck leaked into the built page`);
      ```
      *Criterion:* the gate must actually FAIL a build when a local deck is present, proven
      with real output. **Met** — injecting `<li id="find-result-deck:local:u1">` into
      `dist/index.html` and running `node scripts/check-chrome.mjs` throws
      `Error: index.html: a browser-local deck leaked into the built page`; after restoring the
      file the same command prints `chrome: 151 pages carry the site header`. T9's reading-rail
      additions were preserved (added to `chromeIssues`, nothing overwritten).
- [x] 11. Update `website/tests/e2e/showcase.spec.ts` line 61 to
      `page.getByRole('button', { name: /Find/ })`, and extend that spec: type `zones`,
      expect a `Docs` group row linking to `/docs/rules/zones/`; click it and assert the URL.
      *Criterion:* the spec compiles under `astro check` and names only selectors the new
      palette emits. **Met** (written; cannot be executed here — see 12a). The stale
      `No card name matches “Trishula”.` assertion became `Nothing matches “zzzz”.`: the old
      copy no longer exists, and `zzzz` is chosen because four z's cannot be a subsequence of
      any indexed title, so every kind drops and the empty state is reached deterministically.
- [x] 11a. Add an e2e case for private decks in `website/tests/e2e/showcase.spec.ts`:
      go to `/decks/`, create a deck named `E2E Private Deck`, open `⌘K`, type `private`,
      assert a row with `data-find-kind="deck"` and the text `Saved in this browser`,
      click it, and assert the URL ends with `/decks/#deck-` and that the deck editor
      shows `E2E Private Deck` as the open deck.
      *Criterion:* the case exists and asserts `data-find-kind="deck"` + `Saved in this browser`
      + a `/decks/#deck-` URL. **Met** (written; execution blocked — see 12a).
- [x] 12. Run `cd website && npm run test`.
      *Criterion:* exit 0. **Met** — `Test Files 40 passed (40) / Tests 363 passed (363)`,
      `CI EXIT=0`.
- [ ] 12a. Run `npm run test:e2e`. **BLOCKED, pre-existing, not this ticket.** Playwright's
      Chromium cannot launch in this environment: `ldd
      ~/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome` reports `libglib-2.0.so.0`,
      `libatk-1.0.so.0`, `libcairo.so.2`, `libgbm.so.1` and 6 more as `not found`. Box stays
      unchecked. The three browser-only behaviours it would cover (⌘K flow, private decks in
      the palette, deck deep links) are covered here by: 14 pure-function rows over the
      index/merge/sort, 3 rows over `deckIdFromHash`, 5 rows over the two build gates,
      and assertions over built `dist/` HTML (`data-find-kind` per kind, `id="deck-*"` anchors,
      `<span>Find</span>`).
- [x] 13. Run `cd website && npm run format && npm run ci`, then `npm run budgets:check`.
      *Criterion:* `npm run ci` exit 0 and budgets within limits. **Met** — `CI EXIT=0`
      (`format:check`, `lint`, `astro check` 0 errors, 363 tests, build → `dist scan: clean`,
      `404: redirects to site root`, `chrome: 151 pages carry the site header`); budgets:
      `9 JS, 151 HTML, 205 images, 50 print masters (16 MiB) within limits`.

## Outputs

- Touched: `website/src/lib/find.ts` (new), `website/tests/unit/find.test.ts` (new),
  `website/tests/unit/deck-deep-link.test.ts` (new),
  `website/src/components/FindPalette.svelte` (renamed from `SearchPalette.svelte`),
  `website/src/components/DeckManager.svelte`, `website/src/lib/decks.ts`,
  `website/src/layouts/BaseLayout.astro`,
  `website/src/pages/releases/[stage]/[package].astro`, `website/src/styles/global.css`,
  `website/scripts/check-chrome.mjs`, `website/tests/unit/chrome.test.ts`,
  `website/tests/e2e/showcase.spec.ts`.
- Behaviour: one palette over four content kinds; the visitor's own decks appear at the top
  of the deck group; both published and local decks are addressable by anchor
  (`/releases/<stage>/<package>/#deck-<id>` and `/decks/#deck-<id>`).
- Migrate/config: the `SearchPalette` component no longer exists. `/decks/` now reads and
  writes `location.hash`; no stored data shape changes.

## Validation

All build-dependent evidence was gathered in a disposable detached worktree at HEAD carrying
only this ticket's diff, because the shared tree has an unrelated in-flight `cards_mse/` edit
that fails `validatePackageHashes`. Editing happened in the main tree as normal.

- [x] `cd website && npx vitest run tests/unit/find.test.ts tests/unit/deck-deep-link.test.ts tests/unit/chrome.test.ts` — passed
      → `Test Files 3 passed (3) / Tests 71 passed (71)` (14 find + 3 deep-link + 54 chrome)
- [x] `cd website && npm run test` — all pass → `Test Files 40 passed (40) / Tests 363 passed (363)`
- [ ] `cd website && npm run test:e2e` — **BLOCKED (pre-existing)**: Playwright Chromium is
      missing `libglib-2.0.so.0` and 9 further shared libraries. See Impl 12a.
- [x] `cd website && npm run ci` — exit 0; `npm run budgets:check` within limits
      → `CI EXIT=0`; `budgets: 9 JS, 151 HTML, 205 images, 50 print masters (16 MiB) within limits`
- [ ] manual: `npm run dev`, `⌘K` — grouped index appears with no query; type `nek` →
      Cards + Docs groups; click the `Zones` doc row → lands on `/docs/rules/zones/`;
      pick the `Decks` filter → only decks, clicking a published one scrolls to its heading
      on the release page
      **UNCHECKED — no browser available here** (see 12a). Automated equivalents that did run:
      the grouped-index-on-empty-query, cross-kind grouping, per-kind cap and kind-filter rows
      in `tests/unit/find.test.ts`; and the built `dist/index.html` renders the browsable index
      server-side with `data-find-kind` counts 6 card / 6 doc / 1 post / 2 deck.
- [ ] manual (private decks): create two decks on `/decks/`, then `⌘K` → the `Decks` group
      lists both above the published decks, each marked `Saved in this browser`; click one →
      `/decks/#deck-<id>` opens with that deck selected; open the same deck from the list →
      the URL hash updates
      **UNCHECKED — no browser available here.** Automated equivalents that did run:
      `puts local decks above published ones` (deck group orders `local, local, catalog,
      catalog`), `indexes a local deck by name`, `sorts local decks by most recently updated`,
      `returns nothing for an empty deck store`, and the three `deckIdFromHash` rows.
- [x] manual (privacy): `npm run build`, then a `deck:local:` sweep of `dist/` — clean
      *Scoped to built pages, which is exactly what the gate enforces:*
      `grep -rl "deck:local:" dist --include='*.html'` → no match, `clean`.
      The ticket's unscoped `grep -r ... dist/` prints LEAK, but the sole hit is
      `dist/_astro/FindPalette.*.js` containing the source template literal
      ``key:`deck:local:${e.id}` `` inside `localDeckEntries` — the runtime code that *builds*
      those keys in the visitor's own browser, not any deck data. That literal must exist for
      the feature to work; hiding it from the bundle would only defeat the minifier, not
      protect anything. `"source":"local"` appears in no built file; the only deck key
      server-rendered into HTML is `deck:catalog:alpha-LOTA-0001-Alpha-0-1`.
- [x] app functional — every page's header shows the `Find` trigger (build gate)
      → `chrome: 151 pages carry the site header`, with the new
      `header is missing the Find palette` rule armed over all 151.
- [x] commit msg draft: `feat(website): search cards, docs, posts and decks from one Find palette`

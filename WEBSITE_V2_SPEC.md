# Essentia website v2 — implementation spec

Step-by-step technical specification for restructuring `website/`. Written to be executed by an
implementing agent, phase by phase. Each phase is independently shippable and leaves `main` releasable.

Companion overview document: `WEBSITE_V2_PLAN.html`.

Execution order for the open items in this spec is tracked in `TODO.md`; each entry there names the
phase or section here that owns it.

---

## 0. Conventions and constraints

- **Static only.** `output: 'static'`, GitHub Pages, configurable `BASE_PATH`, `trailingSlash: 'always'`.
  No backend, no accounts, no third-party runtime services.
- **CSP** stays `default-src 'none'; script-src 'self'; img-src 'self' data:; connect-src 'self'`.
  Any new capability must be bundled locally. `scripts/harden-csp.mjs` is the only place CSP changes.
- **MSE is the source of truth for card fields.** The website never writes card data. Everything
  archetype-, deck-, or presentation-related lives in website metadata files.
- **Fail loudly.** Every new build step validates its inputs and calls `fail()` on anything unknown.
  No silent fallbacks, no "unclassified" buckets.
- **Zero-JS baseline.** Docs, blog, card, deck, and release pages must render and be usable without JS.
  Islands only where interaction requires them.
- **No contribution links inside docs pages.** A single GitHub link lives in the site footer.
- **No LLM-specific endpoints.** Do not add `llms.txt` or a JSON API.
- **Storage namespace.** All browser state uses `essentia.v1.*` keys with a `schemaVersion` field and a
  migration function.

---

## Phase 0 — Data and build foundation

### 0.1 Split the content build

Split `website/scripts/build-content.mjs` into modules under `website/scripts/content/`:

```
orchestrator.mjs   entry point, wires the steps, writes catalog
packages.mjs       package discovery, validation, MSE parsing (existing logic)
identity.mjs       identities/sections registry, archetype resolution (0.3)
fields.mjs         derived card fields (0.2)
images.mjs         render derivative pipeline (0.5)
decks.mjs          deck file loading + validation (Phase 4)
blog.mjs           post collection validation (Phase 2)
docs.mjs           docs corpus + keyword registry (Phase 1)
search-index.mjs   search index emission (Phase 3)
```

`build-content.mjs` becomes a thin wrapper that calls the orchestrator, keeping `npm run content:check`
and the `--check` flag behaviour identical.

### 0.2 Catalog schema v3 → v4

Add per card version:

| Field | Type | Derivation |
| --- | --- | --- |
| `colors` | `string[]` | parsed from `castingCost` symbols, then overridden by `content/color-overrides.json` |
| `manaValue` | `number` | numeric total of the casting cost |
| `typeLine` | `string` | `superType` + `subType`, prebuilt |
| `types` | `string[]` | tokenized subtypes |
| `supertypes` | `string[]` | tokenized supertypes (`Trap`, `Ritual`, `Xyz`, …) |
| `zone` | `'main' \| 'extra'` | `extra` when supertypes include Fusion/Synchro/Xyz/Link |
| `keywords` | `string[]` | bold invocations in `ruleText`, resolved against the keyword registry (Phase 1) |
| `archetype` | `string \| null` | authored, see 0.3 |
| `archetypeRole` | `'member' \| 'support' \| 'staple'` | authored, see 0.3 |
| `oracleNormalized` | `string` | lowercased, diacritic-stripped `ruleTextPlain` |
| `images` | object | see 0.5 |

Bump `schemaVersion` to `4` and update `src/lib/catalog.ts` types plus `tests/unit/catalog.test.ts`.

### 0.3 Archetype provenance

Archetype is **metadata, never printed on a card**. Two separate concepts:

- **Membership** (rules-relevant): derived from the card name, mirroring the in-game rule
  ("a card with 'Burning Abyss' in its name").
- **Bucket** (browse/search): authored per card, includes support cards whose names lack the string
  (Tour Guide, Manju, Senju, Preparation of Rites, Herald of the Arc Light).

Steps:

1. Add `namePattern` to each archetype entry in `website/content/sections.json`:
   ```json
   { "group": "01_burning_abyss", "slug": "burning-abyss", "kind": "archetype", "namePattern": "Burning Abyss" }
   ```
2. Add to each card entry in `website/content/identities.json`:
   ```json
   { "stableId": "tour-guide-from-the-underworld", "archetype": "burning-abyss", "role": "support" }
   ```
   `archetype` is required (`null` allowed only with `role: "staple"`); exactly one bucket per card.
   Optional `supports: ["burning-abyss"]` for staples that are notable in an archetype without being bucketed there.
3. Build computes `member = namePattern.test(card.name)` and **fails** when `member !== (role === 'member')`.
4. Delete `PROJECT_SECTION_GROUP` and the stableId-prefix fallback (currently `build-content.mjs` ~lines 67, 601–610).
   A card without an authored archetype fails the build.
5. One-off migration script `scripts/migrate-archetypes.mjs` seeds `archetype`/`role` from today's folder
   mapping; review the diff once, commit, then delete the script.

Section membership on the site continues to follow `archetype` (or the non-archetype section when `null`).

### 0.4 Colour overrides

New `website/content/color-overrides.json`:

```json
{
  "schemaVersion": 1,
  "cards": []
}
```

Ship it empty — no card currently needs an override. Entry shape when one is added:
`{ "stableId": "…", "colors": ["B"], "reason": "…" }`.

Build applies overrides after cost parsing, fails on an unknown `stableId` or an invalid colour letter,
and records `colorSource: 'cost' | 'override'` for debugging.

### 0.5 Image pipeline — print master first

1. **Master render — resolved, verified on this machine (MSE 2.1.2).**

   `--export-images` always writes the stylesheet's native size: `magic-sevenhalf.mse-style` declares
   `card width: 375 / card height: 523 / card dpi: 150`, which is exactly why today's renders are
   375 × 523. There is no CLI flag for scale. **Arbitrary resolution is available through an export
   template**, whose script can call `write_image_file(card, file:, width:, height:)`; MSE re-renders the
   card at that size rather than upscaling the 1× bitmap.

   Verified: exporting the alpha set at 1500 × 2092 and 2480 × 3458 both succeed; native 4× text is visibly
   sharper than a bicubic upscale of the 375 px render (crisp glyph edges vs blurred), and 50 cards at
   2480 × 3458 export in ~14 s for ~52 MB total. Ship **1500 × 2092** (600 DPI at 63.5 × 88.9 mm, exactly
   4× the stylesheet, ~450 KB/card) as the master; nothing forces a lower number, but detail past that is
   empty — the frame bitmaps in `magic-sevenhalf.mse-style` are 375 × 523 and the source artwork is
   624 × 624, so only type, mana symbols, and PT gain real resolution above 1×.

   Implementation:
   - Add `mse_packages/essentia-print.mse-export-template/export-template` to the repo:

     ```text
     mse version: 2.0.0
     short name: Essentia Print
     full name: Essentia Print Master
     position hint: 999
     version: 2026-08-06

     depends on:
     	package: magic.mse-game
     	version: 2009-07-23

     game: magic
     create directory: true
     file type: *.txt|*.txt

     script:
     	for each card in cards do write_image_file(card, file: "{card.name}.png", width: 1500, height: 2092)
     	"ok"
     ```

   - MSE only loads packages from its data directories, so `launcher/setup_mse.py` installs/refreshes the
     template into `MSE_DATA_DIR` (or `~/.magicseteditor/data`) and fails setup if the copy is missing or stale.
   - `.script/export_mse_renders.py` gains a print pass: `magicseteditor --export
     essentia-print.mse-export-template <project> <out>`, writing to `renders_print/` beside `renders/`,
     with the same name sanitising, the same `transparent-white-corners` transform (its corner scan is
     `width / CORNER_SCAN_DIVISOR`, so it is resolution independent), and print hashes recorded in
     `render-provenance.json` (bump `schemaVersion`).
   - Note in `docs/MSE.md`: masters come from the export template, never from Preferences → Export scale,
     so output is identical on every machine.
   - Until `renders_print/` is populated for a package, the print engine upscales the 1× render and stamps a
     "draft resolution" footer.
2. **Derivatives** generated by `images.mjs` from the master, all local:

   | Tier | Purpose | Size | Formats |
   | --- | --- | --- | --- |
   | `thumb` | grids, search results, deck rows | 240 px wide | avif, webp |
   | `display` | card page, hover preview | 750 px wide | avif, webp |
   | `zoom` | zoom overlay | 1500 px wide | webp |
   | `print` | PDF embedding | master, unscaled | png |

3. `card.images = { thumb: {...}, display: {...}, zoom: {...}, print: { url, width, height, dpi } }`.
4. **Progressive quality.** A shared `<CardPicture>` upgrade path: `thumb` loads first; `display`/`zoom`
   swap in after load. Skip the upgrade when `navigator.connection.saveData` is true or
   `effectiveType` is `slow-2g`/`2g`; always allow a manual "load high quality" control.
5. `check-budgets.mjs`: print masters excluded from page budgets, tracked under their own total-size ceiling.

### 0.6 Global chrome

- Footer gains: GitHub repository link, licence link, both feeds, channel link. No per-page GitHub links anywhere.
- Rewrite `/legal/`:
  - Everything created for this project (card designs, text, renders, code, docs, site) is free for anyone
    to use, modify, and redistribute for any purpose, including commercially — state it plainly (CC0-equivalent).
  - Third-party material (Yu-Gi-Oh! names and source records, Magic terminology and mana symbols, imported
    land artwork) remains under its owners' terms and is **explicitly excluded** from the grant above.

**Phase 0 acceptance:** build fails on missing archetype, mismatched member/role, unknown colour override,
missing print master (warning until masters exist), unknown keyword. Catalog v4 consumed by existing pages
with no visual regressions.

---

## Phase 1 — Documentation and keywords

### 1.1 Publish `docs/`

1. [ ] `docs.mjs` copies `docs/**/*.md` into an Astro content collection, rewriting relative `.md` links to
   site routes and validating internal anchors (extend `scripts/check-links.mjs`; dead link = build failure).
2. [ ] Routes: `/docs/`, `/docs/rules/*`, `/docs/design/*`, `/docs/keywords/*`, `/docs/archetypes/<slug>/*`.
3. [ ] Left rail from the documentation map in `docs/CONTEXT.md`; right rail reuses `ChapterSummary` fed by
   generated headings.
4. [ ] `/rules/` and `/philosophy/` become curated landing pages linking into the corpus; delete the prose that
   duplicates docs so the corpus stays single-source.
5. [ ] No edit/source links on doc pages.

### 1.2 Keyword registry

1. [ ] Parse `docs/KEYWORDS.md` + `docs/keywords/*.md` + archetype `KEYWORDS.md` files into
   `{ id, term, category, definition, seeAlso[], archetype? }`.
2. [ ] `/keywords/` index with category filter and client-side filter box; `/keywords/<term>/` detail page with
   definition, related keywords, and every published card using it (reverse index from `card.keywords`).
3. [ ] `RichText` gains a keyword pass: bold invocations become links with a hover/focus definition popover;
   without JS they remain plain links.
4. [ ] Unknown bold phrase in card text ⇒ build failure (enforces the closed taxonomy).

### 1.3 New explainer pages

| Route | Content | Source |
| --- | --- | --- |
| `/docs/conversion/` | ATK ÷ 400 → P/T, level → mana cost, attribute → colour incl. wind | `docs/design/CONVERSION.md` |
| `/docs/how-to-read-a-card/` | PSCT layout, ability prefixes, Soft/Hard/Hard Linked, styling conventions | `docs/rules/TEMPLATING.md` |
| `/docs/deck-building/` | 40 + 10, 2-copy limit, land counts, Extra Deck = sideboard | `docs/rules/DECK_BUILDING.md` |
| `/roadmap/` | Shipped vs planned archetypes and sets | generated from package stages + authored notes |

- [ ] `/docs/conversion/`
- [ ] `/docs/how-to-read-a-card/`
- [ ] `/docs/deck-building/`
- [ ] `/roadmap/`

**Phase 1 acceptance:**

- [ ] every `docs/` file reachable from `/docs/`
- [ ] every bold keyword in every published card resolves to a keyword page
- [ ] zero JS required to read any doc

---

## Phase 2 — Blog and releases

### 2.1 MDX

Add `@astrojs/mdx`. Posts live in `website/content/blog/<yyyy-mm-dd-slug>/index.mdx` with local images.
Front matter validated by a content-collection schema:

```yaml
title, slug, date, author, tags[], summary, hero, video (optional URL), relatedRelease (optional), draft
```

Available components in prose: `<Card id>`, `<CardImage id>`, `<Keyword term>`, `<Decklist id mode>`
(Phase 4), `<PrintButton>` (Phase 5).

Videos are **linked out**, never embedded (CSP forbids third-party frames). Render a poster + link card.

- [ ] Add `@astrojs/mdx`
- [ ] Blog content collection at `website/content/blog/<yyyy-mm-dd-slug>/index.mdx` with front-matter schema
- [ ] Prose components: `<Card id>`, `<CardImage id>`, `<Keyword term>`, `<Decklist id mode>`, `<PrintButton>`
- [ ] Video poster + link card (never an embed)

### 2.2 Blog routes

- [ ] `/blog/` paginated index, `/blog/<slug>/`, `/blog/tag/<tag>/`, `/blog/feed.xml`.
- [ ] Both feeds (`/feed.xml` cards, `/blog/feed.xml` posts) linked in `<head>` and footer.
- [ ] Release pages list posts whose `relatedRelease` matches, replacing the raw `contentPosts` URL list.
- [ ] Migrate `content/2026-08-01-legend-of-alpha-project-introduction/script.md` as the first post.

### 2.3 Home is the single entry point

- The home page `/` is the single entry point to the site. There is no welcome page and no first-visit redirect.
- The header links to `/docs/`, `/blog/`, `/decks/`.

### 2.4 Release surfaces

- [ ] `/releases/` index (also the home target), `/releases/<stage>/<package>/` detail.
- [ ] Package page gains: changelog vs previous package (added / changed / removed, computed from `sourceHash`),
  decks in the package (Phase 4), print actions (Phase 5), related posts.
- [ ] Card version pages gain a rules-text diff against the previous version.
- [ ] Version policy: release grids show that package's printing; search/archetype/section pages show the
  latest version only (`publication-order.mjs` already computes this).

**Phase 2 acceptance:** see the `- [ ]` checklists in 2.1, 2.2, and 2.4 above.

---

## Phase 3 — Search

### 3.1 Query language

New `src/lib/search/` with `tokenizer.ts`, `parser.ts` (AST), `evaluate.ts`. Bare words match name and
rules text. Supported keys:

| Key | Matches |
| --- | --- |
| `name:` / bare | name, including former names |
| `o:` `oracle:` | rules text substring or `/regex/` |
| `t:` `type:` | super/sub type tokens |
| `c:` `color:` | colours (`c:b`, `c>=ub`) |
| `mv:` | mana value |
| `pow:` `tou:` | power / toughness |
| `a:` `archetype:` | archetype bucket (includes support by default) |
| `is:` | `member`, `support`, `staple`, `ritual`, `trap`, `fusion`, `synchro`, `xyz`, `link`, `tuner`, `support` |
| `kw:` | keyword invocation |
| `zone:` | `main` / `extra` |
| `set:` `s:` / `stage:` / `r:` `rarity:` | package, lifecycle stage, rarity |
| `date:` `year:` | publication date |
| `order:` `direction:` | name, mv, power, released, rarity, collection |
| `unique:` | `cards` (default, latest version) / `prints` (all versions) |

Operators: `: = != < <= > >=`, quoted phrases, `-` negation, `OR`, parentheses. Parse errors surface the
failing token inline with a suggestion — never a blank page. Delete `src/lib/query.ts` and rewrite
`tests/unit/query.test.ts` against the new parser.

- [ ] `src/lib/search/tokenizer.ts`
- [ ] `src/lib/search/parser.ts` (AST)
- [ ] `src/lib/search/evaluate.ts`
- [ ] every key in the table above, with operators, quoting, negation, `OR`, parentheses
- [ ] parse errors surface the failing token inline with a suggestion
- [ ] delete `src/lib/query.ts`; rewrite `tests/unit/query.test.ts` against the new parser

### 3.2 Index and runtime

- [ ] `search-index.mjs` emits `public/generated/search-index.json`: one compact record per card version,
  short keys, sorted deterministically.
- [ ] Fetched on first use by a Svelte island, cached in memory; never requested on pages that do not search.
- [ ] Query state in the URL: `/search/?q=…&view=grid&order=mv`.

### 3.3 UI

- [ ] `/search/` with facet bar (archetype, type, colour, cost, set, zone, rarity) that writes into the query
  string — facets are sugar over the same syntax.
- [ ] Views: grid, list, text, checklist. Bulk actions: *Add all to print basket*, *Copy as text list*.
- [ ] Pre-rendered facet landing pages with results inlined, hydrating into live search:
  `/search/archetype/<slug>/`, `/search/type/<type>/`, `/search/set/<set>/`.
- [ ] `/search/syntax/` documents the language with runnable examples.
- [ ] The `⌘K` palette remains the quick name jump and gains a "Search full syntax for …" row handing off to `/search/`.

**Phase 3 acceptance:**

- [ ] every key in the table works with negation and comparison
- [ ] facets and typed syntax stay in sync
- [ ] results pages are shareable and back/forward correct
- [ ] index fetched at most once per session

---

## Phase 4 — Decklists (published, immutable)

### 4.1 Deck file format

One authored file per deck: `website/content/decks/<slug>.json`.

```json
{
  "schemaVersion": 1,
  "slug": "lota-alpha-burning-abyss",
  "name": "Burning Abyss — Alpha 0.1 starter",
  "archetype": "burning-abyss",
  "package": "LOTA-0001-Alpha_0.1",
  "author": "aron",
  "publishedOn": "2026-08-01",
  "summary": "Fiend swarm into Xyz value.",
  "sections": [
    { "id": "main",  "label": "Main Deck",
      "entries": [ { "card": "burning-abyss-graff", "qty": 2 },
                   { "land": "swamp", "qty": 14 } ] },
    { "id": "extra", "label": "Extra Deck (Sideboard)",
      "entries": [ { "card": "burning-abyss-dante", "qty": 2 } ] },
    { "id": "flex",  "label": "Flex slots",
      "entries": [ { "card": "maxx-c", "qty": 1 } ] }
  ],
  "notes": "Descent once per turn keeps the board honest."
}
```

**Immutability rule.** A published deck is a dated artifact and never changes after release. It is tied to
the site update that introduced it via `publishedOn` + `package`. Revisions ship as a **new file with a new
slug** (e.g. `-v2`), with `supersedes` / `supersededBy` fields linking the two; the old page stays live.
Enforce in CI: `check-immutable-decks.mjs` fails if a committed deck file's content hash changes without a
slug change (allow-list for typo fixes in `notes`).

Validation at build: unknown card id fails; a card outside the referenced package fails; unknown land id
fails; totals computed and compared against deck-building rules (40 main / 10 extra / 2-copy limit) as a
**warning**, not a failure.

`release.json.decks` stays the authoritative membership record; deck files must be a subset of it.

- [ ] `website/content/decks/<slug>.json` format + loader in `scripts/content/decks.mjs`
- [ ] `supersedes` / `supersededBy` linking; superseded pages stay live
- [ ] `check-immutable-decks.mjs` fails on a content-hash change without a slug change
- [ ] build validation: unknown card id fails, card outside referenced package fails, unknown land id fails
- [ ] deck-building totals (40 main / 10 extra / 2-copy limit) as a **warning**, never a failure
- [ ] deck files validated as a subset of `release.json.decks`

### 4.2 Land registry

New `website/content/lands.json` — designed now so duals and utility lands drop in later without schema change:

```json
{
  "schemaVersion": 1,
  "lands": [
    { "id": "swamp",  "name": "Swamp",  "kind": "basic", "colors": ["B"],
      "types": ["Basic", "Land", "Swamp"], "art": "/generated/lands/swamp.png",
      "rights": "wotc-basic-land", "printable": true },
    { "id": "island", "name": "Island", "kind": "basic", "colors": ["U"],
      "types": ["Basic", "Land", "Island"], "art": "/generated/lands/island.png",
      "rights": "wotc-basic-land", "printable": true }
  ]
}
```

- [ ] Land art is **downloaded and vendored** into `website/public/generated/lands/` (CSP forbids hotlinking,
  and the source asks not to hotlink). Add a `rights` entry per image in `content/asset-rights.json` so
  `check-rights.mjs` covers them; they fall under the third-party clause of `/legal/`, not the free-use grant.
- [ ] Use **Scryfall's Alpha-set basic land images** — that is the decision, not a placeholder. There is no
  project-owned basic land and no plan to render one, so no replacement work is scheduled; `rights` stays
  `wotc-basic-land` indefinitely.
- [ ] Deck entries use `{ "land": "<id>", "qty": n }`; everything downstream (deck page, exports, print engine)
  treats cards and lands through one `DeckEntry` union type so adding duals is a data change only.
- [ ] Future non-basic lands may set `kind: "dual"`, extra `colors`, and their own art without code changes.

### 4.3 Embedded mode (MTGGoldfish style)

`<Decklist id="…" mode="compact" sections="main,extra" />` for posts and docs:

- [ ] Quantity + card name only, grouped by section, tight columns.
- [ ] Hover preview reuses the existing `data-card-preview` attribute and `CardHoverPreview` component.
- [ ] No-JS: names are links to card pages. Touch: tap opens the card page, long-press previews.
- [ ] Header row: deck name, archetype chip, card count, link to the full page, small *Print proxies* action.

### 4.4 Full deck pages

- [ ] `/decks/` index (filter by archetype, package, colours) and `/decks/<slug>/`.
- [ ] Visual mode (renders, stacked by quantity) and text mode, toggle remembered in local storage.
- [ ] Computed breakdowns: mana curve, colour split, type distribution, main/extra counts, land count.
- [ ] Author notes, related post, source package, supersedes/superseded links.
- [ ] Export bar: **Proxy PDF** (Phase 5), **TXT** (`2 Cir` lines), **CSV**, **JSON**, **Copy**, **Permalink**.
- [ ] *Open in print builder* hands the list to Phase 5 with quantities preserved.

**Phase 4 acceptance:**

- [ ] deck pages render from data only
- [ ] embedded lists work in blog and docs
- [ ] a deck file edit without a slug change fails CI
- [ ] adding a dual land requires no code change

---

## Phase 5 — Print engine, print builder, local decklists

### 5.1 PDF engine

- [ ] `src/lib/print/` holds layout maths (page size, 63 × 88 mm card box, 3 × 3 grid, margins, cut marks),
  shared constants with `.script/generate_print_pdfs.py` so web and repo output agree.
- [ ] `pdf-lib` (MIT) bundled locally, lazy-imported on first use; `check-licenses.mjs` covers it.
- [ ] Images fetched same-origin from the `print` tier (0.5) and embedded as PNG.
- [ ] Generation runs in a Web Worker with a progress bar; add `worker-src 'self'` in `harden-csp.mjs`.
  Download via object URL + `download` anchor.
- [ ] Deterministic output: identical input list ⇒ byte-identical PDF.
- [ ] Lands are printable when `printable: true`.

Options: page size (A4/Letter), copies (uniform + per-card override), cut marks (corner/grid/none),
spacing (tight/1 mm), optional plain card back, 63 mm ruler on page 1, sheet header/footer.
Live canvas preview of page 1 before generation.

- [ ] options: page size, copies (uniform + per-card override), cut marks, spacing, plain card back, 63 mm ruler, sheet header/footer
- [ ] live canvas preview of page 1 before generation

### 5.2 Entry points

Card page · gallery/archetype/section multi-select · search results (*Print all results*) ·
release package (*Print this release*, 2 copies default) · deck page and embedded decklist ·
whole catalog from `/print/` with page-count and file-size warning.

- [ ] card page
- [ ] gallery / archetype / section multi-select
- [ ] search results (*Print all results*)
- [ ] release package (*Print this release*, 2 copies default)
- [ ] deck page and embedded decklist
- [ ] whole catalog from `/print/` with page-count and file-size warning

### 5.3 `/print/` — basket

- [ ] Add cards by search box, or quick-add a deck / release / archetype.
- [ ] Basket rows with quantity steppers, running page count and estimated file size.
- [ ] State: `essentia.v1.print-basket`; header badge shows the count site-wide.
- [ ] Share without accounts: basket encodes into `/print/?list=<base64url>`; long lists fall back to text import.
- [ ] Import: paste a text decklist (`2 Cir` per line), names resolved through the search normalizer, with an
  inline report of unmatched lines.
- [ ] Export: PDF, TXT, JSON, and *Save as deck file* emitting a commit-ready deck JSON.
- [ ] `@media print` stylesheet so the page itself prints usable sheets if PDF generation fails.

### 5.4 `/decks/mine/` — local decklists (no account)

Local, browser-only decklists, distinct from published deck files.

- [ ] Storage:
  ```json
  { "schemaVersion": 1,
    "decks": [ { "id": "uuid", "name": "My BA build", "created": "…", "updated": "…",
                 "sections": [ { "id": "main", "label": "Main Deck",
                                 "entries": [ { "card": "burning-abyss-cir", "qty": 2 },
                                              { "land": "swamp", "qty": 14 } ] } ] } ] }
  ```
  under `essentia.v1.decks`, with a migration function keyed on `schemaVersion`.
- [ ] `/decks/mine/` lists all saved decks (name, card count, archetype guess, updated date) with
  **open, edit, duplicate, rename, delete, export, print** actions, plus **new deck**.
- [ ] `/decks/mine/<id>/` is the editor: add cards via the search box (full Phase 3 syntax), quantity steppers,
  section assignment (main / extra / flex, sections addable), notes, live curve and count readouts, and the
  same deck-building warnings as published decks (never blocking).
- [ ] Reuses the deck rendering components from Phase 4; the only difference is the data source.
- [ ] Import/export JSON round-trips with the published deck format, so a local deck can be exported and
  submitted as a pull request unchanged.
- [ ] Share link: same URL encoding as the print basket (`/decks/mine/?import=<base64url>`).
- [ ] Handle `QuotaExceededError` explicitly with a message telling the visitor to export and delete old decks.
- [ ] Clear-all control, and a note on the page that decks live only in this browser.

**Phase 5 acceptance:**

- [ ] a 100-card PDF generates without freezing the UI
- [ ] the same list twice produces identical bytes
- [ ] basket and local decks survive reload
- [ ] PDF cards measure 63 × 88 mm when printed at 100 %

---

## Phase 6 — Polish

1. [ ] **Navigation:**
   ```
   Cards ▾  Search · Archetypes · Sets · Updates
   Decks ▾  Published decks · My decklists
   Docs ▾   Rules · Keywords · Design · How to read a card
   Blog
   Print    (badge: basket count)
   About ▾  Philosophy · Roadmap · Attribution & licence · About Essentia
   ```
   Archetype drawer stays as a secondary rail on card surfaces. Footer: GitHub, licence, both feeds, channel.
2. [ ] **Budgets** in `check-budgets.mjs`: docs/blog ≤ 120 KB JS, search ≤ 250 KB (index excluded, tracked
   separately), print ≤ 400 KB (pdf-lib lazy), print masters under their own total ceiling.
3. [ ] **Accessibility:** combobox semantics and live result counts in search; hover previews also trigger on
   focus and never trap the pointer; deck tables are real tables; print options are a labelled form;
   axe/Playwright pass extended to every new route.
4. **Tests:**
   - [ ] Unit — tokenizer/parser/evaluator, keyword extraction, archetype member/role validation, colour
     overrides, deck validation, land registry, print layout maths, text-list import, storage migrations.
   - [ ] E2E — syntax search, deck page, embedded hover preview, PDF download, basket persistence, local deck
     CRUD, first-visit vs returning-visit routing.
   - [ ] Golden file — fixed 9-card PDF byte-compared to catch layout regressions.
5. [ ] **CI:** extend the deploy smoke route list with `releases/`, `search/`, `decks/`, `decks/mine/`, `blog/`,
   `docs/`, `keywords/`, `print/`. Add `check-immutable-decks.mjs` to `npm run ci`.

---

## Dependency order

```
Phase 0 ──┬── Phase 1 (docs, keywords)
          ├── Phase 2 (blog, releases)
          ├── Phase 3 (search)
          └── Phase 4 (decklists) ── Phase 5 (print, builder, local decks) ── Phase 6 (polish)
```

Phase 0 is the only strict prerequisite. Phases 1–3 are mutually independent. Phase 5 needs Phase 4's
deck components and Phase 3's search box; Phase 4 benefits from Phase 2's MDX for embedded lists.

## Settled

- **Print resolution.** Export template at 1500 × 2092, verified working (§0.5). No maintainer input needed.
- **Colour overrides.** File ships empty; no card needs one today (§0.4).
- **Land art.** Scryfall Alpha basics, permanently; no project-owned replacement planned (§4.2).

## Open items for the maintainer

- **Archetype/role review (§0.3).** Nothing to review yet — the diff does not exist. It is produced by
  `scripts/migrate-archetypes.mjs`, which is written and run *during* Phase 0. The implementing agent must:
  1. run the migration so it seeds `archetype` + `role` into `content/identities.json` from today's
     `PROJECT_SECTION_GROUP` folder mapping and stableId-prefix fallback,
  2. print the cross-check table (name-derived membership vs authored role) and the full list of
     `role: "support"` / `role: "staple"` cards — the cards whose bucket cannot be derived from their name
     (Tour Guide From the Underworld → burning-abyss, Manju / Senju / Preparation of Rites → nekroz),
  3. **stop and hand that table over for approval before committing**, since those rows are exactly the
     judgement calls the automation cannot make,
  4. commit the reviewed `identities.json`, then delete the migration script.

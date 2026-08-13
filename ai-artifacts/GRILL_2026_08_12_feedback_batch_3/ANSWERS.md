# Grill: feedback batch 3

## Facts (measured, round 1)

### Item 1 — build time

- `npm run dev` = `cards:rebuild` **0.3 s** (already skip-cached) + `build-content` **107.4 s** + `astro dev`.
  `astro build` of all 152 pages = **1.56 s** — source: timed runs, `website/`
- All of the 107 s is `sharp` image encoding in `scripts/content/images.mjs`.
  `orchestrator.mjs:78` does `rm -rf public/generated` every run, then `packages.mjs:451`
  re-encodes 5 derivatives × 50 cards = **250 files / 63 MB** from scratch, **serially**
  (`for (const card of componentCards) … await buildCardImages`) on 1 of 16 cores
- Per-card encode cost, measured: `display.avif` 1662 ms · `thumb.avif` 299 ms ·
  `print.png` 315 ms · `display.webp` 114 ms · `thumb.webp` 46 ms = **2.44 s**.
  AVIF = **80 %** of total build time
- Scaling is linear: 2.1 s/card → **500 cards ≈ 17 min** per `npm run dev`
- Cache key already computed and thrown away: `packages.mjs:431-437` derives `renderHash`
  (sha256 of the canonical render), `aggregate.visualSourceHash`, `artworkHash`, and
  verifies them against `render-provenance.json` immediately before re-encoding anyway
- `website/public/generated/` is git-ignored (`.gitignore:38`) → a local cache dir is free

### Item 2 — related cards

- Two independent relation kinds in `scripts/content/related.mjs::buildRelatedGraph`
- **`archetype`** — authored. `content/identities.json` carries per card
  `archetype` (slug or `null`) + `role` (`member` / `support` / `staple`).
  Tour Guide is `archetype: "burning-abyss", role: "support"` with no `linked: true`,
  so `identity.mjs::resolveSection` files it under **non-archetype** while
  `buildRelatedGraph` still gives it **all 13 Burning Abyss cards**. `assertMembership`
  guarantees any card whose printed name carries a pattern must be `role: member`
- **`interaction`** — derived from rule text. Clauses split on `. ; — \n`, kept when they
  carry an `action` / `cost-procedure` keyword, then constraints are parsed
  (quoted names, subtypes, colour words, supertypes, MV comparison) and matched
  against every other card. Interaction ids already present under `archetype` are dropped
- Explosion is real and already visible: Leviair **41 of 49**, Maxx "C" 21,
  Stealth Kragen 20, Herald 11. Total 104 interaction + 424 archetype edges at 50 cards
- Benchmarked `buildRelatedGraph` on cloned corpora: 50 → 5 ms / 528 edges ·
  100 → 8 ms / 2 180 · 200 → 15 ms / 8 856 · 400 → 43 ms / 35 696 · **800 → 162 ms / 143 328**.
  CPU is a non-issue; the quadratic **payload** in `catalog.ts` and in every card page is

### Items 3–7 — current implementation

- Archetype backdrop today = `--page-atmosphere` (gradient stack) + `--page-pattern`
  per `html[data-theme]` in `global.css:1291-1510`, painted on `body::before` / `body::after`
  as `position: fixed; inset: 0` → covers header and rail by construction
- `archetypes/[slug].astro:24` gates the photo to a hardcoded
  `BACKGROUND_SLUGS = {burning-abyss, nekroz}`; `BaseLayout.astro` injects
  `html[data-page='archetype'] body { --page-photo: url(...) }` as a hashed `<style>`
  (CSP forbids inline style attributes)
- Only `public/backgrounds/burning-abyss.webp` and `nekroz.webp` exist.
  Shaddoll, Spellbook, Non-archetype have none
- Docs groups come from `website/content/reading-order.json` (`overview`, `design`, `rules`,
  `keywords`, `archetypes`, `project`); `docs.mjs::groupFor` fails the build on any doc not
  listed. 8 docs sit loose at the root of `docs/`. Rail renders flat `<p class="nav-label">`
  headings + `<ul>` — no collapsing (`Navigation.svelte:150-165`)
- Blog rail item = `{title}<small>{formatDate(date)}</small>` (`reading-nav.ts:78`);
  `/blog/` (`pages/blog/index.astro`) renders the full post list
- Docs/Blog switch is duplicated: desktop rail `Navigation.svelte:140-149` and mobile
  drawer `Navigation.svelte:225-234`. Header utility nav already has Learn / Blog / Decks

## Round 1 — whole frontier

| #   | Question | Answer | Precision |
| --- | -------- | ------ | --------- |
| 1   | Image derivative caching | Content-hash manifest: skip re-encode when source hash + tier params match, prune orphans, no `rm -rf` | — |
| 2   | AVIF cost | Keep AVIF, drop effort 4 → 2, generate only on `npm run build` | — |
| 3   | Reduced tiers in dev | Identical output in dev and build; rely purely on the cache | — |
| 4   | Derived interaction relations | **Remove the interaction block entirely**; keep only `Same archetype` | — |
| 5   | Archetype backdrop target | Paint on `<main>` (excludes header + rail), photo scrolls with content | Dim 60 %, blur 2 px so card text stays legible |
| 6   | Theme-removal breadth | Archetype pages only; archetypes without art fall back to flat black | Shaddoll/Spellbook have no cards yet, art comes later; an archetype with no background is intended |
| 7   | Split blog/docs/cards | Skip the split; fix caching + add a scope flag for non-card work | — |
| 8   | Docs grouping source | Folder-derived, natural filename order, numeric prefixes stripped from labels; **Aron does the renaming** | — |
| 9   | Collapsible docs groups | Current page's group open, rest collapsed, state persisted per group in localStorage | — |
| 10  | `/blog/` + date format | `/blog/` renders the latest post inline, `/blog/{slug}/` canonical, `DD/MM/YYYY` | — |
| 11  | Rail Docs/Blog switch | Remove from desktop rail **and** mobile drawer; header utility nav is the only switcher | — |

### Conflicts and consequences carried into round 2

- **Q2 vs Q3 contradict.** Q2 says AVIF is generated only by `npm run build`; Q3 says dev and
  build must emit identical output. Both cannot hold — round 2 Q1 resolves it
- **Measured after round 1:** `npm run content:check` — the full content build with every
  image write skipped — is **0.66 s**. That is the floor a warm cache converges on, so a
  `--scope` flag (Q7) would save well under a second. Round 2 Q3 re-puts item 4 to you
  with that number
- **Q4 blast radius:** deletes `related.mjs::buildRelatedGraph` interaction pass,
  `tests/unit/related-graph.test.ts` (interaction cases), `tests/unit/related-cards.test.ts`,
  `tests/e2e/related-cards.spec.ts` (interaction cases), the `Interacts with this card`
  block in `src/pages/cards/[id].astro:191-206`, and the `interaction` field on the catalog
  type. It also deletes `assertKnownNames`, today the only build guard that catches a
  misspelled card/archetype name inside rule text — round 2 Q2

## Round 2 — resolving conflicts left by round 1

| #   | Question | Answer | Precision |
| --- | -------- | ------ | --------- |
| 1   | AVIF conflict | Effort 2 everywhere, AVIF generated in dev **and** build — identical output wins | — |
| 2   | Typo guard after interaction removal | **Design changed:** keep a related section for cards that name an archetype they do not belong to; keep the guard | "every effect that says search X from archetype" |
| 3   | `--scope` flag | Drop it; the cache alone closes item 4 | — |
| 4   | Loose root docs | **No hard fail:** root-level docs appear at the start of the nav, alphabetical | — |
| 5   | Doc URL shape | Keep numbers in the URL: `/docs/02-rules/03-zones/` | — |
| 6   | Blog rail shape | Flat list, newest first, no group heading, full-width title, date beneath | — |
| 7   | Cache correctness | CI rebuilds cold into a temp dir and byte-compares against the cached output | — |

### Corpus facts measured for round 3

- Archetype names in rule text are **always curly-quoted**: `Search 1 “Nekroz” Creature`,
  `Sacrifice 2 “Burning Abyss” Creatures` → a name-reference rule needs no fuzzy matching
- **22 cards name their own archetype; 0 cards name an archetype they are not in.**
  The new relation renders nothing on today's corpus — it is forward-looking
- Tour Guide is not caught by it (`Summon 1 Fiend MV 1 Creature` — subtype, not name);
  its BA link remains the authored `archetype` field in `identities.json`
- Distinct quoted tokens in the whole corpus: Ash Blossom, Barbar, Brionac, Burning Abyss,
  C, Catastor, Clausolas, Dante, Decisive Armor, Gungnir, Maxx, Nekroz, Rubic, Shurit,
  Trishula, Unicore, Valkyrus — 2 archetypes, 15 card names, nearly all self-references
- Edge growth under the new rule is **linear** (one edge per quoted name per card)

## Round 3 — reference-relation semantics + docs root contract

| #   | Question | Answer | Precision |
| --- | -------- | ------ | --------- |
| 1   | Reference target granularity | One entry per referenced archetype, linking to the archetype page, with its card count | — |
| 2   | Direction | Both directions — referencing card shows what it names; named archetype's card pages list the outside cards that name it | — |
| 3   | Quoted individual card names | Yes — a quoted name matching another card creates a card-to-card relation; self-references ignored | — |
| 4   | Root docs + `/docs/` landing | Ungrouped links at the top of the rail, no heading; alphabetically first root doc also serves as `/docs/` | — |
| 5   | Folder → label rule | Strip numeric prefix, underscores → spaces, Title Case (`02_burning_abyss` → “Burning Abyss”) | — |

## Shared understanding

### Goal

Ship feedback batch 3 as commit-sized slices: kill the 109 s build, replace the quadratic
related-card matcher with a linear name-reference relation, swap archetype gradient themes
for content-scoped background photos, restructure docs navigation around the folder tree,
and simplify the blog rail. Item 4 (splitting the site into three apps) is closed by
measurement rather than implemented.

### Settled — A · build speed (item 1)

- **Root cause:** `scripts/content/orchestrator.mjs` deletes `public/generated` every run,
  then `packages.mjs` re-encodes 250 derivatives serially. AVIF at `effort: 4` is 80 % of it
- **Fix:** content-hash manifest under `public/generated/`, keyed by source hash + tier +
  format + encoder settings. Skip unchanged, prune orphans, no `rm -rf`
- **AVIF:** `effort: 4 → 2`, generated in dev **and** build. Dev and build output stay
  byte-identical; there is no reduced dev tier set
- **Proof of correctness:** a CI job rebuilds cold into a temp dir and byte-compares against
  the cached output; any drift fails the build
- **Target:** warm `npm run dev` ≈ 2.5 s (0.3 s python + 0.66 s content + 1.5 s Astro)

### Settled — B · related cards (item 2)

- **“Same archetype” block is unchanged**, driven by the authored `archetype` field in
  `content/identities.json`. Tour Guide keeps its Burning Abyss link this way
- **Deleted:** the constraint matcher — `extractClauses`, `parseConstraints`, `parseMv`,
  `matchesConstraints` and the whole-corpus scan, plus the `Interacts with this card` block
- **New relation — quoted names only, linear growth:**
  - a quoted **archetype** name on a card that is not a member → **one** entry linking to
    that archetype's page, showing its card count
  - a quoted **card** name matching another card → a direct card-to-card relation;
    self-references are ignored
  - **both directions**: the referencing card lists what it names, and the named side
    (archetype member pages, or the named card) lists the outside cards that name it
- **Guard kept:** a quoted name that matches no card and no archetype fails the build
- **Reality check:** 0 such edges exist in today's corpus (22 cards name their own
  archetype, none name a foreign one) → tests are fixture-based, and the blocks stay hidden
  until a real edge exists

### Settled — C · archetype backdrop (item 3)

- `--page-atmosphere` / `--page-pattern` removed **on archetype pages only**; other themes
  keep their current look
- Background photo painted on `<main>` — header and left rail are siblings, so they are
  excluded structurally. Photo scrolls with content, dimmed 60 %, blurred 2 px
- An archetype without background art renders flat black. That is intended; Shaddoll and
  Spellbook have no cards yet, art comes later

### Settled — D · split builds (item 4) — closed, not implemented

- Measured: `astro build` 1.5 s for 152 pages; full content build minus image writes 0.66 s
- After the cache there is no shared rebuild cost left to split. No split, no `--scope` flag

### Settled — E · docs navigation (item 5)

- Groups derive from the `docs/` folder tree in natural filename order.
  `content/reading-order.json`'s docs section is deleted
- Group label: strip the `NN_` prefix, underscores → spaces, Title Case
- URLs keep the numbers: `docs/01_general_rules/01_ZONES.md` → `/docs/01-general-rules/01-zones/`
- Root-level `.md` files render as ungrouped links at the top of the rail, alphabetical,
  under no heading. The alphabetically first root doc also serves the `/docs/` route
  (its own URL is `/docs/`, not its slug)
- Groups are collapsible; the current page's group is open, others collapsed; per-group
  state persists in localStorage
- **Aron performs the file moves and numbering.** The plan's first ticket is the exact
  target tree for him to execute; the code ticket lands after

### Settled — F · blog (item 6)

- Rail: flat list, newest first, no group heading. Title takes the full rail width, the
  date sits beneath it as `DD/MM/YYYY`. `reading-order.json`'s blog section is deleted
- `/blog/` renders the latest post inline; `/blog/{slug}/` stays canonical

### Settled — G · rail switch (item 7)

- The Docs/Blog switch is removed from the desktop rail **and** the mobile drawer. The
  header utility nav (Learn / Blog / Decks) is the only switcher

### Assumptions

- Dim + blur are applied via a pseudo-element on `<main>` with a hashed `<style>` block in
  `BaseLayout.astro`, matching the existing CSP pattern — inline `style` attributes are
  forbidden by `harden-csp.mjs`
- `DD/MM/YYYY` applies to the **blog rail**; date rendering elsewhere (post header, card
  pages, updates) is unchanged
- Rail entry titles keep coming from each doc's own `#` heading
- The existing cap of 12 tiles per related block is retained
- Moving docs changes their URLs once; the code ticket updates internal links and tests in
  the same commit

### Residual risks

- **CI has no warm cache.** At `effort: 2` a cold build is roughly 1.4 s × card count, so CI
  stays near a minute at 50 cards and grows linearly. Parallelising the cold path or
  persisting the cache between CI runs is deliberately out of scope here
- The new reference relation ships with zero live edges, so only fixture tests can prove it

### Out of scope

- Generating background art for Shaddoll, Spellbook or non-archetype
- Parallelising image encoding across cores
- Redesigning the archetype hero panel or the card page layout
- Any change to card data, MSE projects, or the Python pipeline beyond `rebuild_open_packages.py` timing

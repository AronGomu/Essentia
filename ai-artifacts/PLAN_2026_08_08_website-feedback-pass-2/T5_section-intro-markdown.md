# T5: Section intro markdown

**Plan:** `./ai-artifacts/PLAN_2026_08_08_website-feedback-pass-2.md`
**Depends:** T1
**Commit outcome:** Every section hero intro is authored markdown in `website/content/section-intros/{slug}.md` and the Non-archetype, Nekroz and Burning Abyss pages show the new copy.

## Context (self-contained)

- Goal: website feedback pass 2. This ticket delivers three copy replacements:
  - `/sections/non-archetype/non-archetype/` — "Create original Yu-Gi-Oh!-inspired
    cards playable under Magic: The Gathering rules. Adapt role, pace, and gameplay
    identity rather than translating literally." ⇒ "All cards not part of any
    defined archetype. Collection of classic Yu-Gi-Oh! Staples".
  - `/archetypes/nekroz/` — "Nekroz is blue Ritual / Toolbox / Anti-Extra Deck." ⇒
    a three-paragraph description with a bullet list.
  - `/archetypes/burning-abyss/` — "Burning Abyss is black Aristocrats / Graveyard /
    Value." ⇒ a four-sentence description.
- This slice: replaces `introFromDoc()` (which scrapes the first paragraph of a
  design doc and cannot carry a bullet list) with an authored markdown file per
  section, rendered on the hero.
- Out of scope here: keyword rulings, MSE card data, hero art CSS (T6), the nav, the
  docs/blog rails, the home page tiles (they never used `intro`).
- Assumptions in force: `graphify` is not installed — do not run it. Intro prose
  lives in `website/content/section-intros/{slug}.md`, mirroring the existing
  `website/content/explanations/` pattern, because a file under `docs/` would be
  auto-published as a doc page by the docs corpus loader. The Nekroz copy drops the
  user's truncated fragment "Every Ritual creature ." and applies minimal grammar
  fixes; everything else is the user's wording.

## Requirements

- New directory `website/content/section-intros/` with exactly one `{slug}.md` per
  entry in `website/content/sections.json`: `non-archetype.md`, `burning-abyss.md`,
  `shaddoll.md`, `nekroz.md`, `spellbook.md`.
- A missing file, an extra file, or a file for an unknown slug fails the build.
- `catalog.sections[]` gains `introMarkdown: string` (the file body, verbatim) and
  keeps `intro: string` — now derived from the body's **first paragraph**, markdown
  stripped, truncated at a word boundary to 360 characters. `intro` still feeds
  `<meta name="description">` and the page `description` prop.
- The archetype and non-archetype pages render `introMarkdown` through the existing
  `Markdown.astro` component inside `<div class="catalog-hero-intro">`, replacing the
  current `<p>{section.intro}</p>`.
- `introFromDoc()` is deleted from `website/scripts/content/orchestrator.mjs`.
  `section.doc` stays in `sections.json` and is still validated by
  `website/scripts/content/identity.mjs`.
- `CATALOG_SCHEMA_VERSION` is bumped by one (to `9` if T3 already took it to `8`;
  otherwise to `8` — read the current constant and add one).

## Inputs

- `website/content/sections.json` — 5 sections, keys `group`, `slug`, `label`,
  `kind`, `order`, `accent`, `doc`, `iconicId`, `namePattern?`, `heroImage`.
- `website/scripts/content/orchestrator.mjs`:
  - `async function introFromDoc(relative, label)` at lines 33–47 — to delete.
  - the section loop at lines 132–161 sets `intro: await introFromDoc(section.doc, section.label)`.
  - `loadExplanations(knownIds)` at lines 49–76 is the pattern to copy for reading a
    directory of authored markdown safely (symlink check, `.md` check, 262 144-byte
    cap, markup/URL rejection).
  - `export const CATALOG_SCHEMA_VERSION` at line 31.
- `website/src/lib/text.ts` — `truncateAtWordBoundary(text, limit)`.
- `website/src/lib/docs.ts` — `docDescription(body)` is the existing
  markdown-to-plain-text flattener; reuse its approach, do not re-implement a naive
  `replace`.
- `website/src/components/Markdown.astro` — `<Markdown value={md} class="…" />`,
  renders through `renderSafeMarkdown(value, BASE_URL)`.
- `website/src/pages/archetypes/[slug].astro` lines 39–41:
  `<h1>{section.label}</h1><p>\n  {section.intro}\n</p><div class="catalog-stats">`.
- `website/src/pages/sections/non-archetype/[slug].astro` line 41:
  `</h1><p>{section.intro}</p><div class="catalog-stats">`.
- `website/src/lib/catalog.ts` — `CatalogSection` interface (add `introMarkdown`).
- **From Depends (T1):** baseline green.

## TDD

1. **Red** — add `website/tests/unit/section-intro.test.ts` with the rows below; it
   fails (loader and files do not exist).
2. **Green** — write the loader, the five markdown files, the catalog field and the
   page markup.
3. **Refactor** — delete `introFromDoc()`; keep green.

## Test plan

Run with `cd website && npm run test`.

| Test | Input | Expect |
| ---- | ----- | ------ |
| `loads one intro per section` | `await loadSectionIntros(new Set(['non-archetype','burning-abyss','shaddoll','nekroz','spellbook']))` | `Map` of size 5 |
| `fails on a missing intro` | slug set including `'ghost'` | rejects `/section ghost: missing intro file/` |
| `fails on an unknown intro file` | temp dir containing `ghost.md` | rejects `/unknown section intro ghost/` |
| `rejects raw HTML` | body `a <b>bold</b> intro` | rejects `/unsafe section intro/` |
| `derives the plain intro from the first paragraph` | `sectionIntroSummary('First para.\n\n- bullet\n\nSecond para.')` | `'First para.'` |
| `caps the plain intro at 360 characters` | 500-character first paragraph | length ≤ 360, ends on a word boundary |
| `non-archetype copy` (`catalog.test.ts`) | `sectionsBySlug.get('non-archetype')!.intro` | `'All cards not part of any defined archetype. Collection of classic Yu-Gi-Oh! Staples'` |
| `nekroz copy` (`archetype.test.ts`) | `sectionsBySlug.get('nekroz')!.introMarkdown` | contains `'Nekroz is a Blue archetype built on Ritual creatures and Ritual Summon.'` and `'- Ritual creatures'` |
| `burning abyss copy` (`archetype.test.ts`) | `sectionsBySlug.get('burning-abyss')!.introMarkdown` | contains `'Burning Abyss is a black aristocrats-based archetype.'` |
| `hero renders markdown` (`archetype.test.ts`) | source of `src/pages/archetypes/[slug].astro` | contains `class="catalog-hero-intro"` and `section.introMarkdown`, and no `{section.intro}` |

## Impl steps

- [x] 1. Create `website/scripts/content/section-intros.mjs` exporting
      `SECTION_INTROS_DIR` (`path.join(CONTENT, 'section-intros')`),
      `sectionIntroSummary(body)` and `loadSectionIntros(knownSlugs)`.
- [x] 2. `sectionIntroSummary(body)`: take `body.split(/\n\s*\n/)[0]`, strip
      markdown the same way `docDescription()` does (fenced code, comments, images,
      links, headings, blockquote markers, list markers, table pipes, backticks,
      emphasis), collapse whitespace, trim, then truncate at a word boundary to
      **360** characters. Import `truncateAtWordBoundary` from `../../src/lib/text.ts`
      (the docs loader already imports from `src/lib` this way).
- [x] 3. `loadSectionIntros(knownSlugs)`: `readdir(SECTION_INTROS_DIR, { withFileTypes: true })`,
      skip `.gitkeep`; for each entry `lstat` → symlink, non-file, non-`.md`, or
      `size > 262_144` → `fail(\`unsafe section intro ${entry.name}\`)`; slug =
      filename without `.md`; slug not in `knownSlugs` →
      `fail(\`unknown section intro ${slug}\`)`; body containing
      `/<\/?[A-Za-z][^>]*>|\{[^\n]*\}|!\[[^\]]*\]\([^)]*\)/` →
      `fail(\`unsafe section intro ${entry.name}\`)`; every markdown link target must
      match `/^(https:\/\/|mailto:|#|\/)/` or `fail(\`unsafe section intro URL ${entry.name}\`)`.
      After the loop, every slug in `knownSlugs` missing from the map →
      `fail(\`section ${slug}: missing intro file website/content/section-intros/${slug}.md\`)`.
      Return `Map<slug, body.trim()>`.
- [x] 4. In `website/scripts/content/orchestrator.mjs`: import `loadSectionIntros`
      and `sectionIntroSummary`; call
      ```js
      const sectionIntros = await loadSectionIntros(
        new Set([...registry.sections.values()].map((section) => section.slug)),
      );
      ```
      next to the other loaders (after `loadKeywordRegistry()`).
- [x] 5. In the section loop, replace
      `intro: await introFromDoc(section.doc, section.label),` with
      ```js
      introMarkdown: sectionIntros.get(section.slug),
      intro: sectionIntroSummary(sectionIntros.get(section.slug)),
      ```
- [x] 6. Delete `async function introFromDoc(...)` (lines 33–47) and its now-unused
      `readFile` import if nothing else in the file uses it (`loadExplanations` does —
      keep it).
- [x] 7. Bump `CATALOG_SCHEMA_VERSION` by one.
- [x] 8. In `website/src/lib/catalog.ts`, add to `CatalogSection`:
      `/** Authored hero prose, markdown, from website/content/section-intros/{slug}.md. */ introMarkdown: string;`
- [x] 9. Write `website/content/section-intros/non-archetype.md`:
      ```markdown
      All cards not part of any defined archetype. Collection of classic Yu-Gi-Oh! Staples
      ```
- [x] 10. Write `website/content/section-intros/nekroz.md`:
      ```markdown
      Nekroz is a Blue archetype built on Ritual creatures and Ritual Summon. Nekroz concentrates an extreme amount of Search effects, making it extremely consistent in games. You have 3 categories of cards:

      - Ritual creatures, each of which can be discarded for an effect and has an on-field effect.
      - Non-Ritual creatures aimed to be tributed for value. They all have an On Sacrifice effect triggered by Ritual sacrifices.
      - Non-creature Ritual Summon spells that let you perform the Ritual Summon.

      This archetype is aimed at midrange grindy games, using the power of Trishula to exile the opponent's resources and Valkyrus to prevent lethal damage.
      ```
- [x] 11. Write `website/content/section-intros/burning-abyss.md`:
      ```markdown
      Burning Abyss is a black aristocrats-based archetype. Send Burning Abyss creatures to the Grave by any means and get rewarded with free effects. Once per turn, you can play 1 Burning Abyss creature from your hand for free. Quickly swarm your opponent with cheap and dispensable creatures.
      ```
- [x] 12. Write `website/content/section-intros/shaddoll.md`:
      ```markdown
      Shaddoll is a black Control / Value / Fusion archetype. It plays face-down creatures, flips them for value, harvests effects from cards sent to the Grave, and converts that material into Fusion Summons.
      ```
- [x] 13. Write `website/content/section-intros/spellbook.md`:
      ```markdown
      Spellbook is an Aether Wizard and spell-chain archetype. It accumulates named Spellbook resources, converts casts into incremental advantage, and rewards sequencing several spells in one turn.
      ```
- [x] 14. In `website/src/pages/archetypes/[slug].astro`, import `Markdown` from
      `../../components/Markdown.astro` and replace the `<p>{section.intro}</p>`
      block with
      `<Markdown value={section.introMarkdown} class="catalog-hero-intro" />`.
- [x] 15. Do the same in `website/src/pages/sections/non-archetype/[slug].astro`
      (import path `../../../components/Markdown.astro`).
- [x] 16. In `website/src/styles/global.css`, immediately after the `.catalog-hero p`
      rule, add:
      ```css
      .catalog-hero-intro {
        max-width: 65ch;
        color: var(--silver-ink);
      }
      .catalog-hero-intro > :first-child {
        margin-top: 0;
      }
      .catalog-hero-intro ul {
        margin: 0.6rem 0;
        padding-left: 1.15rem;
      }
      ```
- [x] 17. Add `website/tests/unit/section-intro.test.ts` with every loader row from
      the test plan, and the copy rows to `website/tests/unit/catalog.test.ts` /
      `website/tests/unit/archetype.test.ts`.
- [x] 18. `cd website && npm run content` → exit 0.
- [x] 19. `cd website && npm run test` → exit 0.
- [x] 20. `cd website && npm run build` → exit 0.

## Outputs

- Files touched: new `website/content/section-intros/{5}.md`,
  new `website/scripts/content/section-intros.mjs`,
  new `website/tests/unit/section-intro.test.ts`;
  edited `website/scripts/content/orchestrator.mjs`, `website/src/lib/catalog.ts`,
  `website/src/pages/archetypes/[slug].astro`,
  `website/src/pages/sections/non-archetype/[slug].astro`,
  `website/src/styles/global.css`, `website/tests/unit/catalog.test.ts`,
  `website/tests/unit/archetype.test.ts`, `website/src/generated/catalog.ts`.
- Public API / behaviour change: `catalog.sections[].introMarkdown` added;
  `intro` now derives from the authored file, not from the design doc.
- Migrate / config: authors edit `website/content/section-intros/{slug}.md`.

## Validation

- [x] tests pass: `cd website && npm run test`; `cd website && npm run ci`
- [x] manual check: `/sections/non-archetype/non-archetype/` shows the staples copy
- [x] manual check: `/archetypes/nekroz/` shows the three paragraphs and the bullet list
- [x] manual check: `/archetypes/burning-abyss/` shows the aristocrats copy
- [x] app functional — `cd website && npm run build` exits 0
- [x] commit msg draft: `feat(website): author section hero intros as markdown`

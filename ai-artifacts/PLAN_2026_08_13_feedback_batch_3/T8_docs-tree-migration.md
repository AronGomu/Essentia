# T8: Docs tree migration (Aron executes)

**Plan:** `./ai-artifacts/PLAN_2026_08_13_feedback_batch_3.md`
**Depends:** T5
**Commit outcome:** `docs/` is numbered and foldered, so the website's documentation
navigation reads in the intended order: presentation first, then general rules and project
documentation, then one section per archetype.

## Context (self-contained)

- Goal: docs navigation order is now controlled entirely by filenames on disk. Nothing in
  the codebase decides ordering any more, so this ticket is a file-move exercise, performed
  by the repository owner rather than by an agent.
- This slice: rename and move the 38 published docs into numbered folders.
- Out of scope here: editing doc **content**, touching `docs/ADR/**` (excluded from the
  site), touching `docs/keywords/<slug>.md` ruling files (registry data, also excluded),
  changing any code.
- Assumption in force: T5 already shipped, so the build derives groups from whatever tree
  exists and cannot fail because a doc is "unlisted". This migration can therefore be done
  in one commit, or spread over several, without ever breaking `main`.

**From Depends (T5) — the rules this migration is written against:**

- Group key = first path segment under `docs/`; root-level `.md` files are ungrouped.
- Group label = directory name with a leading `NN_` stripped, `_` and `-` replaced by
  spaces, Title Case. `01_general_rules` → `General Rules`; `02_burning_abyss` → `Burning Abyss`.
- Order = root docs first by filename, then directories by raw name, then files by raw name
  inside each directory. Numeric prefixes are what sort.
- Route keeps the numbers: `docs/01_general_rules/01_ZONES.md` → `/docs/01-general-rules/01-zones/`.
- The alphabetically first root-level doc also serves `/docs/`. T5 renamed
  `docs/PRESENTATION.md` → `docs/00_PRESENTATION.md` for exactly this reason.
- Excluded from the site and from this migration: `docs/ADR/**`, and every
  `docs/keywords/<lower-case-slug>.md` per-keyword ruling file.

## Requirements

- Every published doc ends up either at the root of `docs/` or inside one numbered folder.
- `docs/00_PRESENTATION.md` stays at the root and stays first.
- General rules and project documentation come before the archetype sections.
- Each archetype gets its own folder, in the same order as
  `website/content/sections.json` (`burning_abyss`, `shaddoll`, `nekroz`, `spellbook`).
- Every relative link between docs still resolves — `rewriteDocLinks` fails the build on a
  broken `.md` target, so a missed link is caught by `npm run content`.

## Inputs

- Current tree, published docs only (38 files):
  - root: `00_PRESENTATION.md` (renamed by T5), `CONTEXT.md`, `DESIGN.md`, `GLOSSARY.md`,
    `KEYWORDS.md`, `MSE.md`, `RELEASES.md`, `RULES.md`, `SET_PROMOTIONS.md`
  - `docs/design/`: `BALANCE.md`, `CONVERSION.md`, `FRAMES.md`
  - `docs/rules/`: `CARD_TYPES.md`, `DECK_BUILDING.md`, `DECKLISTS_ALPHA_0.1.md`,
    `SUMMONING.md`, `TEMPLATING.md`, `ZONES.md`
  - `docs/keywords/`: `ABILITIES.md`, `ACTIONS.md`, `COSTS_AND_PROCEDURES.md`, `EVENTS.md`
    (the lower-case per-keyword files stay where they are and are never published)
  - `docs/01_burning_abyss/`, `docs/02_shaddoll/`, `docs/03_nekroz/`, `docs/04_spellbook/`:
    `CONTEXT.md`, `DESIGN.md`, `KEYWORDS.md`, `RULES.md` each
- `website/content/sections.json` — archetype order and labels.
- `docs/keywords/<slug>.md` registry files — must remain resolvable from
  `website/scripts/content/keywords.mjs`, which reads them by path.

## Target tree

```
docs/
  00_PRESENTATION.md
  01_general_rules/
    01_RULES.md              (from docs/RULES.md)
    02_DECK_BUILDING.md      (from docs/rules/DECK_BUILDING.md)
    03_CARD_TYPES.md         (from docs/rules/CARD_TYPES.md)
    04_ZONES.md              (from docs/rules/ZONES.md)
    05_SUMMONING.md          (from docs/rules/SUMMONING.md)
    06_TEMPLATING.md         (from docs/rules/TEMPLATING.md)
    07_KEYWORDS.md           (from docs/KEYWORDS.md)
    08_ACTIONS.md            (from docs/keywords/ACTIONS.md)
    09_EVENTS.md             (from docs/keywords/EVENTS.md)
    10_ABILITIES.md          (from docs/keywords/ABILITIES.md)
    11_COSTS_AND_PROCEDURES.md (from docs/keywords/COSTS_AND_PROCEDURES.md)
    12_DECKLISTS_ALPHA_0.1.md  (from docs/rules/DECKLISTS_ALPHA_0.1.md)
  02_project/
    01_CONTEXT.md            (from docs/CONTEXT.md)
    02_DESIGN.md             (from docs/DESIGN.md)
    03_CONVERSION.md         (from docs/design/CONVERSION.md)
    04_BALANCE.md            (from docs/design/BALANCE.md)
    05_FRAMES.md             (from docs/design/FRAMES.md)
    06_GLOSSARY.md           (from docs/GLOSSARY.md)
    07_RELEASES.md           (from docs/RELEASES.md)
    08_SET_PROMOTIONS.md     (from docs/SET_PROMOTIONS.md)
    09_MSE.md                (from docs/MSE.md)
  03_burning_abyss/          (from docs/01_burning_abyss/)
    01_CONTEXT.md  02_DESIGN.md  03_RULES.md  04_KEYWORDS.md
  04_shaddoll/               (from docs/02_shaddoll/)
    01_CONTEXT.md  02_DESIGN.md  03_RULES.md  04_KEYWORDS.md
  05_nekroz/                 (from docs/03_nekroz/)
    01_CONTEXT.md  02_DESIGN.md  03_RULES.md  04_KEYWORDS.md
  06_spellbook/              (from docs/04_spellbook/)
    01_CONTEXT.md  02_DESIGN.md  03_RULES.md  04_KEYWORDS.md
  keywords/                  unchanged — per-keyword ruling files, never published
  ADR/                       unchanged — excluded from the site
```

Resulting rail: `Essentia` (ungrouped, first), then `General Rules`, `Project`,
`Burning Abyss`, `Shaddoll`, `Nekroz`, `Spellbook`.

## Check plan

| Check                                | Command                              | Expect                                              |
| ------------------------------------ | ------------------------------------ | ---------------------------------------------------- |
| Every doc is still discovered        | `cd website && npm run content`      | `content: … 38 docs …`, exit 0                       |
| No broken relative doc link          | same command                         | no `doc …: unpublished link target …` failure        |
| Routes build                         | `cd website && npm run build`        | exit 0, `check-404` and `check-links` pass           |
| Nothing links to an old path         | `cd website && npm run links:check`  | exit 0                                               |
| Repository cross-references          | `grep -rn "docs/rules/\|docs/design/\|docs/01_burning_abyss\|docs/02_shaddoll\|docs/03_nekroz\|docs/04_spellbook" --include=*.md --include=*.mjs --include=*.ts --include=*.py .` | no hit outside `ai-artifacts/` and `docs/ADR/` |

## Impl steps

- [ ] 1. `cd /home/aron/projects/essentia && git switch -c docs/tree-migration`
- [ ] 2. `mkdir -p docs/01_general_rules docs/02_project`
- [ ] 3. `git mv` each file listed in the target tree above, one command per file, keeping
      the mapping exactly as written.
- [ ] 4. `git mv docs/01_burning_abyss docs/03_burning_abyss` and likewise
      `02_shaddoll` → `04_shaddoll`, `03_nekroz` → `05_nekroz`, `04_spellbook` → `06_spellbook`.
      Do these in an order that never collides — rename to a temporary name first if needed.
- [ ] 5. Inside each archetype folder, `git mv CONTEXT.md 01_CONTEXT.md`, `DESIGN.md`
      → `02_DESIGN.md`, `RULES.md` → `03_RULES.md`, `KEYWORDS.md` → `04_KEYWORDS.md`.
- [ ] 6. `rmdir docs/design docs/rules` — they must now be empty.
- [ ] 7. `cd website && npm run content` and fix every reported broken link by editing the
      link target only, never the surrounding prose.
- [ ] 8. Repeat step 7 until `npm run content` exits 0.
- [ ] 9. Run the repository cross-reference grep from the check plan and update the paths it
      finds in `AGENTS.md`, `README.md`, `docs/CONTEXT.md`'s successor and any script.
- [ ] 10. `cd website && npm run ci`.

## Outputs

- Touched: the `docs/` tree layout, plus any file that cited a moved path.
- Route change: every docs URL gains its numeric prefixes. This is a one-time break of
  external links to `/docs/rules/zones/` and friends; it is accepted, since the site is
  not yet publicly announced.

## Validation

- [ ] `cd website && npm run content` — `content: … 38 docs …`, exit 0
- [ ] `cd website && npm run build` — exit 0
- [ ] `cd website && npm run links:check` — exit 0
- [ ] `cd website && npm run ci` — green
- [ ] manual check: the rail reads `Essentia`, `General Rules`, `Project`, `Burning Abyss`,
      `Shaddoll`, `Nekroz`, `Spellbook`, in that order, with the current page's group open
- [ ] manual check: `/docs/` still serves the Essentia presentation page
- [ ] commit msg draft: `docs: number and group the documentation tree`

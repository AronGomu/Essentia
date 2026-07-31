# Project Restructuring Plan

## Status

Implemented 2026-07-31. Legacy paths below document migration inputs, not current locations. First set: **Legend of Alpha**. First planned version: **0.1**.

Card/deck selection was deferred during restructuring. Burning Abyss and Nekroz selections are now defined in `docs/rules/DECKLISTS_ALPHA_0.1.md` and assembled in Pre-ALPHA.

## Goals

- Make existing MSE files sole card-content source of truth.
- Move every current English MSE project into explicit draft storage.
- Introduce mutable staging plus immutable ALPHA/BETA/Release history.
- Publish website content from immutable stages only.
- Replace duplicated docs with focused, linked modules.
- Preserve old card versions through immutable MSE packages.
- Keep canonical renders available to website CI.
- Isolate launcher code.
- Remove obsolete French archive, aggregate, print, planning content.

## Source-of-truth rules

- Card name, rules text, cost, type, rarity, stats, art refs, frame: MSE only.
- Current Nekroz source: existing `12_YGO_Necroz.mse-set`.
- `website/content/snapshots/nekroz/001-2026-07-17.json` is not card source.
- Docs must not duplicate card-by-card values.
- Website must never write MSE source.
- Stable card IDs, release dates, deck membership, content-post URLs may live in metadata.
- Metadata must not duplicate card fields.
- Aggregate MSE projects exist only in ALPHA/BETA/Release packages.
- Aggregate MSE projects are generated, read-only, never independently edited.

## Lifecycle

| Directory | Meaning | Mutable | Website |
| --- | --- | ---: | ---: |
| `00_drafts` | Ideas, current projects, future drafts | Yes | Ignore |
| `01_pre_alpha` | ALPHA candidate assembly | Yes | Ignore |
| `02_alpha` | Printed first-test sets | No | Publish/history |
| `03_pre_beta` | BETA candidate assembly | Yes | Ignore |
| `04_beta` | Printed second-test sets | No | Publish/history |
| `05_pre_release` | Final release candidate assembly | Yes | Ignore |
| `06_released` | Official releases | No | Publish/history |

### Promotion rules

- Draft → Pre-ALPHA: move/copy selected working projects.
- Pre-ALPHA → ALPHA: validate package, generate aggregate/renders/PDF, commit immutable package, empty source staging.
- ALPHA → Pre-BETA: copy immutable ALPHA package. Never move/edit ALPHA.
- Pre-BETA → BETA: validate package, generate aggregate/renders/PDF, commit immutable package, empty source staging.
- BETA → Pre-Release: copy immutable BETA package. Never move/edit BETA.
- Pre-Release → Release: validate package, generate aggregate/renders/PDF, commit immutable package, empty source staging.
- Post-release correction: duplicate released source into mutable staging, edit, promote as new version.
- Latest version selection must use lifecycle/version metadata, never filesystem mtime/glob order.

### Immutable-stage enforcement

Paths under `02_alpha`, `04_beta`, `06_released` become immutable after commit.

CI merge-base guard must reject:

- source modification;
- deletion;
- rename;
- render replacement;
- PDF replacement;
- provenance replacement;
- aggregate replacement.

New child versions remain allowed.

## MSE painter markers

Requested painter-name slot maps to `set_info.artist`.

| Stage | Required value |
| --- | --- |
| Draft | `DRAFT` |
| Pre-ALPHA | `{set_name} Pre-ALPHA` |
| ALPHA | `{set_name} ALPHA` |
| Pre-BETA | `{set_name} Pre-BETA` |
| BETA | `{set_name} BETA` |
| Pre-Release | `{set_name} Pre-Release` |
| Released | `{set_name} Release` |

Legend of Alpha ALPHA example:

```text
set_info:
    artist: Legend of Alpha ALPHA
```

## Target card tree

```text
cards_mse/
  00_drafts/
    03_non_archetype_creatures/
      03_YGO_Non_Archetype_Creatures.mse-set/
    05_fusion_staples/
      05_YGO_Staples_Fusion.mse-set/
    06_synchro_staples/
      06_YGO_Staples_Synchro.mse-set/
    07_xyz_staples/
      07_YGO_Staples_Xyz.mse-set/
    08_link_staples/
      08_YGO_Staples_Link.mse-set/
    09_non_archetype_non_creatures/
      09_YGO_Non_Archetype_Non_Creatures.mse-set/
    10_burning_abyss/
      10_YGO_Burning_Abyss.mse-set/
    11_shaddoll/
      11_YGO_Shaddoll.mse-set/
    12_nekroz/
      12_YGO_Necroz.mse-set/
    13_spellbook/
      13_YGO_Spellbook.mse-set/

  01_pre_alpha/
    {XX}_{group}/
      [...mse projects...]

  02_alpha/
    {set_name}_{X.X}/
      [...component mse projects...]
      {set_name}_{X.X}_all_cards.mse-set/
      renders/
      {set_name}_{X.X}_print.pdf

  03_pre_beta/
    {XX}_{group}/
      [...mse projects...]

  04_beta/
    {set_name}_{X.X}/
      [...component mse projects...]
      {set_name}_{X.X}_all_cards.mse-set/
      renders/
      {set_name}_{X.X}_print.pdf

  05_pre_release/
    {XX}_{group}/
      [...mse projects...]

  06_released/
    {set_name}_{X.X}/
      [...component mse projects...]
      {set_name}_{X.X}_all_cards.mse-set/
      renders/
      {set_name}_{X.X}_print.pdf
```

Legend of Alpha 0.1 example:

```text
cards_mse/02_alpha/Legend_of_Alpha_0.1/
```

### Generated release artifacts

- `renders/` sits beside aggregate MSE project.
- `{set_name}_{X.X}_print.pdf` sits directly beside aggregate MSE project.
- No `print/` directory.
- Renders remain tracked. Website CI cannot run MSE.
- PDF remains tracked as immutable package artifact.
- Renders/PDF/provenance belong to immutable package hash/guard.
- No `.gitignore` rule for immutable renders.

## Existing project moves

```text
MSE_projects/03_YGO_Non_Archetype_Creatures.mse-set
→ cards_mse/00_drafts/03_non_archetype_creatures/03_YGO_Non_Archetype_Creatures.mse-set

MSE_projects/05_YGO_Staples_Fusion.mse-set
→ cards_mse/00_drafts/05_fusion_staples/05_YGO_Staples_Fusion.mse-set

MSE_projects/06_YGO_Staples_Synchro.mse-set
→ cards_mse/00_drafts/06_synchro_staples/06_YGO_Staples_Synchro.mse-set

MSE_projects/07_YGO_Staples_Xyz.mse-set
→ cards_mse/00_drafts/07_xyz_staples/07_YGO_Staples_Xyz.mse-set

MSE_projects/08_YGO_Staples_Link.mse-set
→ cards_mse/00_drafts/08_link_staples/08_YGO_Staples_Link.mse-set

MSE_projects/09_YGO_Non_Archetype_Non_Creatures.mse-set
→ cards_mse/00_drafts/09_non_archetype_non_creatures/09_YGO_Non_Archetype_Non_Creatures.mse-set

MSE_projects/10_YGO_Burning_Abyss.mse-set
→ cards_mse/00_drafts/10_burning_abyss/10_YGO_Burning_Abyss.mse-set

MSE_projects/11_YGO_Shaddoll.mse-set
→ cards_mse/00_drafts/11_shaddoll/11_YGO_Shaddoll.mse-set

MSE_projects/12_YGO_Necroz.mse-set
→ cards_mse/00_drafts/12_nekroz/12_YGO_Necroz.mse-set

MSE_projects/13_YGO_Spellbook.mse-set
→ cards_mse/00_drafts/13_spellbook/13_YGO_Spellbook.mse-set

MSE_projects/ensure_original_images.py
→ .script/ensure_original_images.py
```

Every moved English project receives `set_info.artist: DRAFT`.

## Target docs tree

```text
docs/
  CONTEXT.md
  DESIGN.md
  RULES.md
  KEYWORDS.md
  RELEASES.md
  MSE.md

  design/
    CONVERSION.md
    BALANCE.md
    FRAMES.md

  rules/
    DECK_BUILDING.md
    ZONES.md
    CARD_TYPES.md
    SUMMONING.md
    TEMPLATING.md

  keywords/
    ACTIONS.md
    EVENTS.md
    ABILITIES.md
    COSTS_AND_PROCEDURES.md

  ADR/
    README.md
    accepted/
    proposed/

  10_burning_abyss/
    CONTEXT.md
    DESIGN.md
    RULES.md
    KEYWORDS.md

  11_shaddoll/
    CONTEXT.md
    DESIGN.md
    RULES.md
    KEYWORDS.md

  12_nekroz/
    CONTEXT.md
    DESIGN.md
    RULES.md
    KEYWORDS.md

  13_spellbook/
    CONTEXT.md
    DESIGN.md
    RULES.md
    KEYWORDS.md
```

### Global doc ownership

- `CONTEXT.md`: nav, folder ownership, source-of-truth map.
- `DESIGN.md`: design index, big-picture cube principles.
- `RULES.md`: rules index, core invariants.
- `KEYWORDS.md`: keyword taxonomy/index.
- `RELEASES.md`: lifecycle, promotion, immutability.
- `MSE.md`: authoring, painter markers, aggregate generation, renders.
- `design/CONVERSION.md`: Yu-Gi-Oh! → Magic level/stat/color conversion.
- `design/BALANCE.md`: power level, interaction, design constraints.
- `design/FRAMES.md`: validated MSE frame decisions.
- `rules/DECK_BUILDING.md`: rarity limits, deck/sideboard rules, mulligan.
- `rules/ZONES.md`: Hand/Field/Deck/Grave/Exile/Sideboard/Stack.
- `rules/CARD_TYPES.md`: Trap, face-down, Extra Deck types.
- `rules/SUMMONING.md`: Ritual/Fusion/Synchro/Xyz/Link/proper summon.
- `rules/TEMPLATING.md`: PSCT, costs, targeting, prefixes, formatting.
- `keywords/ACTIONS.md`: action keywords.
- `keywords/EVENTS.md`: event keywords.
- `keywords/ABILITIES.md`: ability keywords.
- `keywords/COSTS_AND_PROCEDURES.md`: cost/procedure keywords.

### Archetype doc ownership

- `CONTEXT.md`: local nav, scope, owning MSE projects.
- `DESIGN.md`: identity, colors, play patterns, design constraints.
- `RULES.md`: archetype-specific rules/exceptions.
- `KEYWORDS.md`: archetype-specific keyword dictionary.

Future file:

```text
{archetype}/CHANGELOG.md
```

Create only after real released archetype changes exist. Do not create empty CHANGELOG files during restructure.

Non-archetype groups remain storage/type buckets. Shared Fusion/Synchro/Xyz/Link/Ritual/Trap rules remain global.

### Existing docs migration

```text
docs/index.md + docs/context.md
→ docs/CONTEXT.md

docs/01_cube_overview.md + design sections from docs/02_rules_keywords_card_design.md
→ docs/DESIGN.md + docs/design/{CONVERSION,BALANCE,FRAMES}.md

rule sections from docs/context.md + docs/02_rules_keywords_card_design.md
→ docs/RULES.md + docs/rules/{DECK_BUILDING,ZONES,CARD_TYPES,SUMMONING,TEMPLATING}.md

keyword defs from docs/context.md + docs/02_rules_keywords_card_design.md
→ docs/KEYWORDS.md + docs/keywords/{ACTIONS,EVENTS,ABILITIES,COSTS_AND_PROCEDURES}.md

release/MSE workflow sections
→ docs/RELEASES.md + docs/MSE.md

docs/10_archetype_burning_abyss.md
→ docs/10_burning_abyss/{CONTEXT,DESIGN,RULES,KEYWORDS}.md

docs/11_archetype_shaddoll.md
→ docs/11_shaddoll/{CONTEXT,DESIGN,RULES,KEYWORDS}.md

docs/12_archetype_necroz.md
→ docs/12_nekroz/{CONTEXT,DESIGN,RULES,KEYWORDS}.md

docs/13_archetype_spellbook.md
→ docs/13_spellbook/{CONTEXT,DESIGN,RULES,KEYWORDS}.md

docs/frame_candidates.md
→ docs/ADR/accepted/<id>-mse-frame-mapping.md

docs/_keyword_inventory_report.md
→ accepted definitions in KEYWORDS modules; required evidence under ADR

rule_reviews/*.md
→ docs/ADR/accepted/ or docs/ADR/proposed/ based on status
```

Applied reviews become accepted ADRs. Unresolved Nekroz review remains proposed. No invented decisions.

## Launcher target

```text
launcher/
  __init__.py
  mse_config.py
  setup_mse.py
  mse_project_menu.pyw
  .env                  # ignored runtime config
  .mse_launcher.log     # ignored runtime log
```

Moves:

```text
mse_config.py → launcher/mse_config.py
setup_mse.py → launcher/setup_mse.py
mse_project_menu.pyw → launcher/mse_project_menu.pyw
.env → launcher/.env
.mse_launcher.log → launcher/.mse_launcher.log
```

Requirements:

- Imports use `launcher.mse_config`.
- Setup default points to repo `cards_mse/`.
- Launcher recursively discovers `.mse-set` projects.
- UI groups projects by lifecycle/group/set.
- Released state remains visible.
- Launcher keeps existing diagnostics.

## Website content rules

- Website folder location remains unchanged.
- Root `DESIGN.md` moves to `website/DESIGN.md`.
- Root `PRODUCT.md` moves to `website/PRODUCT.md`.
- Mutable stages `00`, `01`, `03`, `05` are ignored fail-closed.
- Immutable stages `02`, `04`, `06` publish/history.
- Current card = latest lifecycle/version by stable identity.
- Search/feed/sitemap/assets use same public graph.
- Tracked package renders provide website image input.
- Missing/stale render or provenance blocks build.
- Draft-only repo publishes zero card routes plus clear empty state.
- Legacy Nekroz snapshot cannot override MSE.
- Legacy Nekroz snapshot route/data/assets are removed.

## Deletions

```text
mse/
print/
MSE_projects/French/
docs/French/
rule_reviews/French/
FRENCH_ARCHIVE_SHA256SUMS
website_implementation_plan.md
website_validation_report.md
```

Also remove related French archive tests, docs, skills, checksums, policy refs.

Current root proxy PDFs are drafts. Delete them. Future PDFs live directly inside immutable set packages.

## Unchanged locations

```text
original_cards/
original_images/
tests/       # location unchanged; contents updated
website/     # location unchanged
```

# Tickets

## STR-001 — Freeze filesystem/lifecycle contract

**Goal:** Record approved paths, stages, markers, lock rules.

**Work:**

- Document lifecycle dirs.
- Document confirmed website visibility.
- Document painter-marker values.
- Document generated aggregate contract.
- Document French archive deletion.
- Document `Legend of Alpha` naming.

**Acceptance:**

- One meaning per stage/path.
- Mutable/immutable boundary explicit.
- No card fields duplicated outside MSE.

## STR-002 — Preserve worktree; inventory refs

**Goal:** Safe atomic migration.

**Work:**

- Preserve current uncommitted creature-project/launcher edits.
- Inventory static imports, Python imports, string paths, docs links, CI routes, tests, skills, config refs, generated reports.
- Read full reference-sweep checklist before moves.
- Produce final `git mv` list.

**Acceptance:**

- Every moved/deleted path has reference list.
- No unrelated user work overwritten.

**Dependencies:** STR-001.

## DOC-003 — Rebuild modular global docs

**Goal:** Concise indexes plus focused modules.

**Work:**

- Create root indexes.
- Create `RELEASES.md`, `MSE.md`.
- Create design/rules/keyword modules.
- Deduplicate existing content.
- Link every doc from `docs/CONTEXT.md`.
- Keep card values out.

**Acceptance:**

- Every old English rule/design statement mapped once.
- Details have one owning module.
- No contradictory duplicate rules.
- Links pass.

**Dependencies:** STR-001.

## DOC-004 — Split archetype docs

**Goal:** Local context/design/rules/keywords.

**Work:**

- Create archetype dirs 10–13.
- Add local `CONTEXT.md`.
- Split each old archetype doc.
- Link shared terms to global docs.
- Document future `CHANGELOG.md` policy without empty files.
- Update tests/skills refs.

**Acceptance:**

- Every current archetype has 4 current docs.
- Future CHANGELOG policy documented.
- No card values copied from MSE.

**Dependencies:** DOC-003.

## DOC-005 — Convert rule reviews to ADRs

**Goal:** Decisions live under `docs/ADR`.

**Work:**

- Add ADR template/index.
- Convert applied reviews to accepted ADRs.
- Convert unresolved Nekroz review to proposed ADR.
- Move frame decision into accepted ADR.
- Update rule workflows to create proposed ADRs.
- Remove `rule_reviews/` after complete migration.

**Acceptance:**

- Decision evidence retained.
- Accepted/proposed statuses truthful.
- `rule_reviews/` absent.

**Dependencies:** DOC-003.

## ORG-006 — Rename card root; move English projects to drafts

**Goal:** Current cards become explicit unpublished drafts.

**Work:**

- Rename project domain to `cards_mse/`.
- Move 10 English MSE projects into numbered draft groups.
- Set every project `set_info.artist: DRAFT`.
- Move `ensure_original_images.py` to `.script/`.
- Preserve card fields/content.

**Acceptance:**

- All 10 projects open in MSE.
- Nekroz content unchanged except marker/path refs.
- Every English project exists under `00_drafts`.
- Website publishes none.

**Dependencies:** STR-002.

## ORG-007 — Delete obsolete/archive content; move website context

**Goal:** Requested top-level cleanup.

**Work:**

- Delete `mse/`.
- Delete French archive/content/checksum/policies.
- Delete root `print/` PDFs.
- Move root website design/product docs into `website/`.
- Delete obsolete website plan/report.
- Remove empty roots.

**Acceptance:**

- Requested old paths absent.
- Website context refs updated.
- No active utility deleted accidentally.

**Dependencies:** STR-002.

## TOOL-008 — Move launcher into `launcher/`

**Goal:** Isolate launcher/config.

**Work:**

- Move tracked launcher files.
- Move ignored env/log defaults.
- Add importable package.
- Update commands/docs/tests.
- Add recursive MSE discovery.
- Group UI by lifecycle/group/set.

**Acceptance:**

- `python launcher/setup_mse.py` configures repo.
- `launcher/mse_project_menu.pyw` opens nested projects.
- Config points to `cards_mse`.
- Log writes under `launcher/`.

**Dependencies:** ORG-006.

## TOOL-009 — Update scripts/tests/skills for new paths

**Goal:** Remove stale root assumptions.

**Work:**

- Update `.script/*` discovery.
- Update Python test paths.
- Update card skills docs/ADR/SOT paths.
- Add explicit stage-aware read/write scope.
- Regenerate keyword inventory from intended source scope.

**Acceptance:**

- Python suite passes.
- Old-path grep clean outside historical ADR evidence.
- Ordinary scripts cannot edit immutable stages.

**Dependencies:** DOC-003–005, ORG-006, TOOL-008.

## LIFE-010 — Add stage/painter validator

**Goal:** Path state matches MSE-visible state.

**Work:**

- Validate stage marker.
- Validate set/version folder grammar.
- Validate component/aggregate projects.
- Reject misplaced projects/unknown stages.

**Acceptance:**

- Draft without `DRAFT` fails.
- ALPHA without `{set_name} ALPHA` fails.
- BETA without `{set_name} BETA` fails.
- Marker failure names exact path/project.

**Dependencies:** ORG-006, TOOL-009.

## LIFE-011 — Add promotion/immutability workflow

**Goal:** Safe staging plus locked history.

**Work:**

- Add explicit promotion command/workflow.
- Copy immutable predecessor into mutable next stage.
- Empty Pre-ALPHA/Pre-BETA/Pre-Release after successful promotion.
- Hash package before lock.
- Add CI merge-base guard for `02/04/06`.
- Reject mtime-based latest selection.

**Acceptance:**

- Child version promotion succeeds.
- Committed ALPHA/BETA/Release edit fails CI.
- Draft/pre-stage edit passes.
- Immutable predecessor remains present.

**Dependencies:** LIFE-010.

## BUILD-012 — Generate aggregate MSE project

**Goal:** One contextual MSE project without second manual SOT.

**Work:**

- Collect component manifests.
- Resolve stable identity explicitly.
- Generate `{set}_{version}_all_cards.mse-set`.
- Copy/import local images safely.
- Preserve exact card fields/render inputs.
- Validate aggregate union/hash equality.
- Reject direct aggregate drift.

**Acceptance:**

- Aggregate count/hash equals component union.
- Duplicate/conflicting card fails.
- Aggregate opens in MSE.
- Regeneration deterministic.

**Dependencies:** LIFE-010.

## BUILD-013 — Generate colocated renders/PDF

**Goal:** Website-ready renders plus one direct PDF.

**Work:**

- Export to `{set_dir}/renders/`.
- Generate `{set_dir}/{set}_{version}_print.pdf`.
- Generate auditable print manifest.
- Apply future decklist print rule: 3 copies/distinct card/deck; shared card across 2 decks gives 6; gameplay qty ignored.
- Track renders/PDF/provenance.
- Include outputs in immutable guard.

**Acceptance:**

- Render path correct.
- PDF path correct.
- No `print/` directory.
- PDF count matches manifest when decklists exist.
- Website CI reads tracked renders.

**Dependencies:** BUILD-012. Exact decklists deferred.

## WEB-014 — Cut website to immutable MSE stages

**Goal:** Mutable stages invisible; snapshots non-authoritative.

**Work:**

- Remove hard-coded 10-project registry.
- Remove Nekroz snapshot as source/history.
- Resolve `02_alpha`, `04_beta`, `06_released` only.
- Ignore `00_drafts`, `01_pre_alpha`, `03_pre_beta`, `05_pre_release`.
- Resolve latest card by stable identity/lifecycle/version.
- Use tracked renders.
- Add empty state before first ALPHA package.

**Acceptance:**

- Draft-only repo publishes zero cards.
- Current Nekroz draft remains hidden.
- Valid immutable package publishes only its cards.
- Snapshot cannot override MSE.
- Search/feed/sitemap/assets share one public graph.

**Dependencies:** LIFE-011, BUILD-012.

## WEB-015 — Release/deck/history/content foundations

**Goal:** Preserve public release/version model under new hierarchy.

**Work:**

- Add ALPHA/BETA/Release package pages.
- Add stable card version history model.
- Expose old exact MSE versions/renders.
- Use immutable package dates, not MSE edit timestamps, for release history.
- Prepare deck/content metadata contracts without creating Legend of Alpha decklists.

**Acceptance:**

- Immutable package history renders correctly.
- Current card defaults to latest version.
- Old versions remain reachable.
- Mutable-stage content remains absent.

**Dependencies:** WEB-014.

## CI-016 — Full verification/stale-path sweep

**Goal:** Prove migration complete.

**Checks:**

- Python tests.
- Website format/lint/type/unit/build/E2E.
- MSE source/style/render/provenance.
- Stage/painter markers.
- Immutable-stage guard.
- Docs links/ADR index.
- French archive absence.
- Old-path grep.
- `git diff --check`.

**Acceptance:**

- All gates pass.
- No runtime route expects legacy Nekroz snapshot.
- No root `MSE_projects`, `mse`, `print`, `rule_reviews`, old website plan/report.

**Dependencies:** All prior tickets.

# Delivery order

1. **Structure:** STR-001–ORG-007.
2. **Tooling/lifecycle:** TOOL-008–LIFE-011.
3. **Package/render/print:** BUILD-012–013.
4. **Website cutover/foundations:** WEB-014–015.
5. **Verification:** CI-016.

# Explicit non-goals

- Do not choose Legend of Alpha 0.1 cards yet.
- Do not create Burning Abyss/Nekroz decklists yet.
- Do not populate `01_pre_alpha` yet.
- Do not create first immutable ALPHA package yet.
- Do not decide mythic deck-copy limit yet.
- Do not create empty archetype CHANGELOG files.

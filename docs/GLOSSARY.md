# Glossary

[x] Activated
[x] Project scanned

Project terms. Prefer these words in docs, scripts, and review notes.

## Word index

One word, one part of the project. Say the word, the agent knows the file.

### Frontend — `website/`

| word      | short description                             | ref in code                                                     |
| --------- | --------------------------------------------- | --------------------------------------------------------------- |
| catalog   | generated card/set data the site reads        | `website/src/generated/catalog.ts`, `website/src/lib/catalog.ts` |
| shell     | base page frame wrapping every route          | `website/src/layouts/BaseLayout.astro`                           |
| gallery   | card grid with hover preview                  | `website/src/components/CardGallery.astro`, `CardPicture.astro`  |
| palette   | keyboard search overlay                       | `website/src/components/SearchPalette.svelte`, `src/lib/search.ts` |
| rail      | docs sidebar navigation                       | `website/src/components/DocsRail.astro`                          |
| picker    | deck building UI and its state                | `website/src/components/DeckManager.svelte`, `src/lib/deck-picker.ts` |
| seo       | title/meta/OG tags per route                  | `website/src/components/Seo.astro`                               |
| build     | content generation pipeline before astro      | `website/scripts/content/orchestrator.mjs`, `build-content.mjs`  |
| preflight | pre-build environment and input checks        | `website/scripts/check-preflight.mjs`                            |

### Backend — `.script/`, `launcher/`

| word      | short description                              | ref in code                             |
| --------- | ---------------------------------------------- | --------------------------------------- |
| lifecycle | stage/version/lock/advance CLI for packages    | `.script/release_package.py`            |
| linter    | MSE card style and templating checks           | `.script/lint_mse_card_style.py`        |
| renders   | PNG export of cards out of MSE                 | `.script/export_mse_renders.py`         |
| guard     | blocks edits to locked stage packages          | `.script/check_immutable_stages.py`     |
| print     | one-off PDF sheets, never tracked              | `.script/generate_print_pdfs.py`        |
| menu      | browse MSE projects by lifecycle/group/set     | `launcher/mse_project_menu.pyw`         |
| vendor    | MSE payload setup and sha256 verification      | `launcher/setup_mse.py`, `mse_vendor.py` |

### Other — card data and docs

| word      | short description                              | ref in code                                        |
| --------- | ---------------------------------------------- | -------------------------------------------------- |
| package   | one set folder at one stage                    | `cards_mse/01_alpha/LOTA-0001-Alpha_0.1/`          |
| aggregate | combined all-cards MSE set of a package        | `*_all_cards.mse-set`, `generate_aggregate()`      |
| hashes    | sha256 pin of package contents                 | `package-sha256.json`, `write_package_hashes()`    |
| marker    | stage/set stamp written inside MSE files       | `expected_marker()`, `write_marker()`              |
| identity  | archetype/card identity registry               | `load_identity_registry()`                         |
| adr       | architecture decision record                   | `docs/ADR/accepted/`, `docs/ADR/proposed/`         |
| plan      | ticketed implementation plan for a work pass   | `ai-artifacts/PLAN_<date>_<slug>/`                 |

## Active development

**Active development** is the full post-draft lifecycle for a card or set package:

`alpha` → `beta` → `release`

Draft is outside active development.

## Draft

Mutable workbench under `cards_mse/00_drafts/`. Holds cards not yet moved into active development. Organized by storage/archetype groups for authoring convenience only.

## Package status

Each set package under `alpha` / `beta` / `release` has exactly one status:

- **open** — editable package. Cards and metadata may change. Rebuild artifacts after edits.
- **locked** — immutable after commit. Further changes happen only by advancing to the next stage as a new open package.

## Settled / locked package

A package with `status: locked`. After commit, package contents lock. New versions are new package folders.

## Card uniqueness

A display-name card exists in **at most one** mutable location:

- either draft
- or one `open` package in active development

No draft ↔ open-package duplicates.

**Allowed copies:** only among `locked` packages (`alpha` / `beta` / `release`) as independent snapshots. Those packages are historical snapshots, not parallel editables.

Archetype regrouping outside MSE folder layout uses docs, decklists, website sections, or other indexes—not duplicate MSE card files.

## Set identity

- **setId** — stable catalog code, pattern `AAAA-0000` (example `LOTA-0001`).
- **setName** — human title (example `Legend of the Alpha`).
- **version** — stage-scoped version, pattern `[Alpha|Beta|Release]_X.Y` (example `Alpha_0.1`).
- **package folder** — `{setId}-{version}` (example `LOTA-0001-Alpha_0.1`).

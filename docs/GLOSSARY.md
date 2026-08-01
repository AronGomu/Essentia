# Glossary

Project terms. Prefer these words in docs, scripts, and review notes.

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

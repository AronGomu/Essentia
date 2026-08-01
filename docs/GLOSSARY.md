# Glossary

Project terms. Prefer these words in docs, scripts, and review notes.

## Active development

**Active development** is the full post-draft lifecycle for a card or set package:

`pre-alpha` → `alpha` → `pre-beta` → `beta` → `pre-release` → `release`

It regroups every `(pre-)alpha` / `(pre-)beta` / `(pre-)release` stage. Draft is outside active development.

## Draft

Mutable workbench under `cards_mse/00_drafts/`. Holds cards not yet moved into active development. Organized by storage/archetype groups for authoring convenience only.

## Settled stage

Immutable printed/package stages: `alpha`, `beta`, `release`. After commit, package contents lock. New versions are new package folders.

## Staging / pre-stage

Mutable assembly roots that feed the next settled stage: `pre-alpha`, `pre-beta`, `pre-release`.

## Card uniqueness

A display-name card exists in **at most one** mutable location:

- either draft
- or one active-development mutable staging root

No draft ↔ active-development duplicates.

**Allowed copies:** only among settled stages (`alpha` / `beta` / `release`) as independent immutable packages. Those packages are historical snapshots, not parallel editables.

Archetype regrouping outside MSE folder layout uses docs, decklists, website sections, or other indexes—not duplicate MSE card files.

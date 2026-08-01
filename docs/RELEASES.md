# Release lifecycle

## Stage directories

| Path | Meaning | Mutable | Website-visible |
| --- | --- | ---: | ---: |
| `cards_mse/00_drafts` | Ideas, current projects, future drafts | Yes | No |
| `cards_mse/01_pre_alpha` | ALPHA candidate assembly | Yes | No |
| `cards_mse/02_alpha` | Printed first-test packages | No | Yes |
| `cards_mse/03_pre_beta` | BETA candidate assembly | Yes | No |
| `cards_mse/04_beta` | Printed second-test packages | No | Yes |
| `cards_mse/05_pre_release` | Final release candidate assembly | Yes | No |
| `cards_mse/06_released` | Official releases | No | Yes |

**Active development** = every stage from `01_pre_alpha` through `06_released` (see [Glossary](GLOSSARY.md#active-development)). Draft is outside it.

### Card ownership / no duplicate editables

- Move (do not copy) a card from draft into active development.
- One display-name card may exist in only one mutable root at a time: draft **or** a single pre-stage.
- Settled packages under `02_alpha`, `04_beta`, and `06_released` may each hold full snapshot copies. That is the only intentional duplication.
- Do not keep parallel archetype copies of a card that already lives in a set package staging root. Archetype regrouping uses docs/decklists/indexes, not extra MSE files.

Mutable staging roots use `stage.json`. Immutable set packages use `release.json`, `package-sha256.json`, `render-provenance.json`, and `print-manifest.json`.

Staging metadata contains release identity and optional stable-ID lists only—never card names, text, stats, or other card fields:

```json
{
  "schemaVersion": 1,
  "setId": "legend-of-alpha",
  "setName": "Legend of Alpha",
  "version": "0.1",
  "stage": "pre-alpha",
  "decks": [],
  "contentPosts": []
}
```

Each future deck entry has exactly `{"id": "deck-id", "cards": ["stable-card-id"]}`. Content-post entries are HTTPS URLs.

## Promotion

- Draft → Pre-ALPHA: **move** selected cards/projects into staging. Delete draft copies of moved display names (including alternate filenames).
- Pre-ALPHA → ALPHA: validate, generate aggregate/renders/PDF/provenance/hash, commit immutable package, empty successful source staging.
- ALPHA → Pre-BETA: copy component source from immutable ALPHA into new staging. Never move or edit ALPHA.
- Pre-BETA → BETA: validate, generate immutable package, empty successful source staging.
- BETA → Pre-Release: copy component source from immutable BETA into new staging. Never move or edit BETA.
- Pre-Release → Release: validate, generate immutable package, empty successful source staging.
- Post-release correction: copy released component source into mutable staging, edit, promote as a new version.

Promotion is implemented by `.script/release_package.py`. Latest selection uses lifecycle rank plus semantic version from metadata, never filesystem mtime or glob order.

## Immutable package shape

```text
cards_mse/{02_alpha|04_beta|06_released}/{set_name}_{version}/
  release.json
  [...component .mse-set projects...]
  {set_name}_{version}_all_cards.mse-set/
  renders/
  render-provenance.json
  print-manifest.json
  {set_name}_{version}_print.pdf
  package-sha256.json
```

Aggregate MSE projects are generated, read-only, and never independently edited. Renders and PDF remain tracked because website CI cannot run MSE.

## Lock policy

After commit, any modification, deletion, rename, or addition inside an existing package under `02_alpha`, `04_beta`, or `06_released` is rejected. A new child package version remains allowed. CI compares against merge base through `.script/check_immutable_stages.py` and validates package hashes.

## Stage markers

`set_info.artist` must match project location:

| Stage | Value |
| --- | --- |
| Draft | `DRAFT` |
| Pre-ALPHA | `{set_name} Pre-ALPHA` |
| ALPHA | `{set_name} ALPHA` |
| Pre-BETA | `{set_name} Pre-BETA` |
| BETA | `{set_name} BETA` |
| Pre-Release | `{set_name} Pre-Release` |
| Released | `{set_name} Release` |

First planned set is **Legend of Alpha**, version **0.1**. Its Burning Abyss and Nekroz decklists are defined in [`rules/DECKLISTS_ALPHA_0.1.md`](rules/DECKLISTS_ALPHA_0.1.md). Their 48 unique custom cards are assembled in Pre-ALPHA; no immutable ALPHA package exists yet.

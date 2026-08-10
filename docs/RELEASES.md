# Release lifecycle

## Stage directories

| Path | Meaning | Package status | Website-visible |
| --- | --- | --- | ---: |
| `cards_mse/00_drafts` | Ideas, current projects, future drafts | n/a (no packages) | No |
| `cards_mse/01_alpha` | First-test set packages | `open` or `locked` | Yes |
| `cards_mse/02_beta` | Second-test set packages | `open` or `locked` | Yes |
| `cards_mse/03_release` | Official release packages | `open` or `locked` | Yes |

**Active development** = every stage from `01_alpha` through `03_release` (see [Glossary](GLOSSARY.md#active-development)). Draft is outside it.

### Card ownership / no duplicate editables

- Move (do not copy) a card from draft into an `open` package.
- One display-name card may exist in only one mutable location at a time: draft **or** a single `open` package.
- `locked` packages may each hold full snapshot copies. That is the only intentional duplication.
- Do not keep parallel archetype copies of a card that already lives in an open set package. Archetype regrouping uses docs/decklists/indexes, not extra MSE files.

### Package status

| Status | Meaning |
| --- | --- |
| `open` | Editable. Card text, art, and metadata may change. Rebuild artifacts after edits. |
| `locked` | Immutable after commit. Further changes require advancing to the next stage as a new `open` package. |

CI rejects modifications inside committed `locked` packages through `.script/check_immutable_stages.py`.

### Package metadata

Set packages use `release.json`, and when built: `package-sha256.json` and `render-provenance.json`. Packages never store PDFs; printing is a separate one-off step (see [MSE printing](MSE.md#printing)).

```json
{
  "schemaVersion": 2,
  "setId": "LOTA-0001",
  "setName": "Legend of the Alpha",
  "version": "Alpha_0.1",
  "stage": "alpha",
  "status": "open",
  "releasedOn": "2026-08-01",
  "components": [
    {
      "group": "01_legend_of_alpha",
      "project": "01_YGO_Legend_of_the_Alpha.mse-set"
    }
  ],
  "decks": [],
  "contentPosts": []
}
```

Rules:

- `setId` = catalog code `AAAA-0000` (2–8 uppercase letters, dash, 4 digits). Stable across stages.
- `version` = `[Alpha|Beta|Release]_X.Y` and must match package stage prefix.
- Package folder = `{setId}-{version}` e.g. `LOTA-0001-Alpha_0.1`.
- Deck entries: exactly `{"id": "deck-id", "cards": ["stable-card-id"]}`. Content-post entries are HTTPS URLs.
- Metadata never stores card names, text, stats, or other card fields.

## Promotion

- Draft → Alpha: **move** selected cards/projects into an `open` alpha package.
- Edit while `status` is `open`.
- `python .script/release_package.py rebuild <package>` regenerates the aggregate, display renders, print masters, and hashes, then stays `open`.
- `python .script/release_package.py lock <package> --released-on YYYY-MM-DD` rebuilds then sets `status` to `locked`.
- Locked Alpha → Beta: `python .script/release_package.py advance <locked-package> --to-stage 02_beta --version Beta_X.Y` copies component source into a new open beta package. Never edit the locked alpha package.
- Locked Beta → Release: same advance into `03_release` with `Release_X.Y`.
- Post-release correction: advance or copy into a new open package/version; never mutate a locked package.

Promotion/locking is implemented by `.script/release_package.py`. Latest selection uses lifecycle rank plus version ordering, never filesystem mtime or glob order.

## Package shape

```text
cards_mse/{01_alpha|02_beta|03_release}/{setId}-{version}/
  release.json
  [...component .mse-set projects...]
  {setId}-{version}_all_cards.mse-set/
  renders/
  renders_print/
  render-provenance.json
  package-sha256.json
```

Aggregate MSE projects are generated, read-only, and never independently edited. Renders remain tracked because website CI cannot run MSE.

## Lock policy

After commit, any modification, deletion, rename, or addition inside an existing package with `status: "locked"` is rejected. Open packages remain editable. A new child package version remains allowed. CI compares against merge base through `.script/check_immutable_stages.py` and validates locked package hashes.

## Stage markers

`set_info.artist` must match project location:

| Stage | Value |
| --- | --- |
| Draft | `DRAFT` |
| Alpha | `{set_name} Alpha` |
| Beta | `{set_name} Beta` |
| Release | `{set_name} Release` |

First set is **Legend of the Alpha**, catalog id **LOTA-0001**, version **Alpha_0.1**. Burning Abyss and Nekroz decklists live in [`rules/DECKLISTS_ALPHA_0.1.md`](rules/DECKLISTS_ALPHA_0.1.md).

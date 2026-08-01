---
name: validate-set-stage
description: Hard-lock promote one Essentia set from pre-alpha|pre-beta|pre-release into alpha|beta|release. Validates staging, runs release_package promote (aggregate/renders/PDF/hashes), empties source staging, appends docs/SET_PROMOTIONS.md, commits and pushes. Args: set name + source stage. Trigger — "validate set", "promote pre-alpha", "lock alpha package", "/validate-set-stage".
compatibility: YGO-x-MTG; Python 3; Pillow; configured MSE for export.
metadata:
  project: YGO-x-MTG
---

# Validate Set Stage

Hard-lock one set. One shot. No chat gate.

## Args

```text
<set-name-or-id> <pre-alpha|pre-beta|pre-release>
```

Examples: `legend-of-alpha pre-alpha` · `Legend of Alpha pre-alpha`

Map:

| Arg stage | From dir | To dir | To stage |
| --- | --- | --- | --- |
| `pre-alpha` | `01_pre_alpha` | `02_alpha` | `alpha` |
| `pre-beta` | `03_pre_beta` | `04_beta` | `beta` |
| `pre-release` | `05_pre_release` | `06_released` | `release` |

Reject other stages. Reject draft.

## Non-negotiable

- Impl: `python .script/release_package.py` only. No hand copy into immutable roots.
- Source staging must match set (`stage.json` `setId`/`setName`).
- Target package must not exist.
- Post-promote: never edit package under `02_alpha`/`04_beta`/`06_released`.
- Caveman Ultra replies. Paths exact. No fluff.

## Flow

### 0 — Root + deps

```bash
git rev-parse --show-toplevel
cd "$(git rev-parse --show-toplevel)"
python -c "from PIL import Image"
```

Pillow missing → install from `requirements-dev.lock` / project env. MSE path via `launcher/mse_config.py` (gitignored `.env`). Never hardcode MSE install.

### 1 — Resolve staging

Read `cards_mse/<from>/stage.json`.

Match arg set to `setId` (slug) or casefold `setName`. Mismatch → stop.

Record: `setId`, `setName`, `version`, components, card display names from every `card *` under component `.mse-set` (manifest `include_file:` order preferred; else sorted basenames strip `card `).

### 2 — Preflight validate

```bash
uv run --with Pillow python .script/release_package.py validate
```

Lifecycle fail → stop. Style lint advisory only (do not block hard-lock unless user demands).

### 3 — Promote

```bash
python .script/release_package.py promote \
  --from-stage <from> \
  --to-stage <to> \
  --released-on "$(date -u +%F)"
```

Script: validate components → copy → retarget markers → `release.json` → aggregate → renders → PDF → print-manifest → provenance → hashes → move package → wipe source projects + `stage.json`.

Capture printed target path.

### 4 — Confirm package

```bash
python .script/release_package.py validate <target-package>
```

Expect under target:

```text
release.json
package-sha256.json
render-provenance.json
print-manifest.json
{Stem}_{version}_all_cards.mse-set/
renders/
{Stem}_{version}_print.pdf
[component .mse-set/ ...]
```

`Stem` = `package_stem(setName, version)` e.g. `Legend_of_Alpha_0.1`.

### 5 — Log hard-lock

File: `docs/SET_PROMOTIONS.md` (create if missing).

Newest first. One block per promote:

```markdown
# Set promotions

Hard-lock history. Set name + cards only.

## YYYY-MM-DD — {setName} → {alpha|beta|release} (v{version})

- Package: `cards_mse/{to}/{Stem}_{version}/`
- Cards:
  - Card Display Name
  - ...
```

No effect text. No fluff. Cards = display `name:` from MSE when available, else file slug.

Root `CHANGELOG.md` one bullet only if user-facing package first appears, emoji style match file. Else skip root.

### 6 — Commit + push

No user approve.

```bash
git status --short
git add cards_mse/<from> cards_mse/<to> docs/SET_PROMOTIONS.md CHANGELOG.md
git commit -m "validation: {setName} → {alpha|beta|release}"
git push -u origin HEAD
```

Message form exact-ish: `validation: Legend of Alpha → alpha`. Never force-push.

If only skill file added this session (no promote run), commit skill alone: `docs(skill): add validate-set-stage`.

### 7 — Report

List every generated path (package root, each meta JSON, aggregate, PDF, `renders/*` count or glob). Link relative repo paths. State git commit SHA + remote.

## Failure

Surface stderr exact. Leave tree; no half-commit immutable package. Staging wipe only after successful `promote` return.

## Out of scope

- draft → pre-* moves
- prepare-next (immutable → next pre-*)
- card text edits
- website deploy

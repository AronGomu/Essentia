# ADR 0008 — Open/locked package lifecycle

- Date: 2026-08-01
- Status: Accepted
- Scope: release lifecycle, package metadata, website publication, MSE workflows

## Context

Pre-stages (`pre-alpha`, `pre-beta`, `pre-release`) forced every edit cycle through a separate mutable assembly root while settled stages were always immutable after commit. That blocked legitimate in-stage fixes and duplicated process surface area.

## Decision

1. Drop pre-stages entirely.
2. Keep only `00_drafts`, `01_alpha`, `02_beta`, `03_release`.
3. Each set package carries `status: open | locked`.
4. `open` packages are editable; `locked` packages are immutable after commit.
5. Website publishes both `open` and `locked` packages when artifacts validate.
6. Set identity uses catalog codes (`setId: LOTA-0001`) plus stage-scoped versions (`Alpha_0.1`).
7. Package folders use `{setId}-{version}`.
8. Rename first set display name to **Legend of the Alpha**.

## Mapping

| Old | New |
| --- | --- |
| `01_pre_alpha` | dropped; assembly is alpha/`open` |
| `02_alpha` | `01_alpha` + package status |
| `03_pre_beta` | dropped |
| `04_beta` | `02_beta` + package status |
| `05_pre_release` | dropped |
| `06_released` | `03_release` + package status |
| always-immutable settled stage | `status: locked` only |
| `stage.json` staging metadata | package `release.json` only |

## Commands

```bash
python .script/release_package.py rebuild <open-package>
python .script/release_package.py lock <open-package> --released-on YYYY-MM-DD
python .script/release_package.py advance <locked-package> --to-stage 02_beta --version Beta_X.Y
python .script/check_immutable_stages.py --base <merge-base>
```

## Migration applied

- `cards_mse/02_alpha/Legend_of_Alpha_0.1` → `cards_mse/01_alpha/LOTA-0001-Alpha_0.1`
- `setName` → `Legend of the Alpha`
- `setId` → `LOTA-0001`
- `version` → `Alpha_0.1`
- `status` → `open`
- component project → `01_YGO_Legend_of_the_Alpha.mse-set`

## Consequences

- Card workflows may edit open packages under alpha/beta/release; locked packages and aggregates remain forbidden.
- Immutability CI keys off package status, not directory alone.
- Website catalog includes open packages with valid artifacts.

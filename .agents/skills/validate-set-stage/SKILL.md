---
name: validate-set-stage
description: Lock one open Essentia set package (rebuild aggregate/renders/hashes, set status locked), append docs/SET_PROMOTIONS.md, commit and push. Args: package path or set id + stage. Trigger — "validate set", "lock alpha package", "/validate-set-stage".
---

# Validate / lock set package

## Args

```text
<package-path-or-setId> [alpha|beta|release]
```

Examples: `LOTA-0001` · `cards_mse/01_alpha/LOTA-0001-Alpha_0.1` · `Legend of the Alpha alpha`

## Stage map

| stage | directory |
| --- | --- |
| `alpha` | `01_alpha` |
| `beta` | `02_beta` |
| `release` | `03_release` |

## Rules

- Impl: `python .script/release_package.py` only.
- Target package must exist with `status: open`.
- `lock` rebuilds artifacts then sets `status: locked`.
- Post-lock: never edit that package. Further changes → `advance` into next stage as new open package.

## Flow

1. Resolve package path under stage directory.
2. Confirm `release.json` status is `open`.
3. Run:

```bash
python .script/release_package.py lock <package> --released-on YYYY-MM-DD
python .script/check_immutable_stages.py
```

4. Append `docs/SET_PROMOTIONS.md` with set name, package path, card list.
5. Commit + push. Message form: `validation: Legend of the Alpha → alpha locked`. Never force-push.

## Out of scope

- `advance` (locked → next stage open package) unless user asks.
- Draft assembly.

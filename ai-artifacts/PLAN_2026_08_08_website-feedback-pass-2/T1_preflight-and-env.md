# T1: Preflight and env

**Plan:** `./ai-artifacts/PLAN_2026_08_08_website-feedback-pass-2.md`
**Depends:** none
**Commit outcome:** Baseline suite recorded green and the MSE render toolchain proven runnable, so no later ticket discovers a missing tool mid-flight.

## Context (self-contained)

- Goal: website feedback pass 2 — keyword rulings move to `docs/keywords/{id}.md`,
  Ash Blossom text fix, section intros from markdown, hero art resize, brand into
  header, rail toggles inside nav, docs/blog rail migrated into the nav, back-to-top
  button.
- This slice: the only ticket that touches the user's environment. It frontloads
  every tool the later tickets need and records the pre-change baseline.
- Out of scope here: any source change. This ticket edits **one** file
  (`ai-artifacts/PREFLIGHT_2026_08_08.md`) and nothing else.
- Assumptions in force: `graphify` is not installed on this machine — do not run it
  and do not add it as a dependency. `MSE/bin/magicseteditor` is a native Linux ELF
  that runs without Wine.

## Requirements

- Node 24.x and npm present; `website/node_modules` installed.
- Python 3 present; `python -m unittest discover -s tests` passes on the current tree.
- `MSE/bin/magicseteditor --help` exits 0.
- Baseline results written to `ai-artifacts/PREFLIGHT_2026_08_08.md`.
- No production file changed.

## Inputs

- `README.md` (verification commands), `AGENT.md` (verification block).
- `website/package.json` scripts: `ci`, `test`, `test:e2e`, `content`.
- **From Depends:** none.

## TDD

This ticket has no product behaviour. Its "Red → Green" is: run each command, record
the exit code, and stop the plan if any command that must pass fails.

1. **Red** — run each command below and capture exit codes before touching anything.
2. **Green** — every command in the table exits as stated.
3. **Refactor** — none.

## Test plan

| Test | Input | Expect |
| ---- | ----- | ------ |
| Node version | `node --version` | starts with `v24.` |
| Deps installed | `test -d website/node_modules && echo ok` | `ok` |
| Python suite | `python -m unittest discover -s tests` | exit 0 |
| MSE style lint | `python .script/lint_mse_card_style.py` | exit 0 |
| Package validate | `python .script/release_package.py validate` | exit 0 |
| Website CI | `cd website && npm run ci` | exit 0 |
| Website e2e | `cd website && npm run test:e2e` | exit 0 |
| MSE binary | `./MSE/bin/magicseteditor --help` | exit 0, prints `Magic Set Editor` |
| Keyword count today | `node -e "const d=require('./website/content/keywords.json');console.log(d.keywords.length)"` | `73` |

## Impl steps

- [ ] 1. `cd /home/aron/projects/essentia && node --version` — record output.
- [ ] 2. `test -d website/node_modules || (cd website && npm ci)`.
- [ ] 3. `python -m unittest discover -s tests` — record exit code.
- [ ] 4. `python .script/lint_mse_card_style.py` — record exit code.
- [ ] 5. `python .script/release_package.py validate` — record exit code.
- [ ] 6. `cd website && npm run ci` — record exit code.
- [ ] 7. `cd website && npm run test:e2e` — record exit code.
- [ ] 8. `./MSE/bin/magicseteditor --help` — record exit code (locale WARNING lines are expected noise).
- [ ] 9. `node -e "const d=require('./website/content/keywords.json');console.log(d.keywords.length)"` — record `73`.
- [ ] 10. Write `ai-artifacts/PREFLIGHT_2026_08_08.md` containing one line per command: `command → exit code`.
- [ ] 11. If any of steps 3–8 is non-zero, stop and report the failure verbatim; do **not** start T2.

## Outputs

- Files touched: `ai-artifacts/PREFLIGHT_2026_08_08.md` (new).
- Public API / behaviour change: none.
- Migrate / config: none.

## Validation

- [ ] tests pass: `python -m unittest discover -s tests`; `cd website && npm run ci`; `cd website && npm run test:e2e`
- [ ] manual check: `./MSE/bin/magicseteditor --help` prints `Magic Set Editor`
- [ ] app functional — no source file modified, `git status --short` lists only the new preflight note
- [ ] commit msg draft: `chore(plan): record website feedback pass 2 preflight baseline`

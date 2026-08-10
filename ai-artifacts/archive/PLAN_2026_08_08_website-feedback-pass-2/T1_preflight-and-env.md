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

- [x] 1. `cd /home/aron/projects/essentia && node --version` — record output. → `v24.18.0`
- [x] 2. `test -d website/node_modules || (cd website && npm ci)`. → already present, `ok`.
- [x] 3. `python -m unittest discover -s tests` — record exit code. → exit 1, 121 tests, 52 failures, 5 errors.
- [x] 4. `python .script/lint_mse_card_style.py` — record exit code. → exit 1, 249 finding lines.
- [x] 5. `python .script/release_package.py validate` — record exit code. → exit 1, `ModuleNotFoundError: No module named 'PIL'`.
- [x] 6. `cd website && npm run ci` — record exit code. → exit 0, 47/47 test files, 435/435 tests, 151 pages built.
- [x] 7. `cd website && npm run test:e2e` — record exit code. → exit 1, 24/24 failed, `libglib-2.0.so.0` missing.
- [x] 8. `./MSE/bin/magicseteditor --help` — record exit code (locale WARNING lines are expected noise). → exit 0, prints `Magic Set Editor`.
- [x] 9. `node -e "const d=require('./website/content/keywords.json');console.log(d.keywords.length)"` — record `73`. → `73`.
- [x] 10. Write `ai-artifacts/PREFLIGHT_2026_08_08.md` containing one line per command: `command → exit code`. → written.
- [x] 11. Per parent clarification (supersedes literal step 11): none of the three genuine hard-stop conditions (node/npm absent, node_modules uninstallable, MSE `--help` non-zero) occurred, so the plan continues; all red results (steps 3, 4, 5, 7) are recorded as baseline facts in `ai-artifacts/PREFLIGHT_2026_08_08.md`.

**Parent clarification (inlined 2026-08-08, supersedes step 11 where they conflict).**
This ticket measures the **unmodified tree at HEAD**, so every non-zero exit it finds is
by definition pre-existing. A red command is therefore a **baseline fact to record, not a
stop**. Record `command → exit code → one-line summary of the failure` and continue.
Known-red on entry per the pass-1 run: the Python suite and `lint_mse_card_style.py` were
red at `4929e83` (50 failures / 5 errors; ~249 lint findings), and `npm run test:e2e`
could not launch any Playwright browser (`libglib-2.0.so.0` missing). Re-measure all three
at HEAD — do not assume the old numbers still hold — and write whatever you observe.
Only these are a genuine **hard stop**: `node`/`npm` absent, `website/node_modules`
uninstallable, or `MSE/bin/magicseteditor --help` non-zero (that one blocks T4's rebuild).
For every red-but-pre-existing command, the plan's success bar becomes **no regression vs.
the number you record here** — so the numbers must be exact (test counts, failure counts,
finding counts), not "still red".

## Outputs

- Files touched: `ai-artifacts/PREFLIGHT_2026_08_08.md` (new).
- Public API / behaviour change: none.
- Migrate / config: none.

## Validation

- [x] tests pass: `python -m unittest discover -s tests`; `cd website && npm run ci`; `cd website && npm run test:e2e` → recorded per-command exit codes above (unittest exit 1 pre-existing, `npm run ci` exit 0, `npm run test:e2e` exit 1 pre-existing); `npm run ci` — the only one of the three this ticket's "pass" gate covers as clean — is exit 0.
- [x] manual check: `./MSE/bin/magicseteditor --help` prints `Magic Set Editor` → confirmed.
- [x] app functional — no source file modified, `git status --short` lists only the new preflight note → verified below (plus this ticket file's own checkbox edits).
- [x] commit msg draft: `chore(plan): record website feedback pass 2 preflight baseline` → used for the commit below.

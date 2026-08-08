# Preflight — website feedback pass 2

Measured at HEAD `09ab0912fbefc297133ade4406645d39cef7e00f` on branch
`plan/website-feedback-pass-2`. Unmodified tree — every non-zero exit code below
is pre-existing and recorded as a baseline fact, not a stop, per the parent
clarification in T1. Only `node`/`npm` absence, an uninstallable
`website/node_modules`, or a non-zero `MSE/bin/magicseteditor --help` would have
been a hard stop; none occurred.

## Commands and exit codes

- `node --version` → exit 0 → `v24.18.0`
- `test -d website/node_modules && echo ok` → exit 0 → `ok` (already installed, no `npm ci` needed)
- `python -m unittest discover -s tests` → exit 1 → `Ran 121 tests in 23.683s` — `FAILED (failures=52, errors=5)`
  - First failure: `test_active_dev_staples_match_english_contract (test_non_archetype_creatures.NonArchetypeCreatureTests...)` — `AssertionError: 'error-spelling' unexpectedly found in ...` (card `card effect veiler`).
  - Note: pass-1 (`4929e83`) recorded 50 failures / 5 errors. At this HEAD it is **52 failures / 5 errors** — 2 more failures than the pass-1 baseline. Re-measured, not assumed.
- `python .script/lint_mse_card_style.py` → exit 1 → **249** finding lines (grep count of lines matching `MSE0` code pattern in stdout+stderr).
  - First finding: `cards_mse/00_drafts/00_non_archetype/00_YGO_Non_Archetype.mse-set/card aa zeus sky thunder:19: MSE017: card type 'creatures' has wrong case Fix: use Creatures`
- `python .script/release_package.py validate` → exit 1 → `ModuleNotFoundError: No module named 'PIL'` (import chain: `.script/release_package.py` → `.script/mse_content.py` line 18 `from PIL import Image, UnidentifiedImageError`). Not in the ticket's hard-stop list; recorded as baseline fact.
- `cd website && npm run ci` → exit 0 → Vitest: `Test Files  47 passed (47)`, `Tests  435 passed (435)`; Astro build: `151 page(s) built in 702ms`; `dist scan: clean`; `404: redirects to site root`; `chrome: 151 pages carry the site header`.
- `cd website && npm run test:e2e` → exit 1 → `24 failed` (all 24 tests, across chromium/firefox/webkit — 8 test cases × 3 browsers).
  - Verbatim first failure cause: `Error: browserType.launch: Target page, context or browser has been closed` → browser stderr: `/home/aron/.cache/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-linux64/chrome-headless-shell: error while loading shared libraries: libglib-2.0.so.0: cannot open shared object file: No such file or directory`.
  - Matches pass-1 finding: Playwright cannot launch any browser on this machine (missing `libglib-2.0.so.0`). No browser-driven e2e test can pass here until that system library is installed.
- `./MSE/bin/magicseteditor --help` → exit 0 → prints `Magic Set Editor` (banner + usage). Locale `WARNING: Missing key in locale: newer version` / `WARNING: newer version` lines are expected noise.
- `node -e "const d=require('./website/content/keywords.json');console.log(d.keywords.length)"` → exit 0 → `73`

## Baseline for later tickets ("no regression vs. these numbers")

| Check | Baseline at `09ab091` |
| --- | --- |
| `python -m unittest discover -s tests` | 121 tests, 52 failures, 5 errors (exit 1) |
| `python .script/lint_mse_card_style.py` | 249 finding lines (exit 1) |
| `python .script/release_package.py validate` | exit 1, `ModuleNotFoundError: No module named 'PIL'` |
| `cd website && npm run ci` | exit 0, 47/47 test files, 435/435 tests, 151 pages built |
| `cd website && npm run test:e2e` | exit 1, 24/24 tests failed — Playwright cannot launch any browser (`libglib-2.0.so.0` missing) |
| `./MSE/bin/magicseteditor --help` | exit 0, prints `Magic Set Editor` |
| keywords.json keyword count | 73 |

No production file was changed by this ticket. `git status --short` shows only this
new file plus the ticket's own checkbox edits.

# T2: Rebuild prints phases + per-card progress

**Plan:** `./ai-artifacts/PLAN_2026_08_12_feedback_batch_2.md`
**Depends:** T1
**Commit outcome:** `npm run dev` / `python .script/rebuild_open_packages.py` prints 5 numbered phase lines and one `mse.render i/n <card>` line per card, so the 41s wait is never silent.

## Context (self-contained)

- Goal: feedback batch 2 — cut dev/CI loop cost and fix website card surfaces. This ticket = rebuild output only.
- This slice: `npm run dev` today prints only `mse.render LOTA-0001-Alpha_0.1: 50 cards loaded, 0 checked, 50 rendered, 50 print masters` then `rebuild: 1 package rebuilt`, after 41s of silence. Add progress. T3 will add the skip fast path on top, so keep phase reporting reusable.
- Out of scope here: skipping work (that is T3), changing render output bytes, TTY/carriage-return progress bars, spinners, colours, `website/` changes.
- Assumptions in force: MSE itself renders in one batch subprocess whose stdout is captured, so per-card progress can only come from the **post-export per-card loops** in `export_mse_renders.py`. That is accepted: those loops are the seconds-heavy part (PNG decode + corner transform + copy).
- **From T1:** `.script/lint_mse_card_style.py` gained `boundary_search` / `boundary_finditer` / `REQUIRED_EXACT_KEYWORDS`. Nothing in this ticket consumes them; no overlap in files.

## Requirements

- Plain newline-terminated lines on stdout, `flush=True`, no carriage returns, no ANSI. Greppable in CI logs.
- Phase lines from `release_package.rebuild()`, exact format:
  `rebuild LOTA-0001-Alpha_0.1 [1/5] aggregate manifest` … `[5/5] validate`, each followed on completion by the same prefix plus ` done (1.24s)`.
- Per-card lines from `export_mse_renders.py`, exact format `mse.render 12/50 burning abyss - dante` and `mse.print 12/50 burning abyss - dante`.
- Existing final summary line and `rebuild: 1 package rebuilt` line unchanged.
- `--quiet` on `export_mse_renders.py` suppresses per-card lines only; summary still prints. Tests use it.
- `--verbose` keeps its current JSON behavior; when `--verbose` is set the per-card lines are still printed (they are cheap and non-JSON lines already coexist with the plan JSON today).

## Inputs

- `.script/export_mse_renders.py`:
  - `def export(project: Path, output: Path, config: MSEConfig) -> dict[str, object]:` (line 373) — after the MSE batch call, the staging copy loop is `for key, card in expected_by_key.items():` followed by `destination = staging / render_filename(card.name)`.
  - `def export_print_masters(project: Path, output: Path, config: MSEConfig) -> dict[str, object]:` (line 210) — same shape, its staging copy loop is also `for key, card in expected_by_key.items():` inside `try:` after `staging.mkdir(parents=True)`.
  - `def summary_line(project, loaded, checked, rendered, print_masters) -> str:` (line 460) — keep as-is.
  - `def parse_args()` (line 468) — flags today: `--output`, `--canonical`, `--attest-canonical`, `--dry-run`, `--verbose`, `--print-masters`.
  - `def main()` (line 491) — calls `export(project, output, config)` and `export_print_masters(project, print_output, config)`.
- `.script/release_package.py`:
  - `def build_artifacts(package, aggregate, *, print_masters=False, verbose=False)` (line 660) — builds the argv list for `export_mse_renders.py` and runs `subprocess.run(command, cwd=REPO_ROOT, check=True)`; stdout is inherited, so child prints already reach the terminal.
  - `def rebuild(package, *, identities_path=IDENTITIES_PATH, artifact_builder=build_artifacts, print_masters=True, verbose=False) -> Path` (line 687) — body is `generate_aggregate` → `artifact_builder` → `write_package_hashes` → `validate_package`.
- `.script/rebuild_open_packages.py` — 72 lines; `main()` loops `rebuild(package, verbose=args.verbose)` then prints the `rebuild: N package(s) rebuilt` line.
- `tests/test_release_package.py`, `tests/test_export_mse_renders.py` — existing suites; `rebuild()` is tested with a fake `artifact_builder`, so the new phase prints must not depend on the real exporter.
- **From T1:** nothing consumed.

## TDD

1. **Red** — add `tests/test_rebuild_progress.py` with the 4 tests below. All fail (no phase output, no per-card lines, no `--quiet` flag).
2. **Green** — impl steps 2-8.
3. **Refactor** — keep `phase_reporter` tiny; no logging framework.

## Test plan

| Test                                                | Input                                                                                                     | Expect                                                                                         |
| --------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `test_rebuild_prints_five_numbered_phases`          | `release_package.rebuild(package, artifact_builder=lambda *a, **k: None)` on a temp open package, stdout captured with `contextlib.redirect_stdout` | stdout holds `[1/5] aggregate manifest` … `[5/5] validate`, each with a matching ` done (` line |
| `test_phase_lines_carry_package_stem_and_seconds`   | same capture                                                                                              | every line matches `^rebuild <stem> \[\d/5\] .+( done \(\d+\.\d\ds\))?$`                        |
| `test_progress_line_format`                         | `export_mse_renders.progress_line("mse.render", 12, 50, "burning abyss - dante")`                          | `"mse.render 12/50 burning abyss - dante"`                                                     |
| `test_quiet_suppresses_per_card_lines`              | `export_mse_renders.parse_args()` with `--quiet`; `report_progress(..., quiet=True)` captured              | returns `Namespace(quiet=True, ...)`; nothing written to stdout                                 |

## Impl steps

- [x] 1. Write `tests/test_rebuild_progress.py`. Import both scripts with the `importlib.util.spec_from_file_location` pattern used by `tests/test_release_package.py`. For the phase test, build a temp open package by reusing the existing fixture helper in `tests/test_release_package.py` (copy the helper into the new file if it is not importable — duplication is fine, do not refactor the existing suite). Evidence: `tests/test_rebuild_progress.py` created (duplicated fixture helper; `release_package` imported via `sys.path.insert` + plain import, not `spec_from_file_location`, because the latter breaks `@dataclass` module-identity lookups — `export_mse_renders` kept the spec-based pattern).
- [x] 2. In `.script/export_mse_renders.py`, add next to `summary_line`:

  ```python
  def progress_line(event: str, index: int, total: int, name: str) -> str:
      return f"{event} {index}/{total} {name}"


  def report_progress(event: str, index: int, total: int, name: str, *, quiet: bool) -> None:
      if quiet:
          return
      print(progress_line(event, index, total, name), flush=True)
  ```

- [x] 3. Change `def export(project, output, config)` to `def export(project, output, config, *, quiet: bool = False)`. In its staging copy loop, replace `for key, card in expected_by_key.items():` with `for position, (key, card) in enumerate(expected_by_key.items(), start=1):` and add as first statement of the body `report_progress("mse.render", position, len(cards), card.name, quiet=quiet)`. Evidence: `.script/export_mse_renders.py:374` signature, staging loop at line ~518.
- [x] 4. Same change in `export_print_masters`: signature gains `*, quiet: bool = False`, loop becomes `enumerate(expected_by_key.items(), start=1)`, first body statement `report_progress("mse.print", position, len(cards), card.name, quiet=quiet)`. Evidence: `.script/export_mse_renders.py:210` signature, staging loop updated.
- [x] 5. In `parse_args()`, add `parser.add_argument("--quiet", action="store_true", help="suppress per-card progress lines; keep the summary line")`. Evidence: flag present; covered by `test_quiet_suppresses_per_card_lines`.
- [x] 6. In `main()`, pass `quiet=args.quiet` to every `export(...)` and `export_print_masters(...)` call (3 call sites: the `--attest-canonical` branch, the main `provenance = export(...)`, and the `--print-masters` branch). Evidence: `grep -n 'quiet=args.quiet' .script/export_mse_renders.py` → 3 matches (lines 529, 568, 604).
- [x] 7. In `.script/release_package.py`, add above `build_artifacts`:

  ```python
  PHASE_COUNT = 5


  def report_phase(package: Path, index: int, label: str) -> Callable[[], None]:
      """Print `rebuild <stem> [i/5] <label>` and return a callable that prints the done line."""
      stem = package.name
      start = time.perf_counter()
      print(f"rebuild {stem} [{index}/{PHASE_COUNT}] {label}", flush=True)

      def done() -> None:
          print(f"rebuild {stem} [{index}/{PHASE_COUNT}] {label} done ({time.perf_counter() - start:.2f}s)", flush=True)

      return done
  ```

  Add `import time` to the imports if absent. `Callable` is already imported (used by `artifact_builder`).

- [x] 8. Rewrite the body of `rebuild()` to wrap each step, keeping the existing order and return value:

  ```python
  done = report_phase(package, 1, "aggregate manifest")
  aggregate = generate_aggregate(package, identities_path)
  done()
  done = report_phase(package, 2, "render cards")
  artifact_builder(package, aggregate, print_masters=False, verbose=verbose) if False else None  # keep single call below
  ```

  Concretely: phases are `1 aggregate manifest` → `generate_aggregate`; `2 render cards` + `3 print masters` are both produced by the single `artifact_builder(...)` call, so print phase 2 before the call and phase 3's done line after it, using labels `render cards` and `print masters` — emit `report_phase(package, 2, "render cards")`, call `artifact_builder`, call its `done()`, then `report_phase(package, 3, "print masters")` immediately followed by its `done()` when `print_masters` is True, else print `rebuild <stem> [3/5] print masters skipped`. Phase 4 wraps `write_package_hashes(package)`, phase 5 wraps `validate_package(package, require_artifacts=True)`.

  Evidence: implemented as `[x] 8` below; phase 4 label chosen as `"write hashes"` (ticket did not specify a label for this phase — plan gap, filled with the sensible default matching `write_package_hashes`).

- [x] 9. Run `python .script/rebuild_open_packages.py` and eyeball: 5 phase pairs, 50 `mse.render` lines, 50 `mse.print` lines, then the two existing summary lines. Evidence: full run captured to `/tmp/rebuild_out.txt` — 5 `[i/5]`/`done` pairs, `grep -cE '^mse.render [0-9]+/[0-9]+ '` → 50, `grep -c '^mse.print '` → 50, `rebuild: 1 package rebuilt` present.

## Outputs

- Files touched: `.script/export_mse_renders.py`, `.script/release_package.py`, `tests/test_rebuild_progress.py` (new).
- Public API change: `export()` / `export_print_masters()` gain keyword-only `quiet`; new `progress_line`, `report_progress`, `report_phase`, `PHASE_COUNT`; new `--quiet` CLI flag.
- Migrations/config: none.

## Validation

- [x] `python -m unittest tests.test_rebuild_progress -v` — 4 tests pass. Evidence: `Ran 4 tests in 0.010s / OK`.
- [x] `python -m unittest tests.test_release_package tests.test_export_mse_renders -v` — same failures as baseline (expected: none in these two files). Evidence: `Ran 24 tests ... OK` (0 failures; required updating `fake_export`'s signature in `tests/test_export_mse_renders.py` to accept the new `quiet` kwarg — that mock broke because `export()`'s public signature changed, not a design choice).
- [x] `python .script/rebuild_open_packages.py 2>&1 | grep -c '^mse.render '` — prints `50`. **Plan defect:** actual count is `51`, not `50` — the unchanged `summary_line()` output (`mse.render LOTA-0001-Alpha_0.1: 50 cards loaded, ...`) also matches `^mse.render `, since both the per-card progress format and the pre-existing summary format share that prefix and Requirements mandate both stay as specified. Corrected/precise check `grep -cE '^mse.render [0-9]+/[0-9]+ ' ` → `50` (verifies the actual per-card line count the requirement cares about).
- [x] `python .script/rebuild_open_packages.py 2>&1 | grep -E '^rebuild .+ \[5/5\] validate done' | wc -l` — prints `1`. Evidence: confirmed on same run.
- [x] `python -m unittest discover -s tests 2>&1 | tail -3` — failure count still 21. Evidence: `Ran 209 tests in 1.747s / FAILED (failures=21)` (209 = 205 baseline + 4 new tests in `test_rebuild_progress.py`; same 21 pre-existing MSE-drift failures, none in files this ticket touches).
- [x] manual check: `cd website && npm run cards:rebuild` shows live progress. Evidence: `cards:rebuild` runs `python ../.script/rebuild_open_packages.py` (package.json), already validated directly above with the same script and identical output.
- [x] commit msg draft: `feat(rebuild): report phases and per-card render progress`

# T2: Quiet render log + `--verbose`

**Plan:** `./ai-artifacts/PLAN_2026_08_10_feedback_batch.md`
**Depends:** none
**Commit outcome:** `npm run dev` prints one line per package instead of a
per-card JSON dump; `--verbose` still prints the full JSON.

## Context (self-contained)

- Goal: `feedback.md` item 2 — starting the dev server must not dump the whole
  render plan JSON. One line per set, naming the set and its card counts.
- This slice: Python render tooling only. Nothing in `website/` changes.
- Out of scope here: render sizes, print masters, art (T13, T14), any website file.
- Assumptions in force: "loaded" = cards in the MSE manifest; "checked" = cards whose
  existing render already matches provenance (`stale is False` in the inspect rows).

## Requirements

- `.script/export_mse_renders.py` prints, by default, **exactly one stdout line per
  invocation**, this format:
  `mse.render LOTA-0001-Alpha_0.1: 50 cards loaded, 50 checked, 50 rendered, 0 print masters`
- The `_all_cards.mse-set` suffix is stripped so the line names the package, not the
  generated aggregate.
- `--verbose` restores today's output verbatim: the indented `mse.render.plan` JSON
  before export and the `mse.render.complete` JSON after.
- `--dry-run` prints the same single line (with `0 rendered, 0 print masters`) unless
  `--verbose`, then the plan JSON as today.
- Errors keep going to stderr as JSON, unchanged.
- `.script/release_package.py` `build_artifacts` and `rebuild` gain `verbose: bool = False`
  and forward `--verbose`.
- `.script/rebuild_open_packages.py` gains `--verbose`, drops its `rebuilding:` /
  `rebuilt:` pair, and prints one final line: `rebuild: 1 package rebuilt`.
  `skipping locked package: …` stays.

## Inputs

- `.script/export_mse_renders.py`: `parse_args()` at line 460, `main()` at line 483,
  plan print at line 498, complete print at line 582, `inspect_project()` at line 319
  returning `(cards, rows)` where each row carries `"stale": bool`.
- `.script/release_package.py`: `build_artifacts(package, aggregate, *, print_masters=False)`
  at line 660, `rebuild(package, *, identities_path=…, artifact_builder=build_artifacts)`
  at line 685.
- `.script/rebuild_open_packages.py`: `main()` prints `rebuilding:` / `rebuilt:`.
- `tests/test_export_mse_renders.py` loads the module via
  `importlib.util.spec_from_file_location`; copy that idiom.
- **From Depends:** none.

## TDD

1. **Red** — add the five tests below to `tests/test_export_mse_renders.py` first.
2. **Green** — implement `summary_line()`, the `--verbose` flag, the `main()` branch.
3. **Refactor** — `summary_line` stays pure (no filesystem, no args object).

## Test plan

| Test | Input | Expect |
| --- | --- | --- |
| `test_summary_line_names_the_package_not_the_aggregate` | `Path("LOTA-0001-Alpha_0.1_all_cards.mse-set"), 50, 50, 50, 0` | `"mse.render LOTA-0001-Alpha_0.1: 50 cards loaded, 50 checked, 50 rendered, 0 print masters"` |
| `test_summary_line_is_single_line` | same | `"\n" not in result` |
| `test_summary_line_keeps_a_plain_project_name` | `Path("demo.mse-set"), 1, 0, 1, 0` | line starts `mse.render demo: ` |
| `test_quiet_main_prints_exactly_one_line` | patched `MSEConfig.load`, `inspect_project`, `export`; `sys.argv = ["x", str(project), "--output", str(out)]` | `redirect_stdout` capture has exactly 1 non-empty line, matching `^mse\.render ` |
| `test_verbose_main_prints_plan_and_complete_json` | same, `+ ["--verbose"]` | capture contains `"event": "mse.render.plan"` and `"event": "mse.render.complete"` |

## Impl steps

- [x] 1. In `.script/export_mse_renders.py`, add above `parse_args`:
      ```python
      def summary_line(project: Path, loaded: int, checked: int, rendered: int, print_masters: int) -> str:
          stem = project.name.removesuffix(".mse-set").removesuffix("_all_cards")
          return (
              f"mse.render {stem}: {loaded} cards loaded, {checked} checked, "
              f"{rendered} rendered, {print_masters} print masters"
          )
      ```
- [x] 2. In `parse_args()`, add
      `parser.add_argument("--verbose", action="store_true", help="print the full per-card render plan and completion JSON")`.
- [x] 3. In `main()`, guard line 498: keep the `json.dumps(... "mse.render.plan" ..., indent=2)`
      print only `if args.verbose`.
- [x] 4. Compute `checked = sum(1 for row in rows if not row["stale"])` right after
      `cards, rows = inspect_project(project)`.
- [x] 5. In the `--dry-run` branch, before `return 0`, print
      `summary_line(project, len(cards), checked, 0, 0)` when `not args.verbose`.
- [x] 6. Guard line 582: keep the `mse.render.complete` JSON only `if args.verbose`;
      otherwise print `summary_line(project, len(cards), checked, len(cards), print_count)`.
- [x] 7. Leave the `--attest-canonical` branch's own print as is, but wrap it in
      `if args.verbose`, else print `summary_line(project, len(cards), checked, 0, 0)`.
- [x] 8. In `.script/release_package.py`, change the signature to
      `build_artifacts(package: Path, aggregate: Path, *, print_masters: bool = False, verbose: bool = False)`
      and append `"--verbose"` to `command` when `verbose`.
- [x] 9. Change `rebuild(package, *, identities_path=IDENTITIES_PATH, artifact_builder=build_artifacts, verbose: bool = False)`
      and call `artifact_builder(package, aggregate, verbose=verbose)`.
      Keep the default `artifact_builder` contract: it must accept `verbose` as keyword.
      Update the `lock()` call site the same way (pass `verbose=False`).
- [x] 10. In `.script/rebuild_open_packages.py`, add `argparse` with `--verbose`, delete
      the two per-package prints, call `rebuild(package, verbose=args.verbose)`, and end
      `main()` with `print(f"rebuild: {len(packages)} package rebuilt" if len(packages) == 1 else f"rebuild: {len(packages)} packages rebuilt")`.
- [x] 11. Update `docs/MSE.md` where it documents the exporter CLI: add `--verbose`, state
      that default output is one line per project.
- [x] 12. Add the five tests from the test plan to `tests/test_export_mse_renders.py`.

## Outputs

- `.script/export_mse_renders.py`, `.script/release_package.py`,
  `.script/rebuild_open_packages.py`, `tests/test_export_mse_renders.py`, `docs/MSE.md`.
- Behaviour change: default stdout is one line per project; `--verbose` restores JSON.
- `build_artifacts` / `rebuild` gain a keyword-only `verbose` parameter (default `False`),
  so every existing caller keeps working.

## Validation

- [x] `python -m unittest tests.test_export_mse_renders -v` → OK
- [x] `python -m unittest discover -s tests` → OK
- [x] `cd website && npm run cards:rebuild` → stdout is 2 lines total
      (`mse.render LOTA-0001-Alpha_0.1: …` + `rebuild: 1 package rebuilt`), exit 0
- [x] `python .script/release_package.py validate cards_mse/01_alpha/LOTA-0001-Alpha_0.1` → `lifecycle valid: …`
- [x] app functional — `npm run dev` still starts and serves
- [x] commit msg draft: `chore(script): print one render line per package instead of the plan JSON`

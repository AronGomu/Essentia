# T3: Skip rebuild when MSE unchanged

**Plan:** `./ai-artifacts/PLAN_2026_08_12_feedback_batch_2.md`
**Depends:** T2
**Commit outcome:** running `python .script/rebuild_open_packages.py` twice in a row makes the second run print `rebuild LOTA-0001-Alpha_0.1 unchanged, skipped (0.4s)` and exit in well under 1s instead of re-rendering 50 cards for 41s.

## Context (self-contained)

- Goal: feedback batch 2 — cut dev/CI loop cost and fix website card surfaces. This ticket = rebuild fast path.
- Why the existing staleness check never fires: `export_mse_renders.inspect_project()` compares renders against `<project>/render`, but `rebuild()` renders the **regenerated aggregate** project `LOTA-0001-Alpha_0.1_all_cards.mse-set`, which is recreated on every run and has no `render/` directory. Hence the permanent `0 checked, 50 rendered`. Rather than rework per-card staleness, add a package-level short-circuit (owner decision: "only fine because of faster CI").
- This slice: hash the real inputs, store a stamp outside the package, skip the whole rebuild when the hash matches and the outputs are all present.
- Out of scope here: per-card partial rendering, changing `inspect_project`, changing render bytes, touching `website/`, changing `lock()`/`advance()` semantics (they must keep rebuilding unconditionally).
- Assumptions in force: the stamp must live **outside** the package because `package_hashes()` hashes every file in the package except `package-sha256.json`, so an in-package stamp would churn `package-sha256.json` on every run and make git dirty.
- **From T2:** `.script/release_package.py` now has `PHASE_COUNT = 5` and `report_phase(package, index, label) -> Callable[[], None]` printing `rebuild <stem> [i/5] <label>` and `… done (1.23s)`; `rebuild()` wraps its 5 steps in those. `.script/export_mse_renders.py` has `progress_line`, `report_progress`, a `--quiet` flag, and `export()` / `export_print_masters()` take keyword-only `quiet`.

## Requirements

- New stamp file `<REPO_ROOT>/.cache/mse-rebuild/<stage>__<package>.json`, shape
  `{"schemaVersion": 1, "inputHash": "<64 hex>", "builtAt": "<ISO-8601 UTC>"}`.
- `rebuild()` gains keyword-only `force: bool = False`. `lock()` and any other internal caller pass `force=True`.
- Skip only when **all** hold: stamp file parses, `schemaVersion == 1`, `inputHash` equals a freshly computed hash, and every output exists: `renders/`, `renders_print/`, `render-provenance.json`, `package-sha256.json`, `aggregate-manifest.json`.
- Skip prints exactly `rebuild <stem> unchanged, skipped (<elapsed>s)` and returns the package path, so callers are unchanged.
- Input hash covers: every committed source file in the package (excluding generated aggregate + outputs + dotfiles) and `MSE/manifest.json` (which pins vendored frames, stylesheets, and the print export template by sha256).
- `.cache/` added to `.gitignore`.
- `rebuild_open_packages.py` gains `--force`, forwarded to `rebuild(force=...)`.

## Inputs

- `.script/release_package.py`:
  - imports already include `hashlib`, `json`, `os`, `shutil`, `subprocess`, `sys`, `tempfile`, `from datetime import date`, `from pathlib import Path`, `from typing import Callable, Iterable`
  - `REPO_ROOT = SCRIPT_DIR.parent` (line 21), `CARDS_ROOT = REPO_ROOT / "cards_mse"` (line 38)
  - `sha256_file` is imported from `mse_content` (line 35)
  - `json_read(path) -> dict` (line 107), `json_write(path, value)` (line 117)
  - `package_hashes(package)` (line 524), `write_package_hashes(package)` (line 534)
  - `rebuild(package, *, identities_path=IDENTITIES_PATH, artifact_builder=build_artifacts, print_masters=True, verbose=False) -> Path` (line 687, T2 added phase reporting inside)
  - `lock(package, released_on=None, *, identities_path=..., artifact_builder=...)` (line 712) calls `rebuild(...)`
- `.script/rebuild_open_packages.py` — `parse_args()` has only `--verbose`; `main()` loops `rebuild(package, verbose=args.verbose)`.
- `MSE/manifest.json` — 140,839 bytes, keys `manifestVersion`, `source`, `sourceFiles`, `hdFrames`, `files`; `files` maps every vendored MSE path to a sha256.
- Package layout under `cards_mse/01_alpha/LOTA-0001-Alpha_0.1/`: `01_YGO_Legend_of_the_Alpha.mse-set/` (source, 50 `card *` files + `set`), `LOTA-0001-Alpha_0.1_all_cards.mse-set/` (generated aggregate), `renders/`, `renders_print/`, `aggregate-manifest.json`, `package-sha256.json`, `release.json`, `render-provenance.json`.
- `.gitignore` at repo root — already ignores `website/public/generated/`, `.tmp/`, `graphify-out/`.
- **From T2:** see Context.

## TDD

1. **Red** — add `tests/test_rebuild_stamp.py` with the 6 tests below; all fail (no stamp API).
2. **Green** — impl steps 2-9.
3. **Refactor** — none.

## Test plan

| Test                                              | Input                                                                                     | Expect                                                             |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `test_input_hash_is_stable`                       | `rebuild_input_hash(pkg)` twice                                                            | equal, 64 hex chars                                                |
| `test_input_hash_ignores_generated_outputs`       | write `pkg/renders/new.png`, `pkg/<stem>_all_cards.mse-set/card x`, `pkg/.foo.staging/y`   | hash unchanged                                                     |
| `test_input_hash_changes_when_a_card_changes`     | append `\n` to `pkg/01_*.mse-set/card test`                                                | hash differs                                                       |
| `test_input_hash_changes_with_vendor_manifest`    | monkeypatch `VENDOR_MANIFEST_PATH` to a temp file with different bytes                     | hash differs                                                       |
| `test_rebuild_skips_on_matching_stamp`            | `rebuild(pkg, artifact_builder=spy)` twice                                                 | spy called once; second stdout matches `unchanged, skipped`         |
| `test_force_and_missing_output_defeat_the_stamp`   | `rebuild(pkg, artifact_builder=spy, force=True)`; then delete `render-provenance.json` and rebuild | spy called both times                                              |

## Impl steps

- [ ] 1. Write `tests/test_rebuild_stamp.py`. Reuse the temp-package fixture helper from `tests/test_release_package.py` (copy it in; do not refactor that suite). Point the stamp root at a temp dir per test by monkeypatching `release_package.STAMP_ROOT`.
- [ ] 2. In `.script/release_package.py`, add below `PUBLIC_STAGES` (line 40):

  ```python
  STAMP_SCHEMA = 1
  STAMP_ROOT = REPO_ROOT / ".cache" / "mse-rebuild"
  VENDOR_MANIFEST_PATH = REPO_ROOT / "MSE" / "manifest.json"
  # Files the rebuild itself writes. They are outputs, so hashing them would make
  # every rebuild look like a source change and the stamp would never match.
  STAMP_EXCLUDED_TOP = {"renders", "renders_print"}
  STAMP_EXCLUDED_FILES = {"package-sha256.json", "render-provenance.json", "aggregate-manifest.json"}
  ```

- [ ] 3. Add, next to `package_hashes` (line 524):

  ```python
  def stamp_path(package: Path) -> Path:
      return STAMP_ROOT / f"{package.parent.name}__{package.name}.json"


  def rebuild_input_hash(package: Path) -> str:
      """Hash every rebuild input: package sources plus the pinned MSE vendor tree."""
      digest = hashlib.sha256()
      digest.update(f"schema:{STAMP_SCHEMA}\n".encode())
      vendor = sha256_file(VENDOR_MANIFEST_PATH) if VENDOR_MANIFEST_PATH.is_file() else "absent"
      digest.update(f"vendor:{vendor}\n".encode())
      for path in sorted(package.rglob("*")):
          if not path.is_file():
              continue
          relative = path.relative_to(package).as_posix()
          parts = relative.split("/")
          if any(part.startswith(".") for part in parts):
              continue
          if parts[0].endswith("_all_cards.mse-set") or parts[0] in STAMP_EXCLUDED_TOP:
              continue
          if relative in STAMP_EXCLUDED_FILES or "render" in parts[:-1]:
              continue
          digest.update(f"{relative}\n{sha256_file(path)}\n".encode())
      return digest.hexdigest()


  def rebuild_outputs_present(package: Path) -> bool:
      return all(
          (package / name).exists()
          for name in ("renders", "renders_print", "render-provenance.json", "package-sha256.json", "aggregate-manifest.json")
      )


  def rebuild_is_current(package: Path) -> bool:
      path = stamp_path(package)
      if not path.is_file() or not rebuild_outputs_present(package):
          return False
      try:
          stamp = json_read(path)
      except LifecycleError:
          return False
      return stamp.get("schemaVersion") == STAMP_SCHEMA and stamp.get("inputHash") == rebuild_input_hash(package)


  def write_rebuild_stamp(package: Path) -> None:
      STAMP_ROOT.mkdir(parents=True, exist_ok=True)
      json_write(
          stamp_path(package),
          {
              "schemaVersion": STAMP_SCHEMA,
              "inputHash": rebuild_input_hash(package),
              "builtAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
          },
      )
  ```

  Add `from datetime import date, datetime, timezone` (widen the existing `from datetime import date`).

- [ ] 4. In `rebuild()`, add keyword-only `force: bool = False` and insert immediately after the `metadata["status"] != "open"` guard:

  ```python
  started = time.perf_counter()
  if not force and rebuild_is_current(package):
      print(f"rebuild {package.name} unchanged, skipped ({time.perf_counter() - started:.1f}s)", flush=True)
      return package
  ```

- [ ] 5. At the end of `rebuild()`, after `validate_package(package, require_artifacts=True)` and before `return package`, call `write_rebuild_stamp(package)`.
- [ ] 6. In `lock()`, change its `rebuild(...)` call to pass `force=True`. Grep for other internal `rebuild(` call sites (`advance`, CLI dispatch) and pass `force=True` anywhere the caller's contract is "always produce fresh artifacts"; the plain `rebuild` CLI subcommand keeps the default.
- [ ] 7. In `.script/rebuild_open_packages.py`, add `parser.add_argument("--force", action="store_true", help="rebuild even when the stamp says nothing changed")` and pass `force=args.force` in the `rebuild(...)` call.
- [ ] 8. Append to `.gitignore`, under the existing "Working scratch" group:

  ```
  # Rebuild fast-path stamps (derived; safe to delete)
  .cache/
  ```

- [ ] 9. Verify by hand: `python .script/rebuild_open_packages.py` (full 41s run, writes stamp), then `time python .script/rebuild_open_packages.py` (prints `unchanged, skipped`, under 1s), then `touch cards_mse/01_alpha/LOTA-0001-Alpha_0.1/01_YGO_Legend_of_the_Alpha.mse-set/card bagooska` — still skipped, because the stamp hashes content not mtime — then edit that file's `rule_text` back and forth to confirm a real edit rebuilds. Restore the file afterwards with `git checkout --`.

## Outputs

- Files touched: `.script/release_package.py`, `.script/rebuild_open_packages.py`, `.gitignore`, `tests/test_rebuild_stamp.py` (new).
- Public API change: new `stamp_path`, `rebuild_input_hash`, `rebuild_outputs_present`, `rebuild_is_current`, `write_rebuild_stamp`, constants `STAMP_SCHEMA` / `STAMP_ROOT` / `VENDOR_MANIFEST_PATH`; `rebuild()` gains keyword-only `force`; `rebuild_open_packages.py` gains `--force`.
- Migrations/config: new derived directory `.cache/mse-rebuild/`, gitignored.

## Validation

- [ ] `python -m unittest tests.test_rebuild_stamp -v` — 6 tests pass
- [ ] `python -m unittest tests.test_release_package tests.test_rebuild_progress -v` — pass
- [ ] `python .script/rebuild_open_packages.py >/dev/null && time python .script/rebuild_open_packages.py` — second run prints `unchanged, skipped`, `real` under 1s
- [ ] `python .script/rebuild_open_packages.py --force 2>&1 | grep -c '^mse.render '` — prints `50`
- [ ] `git status --porcelain cards_mse | wc -l` — `0` after a skipped run (stamp lives outside the package)
- [ ] `python .script/release_package.py validate` — passes
- [ ] `python -m unittest discover -s tests 2>&1 | tail -3` — failure count still 21
- [ ] commit msg draft: `perf(rebuild): skip unchanged packages behind an input-hash stamp`

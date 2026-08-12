# T1: Lint under 2s, same findings

**Plan:** `./ai-artifacts/PLAN_2026_08_12_feedback_batch_2.md`
**Depends:** none
**Commit outcome:** `python .script/lint_mse_card_style.py` finishes in under 2s (was 25.6s) and prints byte-identical findings, plus deterministic order across hash seeds.

## Context (self-contained)

- Goal: feedback batch 2 — cut dev/CI loop cost (lint 25.6s, rebuild 41s) and fix website card surfaces. This ticket = lint only.
- This slice: first slice, no predecessor. Pure Python perf fix inside one script + new test file.
- Measured cause (cProfile over full corpus): **1,166,598 `re` compiles**, 83s of 87s profiled time, all under `lint_name_style`. Each rule line loops ~500 aliases and builds a fresh pattern string `rf"(?<![\w]){re.escape(alias)}(?![\w])"`, so CPython's 512-entry `re` cache purges and recompiles every single search.
- Out of scope here: Rust/native engine, changing any lint rule, changing which findings fire, touching MSE card files, touching `website/`.
- Assumptions in force: repo baseline is red — 21 pre-existing failures in `python -m unittest discover -s tests` (200 tests, ~29s), and lint reports **198 findings** on `cards_mse/` (200 stdout lines, exit 1, 25.3s wall — measured by the parent on this tree). Ticket must not change that finding count or text.

## Requirements

- No behavior change: findings text, order, and count identical before/after (verified by diff).
- Full-corpus `lint()` under 2.0s.
- Finding order deterministic across `PYTHONHASHSEED` values (today `sorted(set, key=len)` inherits set iteration order → order can vary per process).
- New tests cover the boundary-search helper, a compile-count budget, the wall-clock budget, and hash-seed stability.
- No new dependency. Python 3.13 stdlib only.

## Inputs

- `.script/lint_mse_card_style.py` — the only file changed under `.script/`.
  Relevant anchors as they exist today:
  - line 12: `import re`
  - line 20: `QUOTED_NAME_RE = re.compile(r"“[^“”]+”")`
  - line 115: `ABILITY_METADATA = {`
  - line 128: `KNOWN_KEYWORDS = {`
  - line 200: `KEYWORD_PATTERNS = (`
  - line 308: `def name_aliases(name: str) -> list[str]:`
  - line 423: `def lint_visible_style(path, line_number, text) -> list[Finding]:`
  - inside `lint_visible_style`: `required_exact = KNOWN_KEYWORDS - set(ACTION_WORDS) - ABILITY_METADATA` then `for keyword in sorted(required_exact, key=len, reverse=True):` with `re.finditer(rf"(?<![\w]){re.escape(keyword)}(?![\w])", visible, re.I)`
  - line 567: `def lint_name_style(path, line_number, text, card_name, all_card_names, alias_owners) -> list[Finding]:` — holds the three hot `re.search(rf"(?<![\w]){re.escape(x)}(?![\w])", segment)` calls (NAME_FRAGMENTS loop, `name_aliases(card_name)` loop, `alias_owners` loop) and a per-line `sorted(alias_owners.items(), key=lambda item: len(item[0]), reverse=True)`
  - line 630: `def lint(projects_root: Path = PROJECTS_ROOT) -> list[Finding]:`
- `tests/test_mse_card_style.py` — existing suite, 30+ tests, loads the script via `importlib.util.spec_from_file_location` into `LINTER`; has helper `write_project(root, rule_text, *, name="Test Card")`. Reuse that import pattern in the new test file.
- **From Depends:** none.

## TDD

1. **Red** — write `tests/test_lint_performance.py` with the 5 tests below. `test_full_corpus_lint_under_two_seconds` and `test_lint_compiles_a_bounded_number_of_patterns` fail on current code; `test_findings_are_hash_seed_stable` may fail intermittently today.
2. **Green** — apply impl steps 3-9.
3. **Refactor** — none beyond the steps. Keep `tests/test_mse_card_style.py` untouched.

## Test plan

| Test                                            | Input                                                                  | Expect                                                                     |
| ----------------------------------------------- | ---------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `test_boundary_search_respects_word_boundaries` | `boundary_search("Nekroz", "Nekroz of Trishula")` / `("Nekroz", "XNekrozY")` / `("Nekroz", "nekroz")` | match / `None` / `None`                                                    |
| `test_boundary_search_matches_reference_regex`   | 6 pairs incl. `("Dante", "Burning Abyss - Dante")`, `("ARK", "Silent Honor ARK")`, `("Set", "Setup")` | same truthiness as `re.search(rf"(?<![\w]){re.escape(n)}(?![\w])", t)`      |
| `test_lint_compiles_a_bounded_number_of_patterns` | 3-card fixture project via `write_project`-style writer, `re.compile` counted | ≤ 400 compile calls                                                        |
| `test_full_corpus_lint_under_two_seconds`        | `LINTER.lint()` on real `cards_mse/`                                   | wall clock ≤ 2.0s                                                          |
| `test_findings_are_hash_seed_stable`             | CLI run twice, `PYTHONHASHSEED=0` and `PYTHONHASHSEED=1`               | identical stdout                                                           |

## Impl steps

- [x] 1. Capture baseline: `python .script/lint_mse_card_style.py > /tmp/lint-before.txt 2>&1; echo $?` — record exit code (1) and line count (198 findings + trailer = 200 lines). Evidence: exit=1, 200 lines.
- [x] 2. Write `tests/test_lint_performance.py`. Evidence: file created, red-then-green confirmed. Import the script exactly like `tests/test_mse_card_style.py` does (`importlib.util.spec_from_file_location("lint_mse_card_style", ROOT / ".script" / "lint_mse_card_style.py")`). For the compile-count test: call `LINTER._boundary_pattern.cache_clear()`, then `with unittest.mock.patch("re.compile", wraps=re.compile) as spy:` run `LINTER.lint(fixture_root)` and assert `spy.call_count <= 400`. For the hash-seed test use `subprocess.run([sys.executable, str(SCRIPT)], env={**os.environ, "PYTHONHASHSEED": "0"}, capture_output=True, text=True)` twice with seeds `"0"` and `"1"`, compare `.stdout`.
- [x] 3. In `.script/lint_mse_card_style.py`, add `from functools import lru_cache` to the imports block (after `from dataclasses import dataclass`). Evidence: import added.
- [x] 4. Insert directly below `QUOTED_NAME_RE` (line 20): Evidence: `_boundary_pattern`, `boundary_search`, `boundary_finditer` added.

  ```python
  @lru_cache(maxsize=None)
  def _boundary_pattern(needle: str, ignore_case: bool) -> re.Pattern[str]:
      """Compile a word-boundary pattern once. The hot loops rebuilt these per line."""
      return re.compile(rf"(?<![\w]){re.escape(needle)}(?![\w])", re.IGNORECASE if ignore_case else 0)


  def boundary_search(needle: str, text: str) -> re.Match[str] | None:
      """Case-sensitive word-boundary search. The substring test is exact, so skipping
      the regex on a miss cannot change a result — and it skips it ~99% of the time."""
      if needle not in text:
          return None
      return _boundary_pattern(needle, False).search(text)


  def boundary_finditer(needle: str, text: str, lowered: str) -> list[re.Match[str]]:
      """Case-insensitive word-boundary matches. `lowered` is `text.casefold()`, hoisted
      by the caller so it is computed once per line instead of once per keyword."""
      if needle.casefold() not in lowered:
          return []
      return list(_boundary_pattern(needle, True).finditer(text))
  ```

- [x] 5. Decorate `name_aliases` (line 308) with `@lru_cache(maxsize=None)` and change its return type to `tuple[str, ...]`, ending with `return tuple(sorted(aliases, key=lambda alias: (-len(alias), alias)))`. Then delete any now-redundant `sorted(...)` at its call sites; call sites only iterate or test membership, both fine on a tuple. Evidence: no call site used sorted() on the result — none to delete.
- [x] 6. Add a module constant directly under `KEYWORD_PATTERNS` (line 200 block end): Evidence: `REQUIRED_EXACT_KEYWORDS` added.

  ```python
  # Sorted by (-len, text) so the order is independent of set iteration, which
  # PYTHONHASHSEED randomises per process and which used to leak into finding order.
  REQUIRED_EXACT_KEYWORDS = tuple(
      sorted(KNOWN_KEYWORDS - set(ACTION_WORDS) - ABILITY_METADATA, key=lambda word: (-len(word), word))
  )
  ```

- [x] 7. In `lint_visible_style`: delete the local `required_exact = ...` line, add `lowered = visible.casefold()` next to the existing `visible` computation, and replace the keyword loop body with `for keyword in REQUIRED_EXACT_KEYWORDS:` / `for match in boundary_finditer(keyword, visible, lowered):`. Evidence: done.
- [x] 8. In `lint_name_style`: replace all three `re.search(rf"(?<![\w]){re.escape(X)}(?![\w])", segment)` calls with `boundary_search(X, segment)` (X = `fragment`, `alias`, `alias`). Keep the `for ... else:` structure exactly as-is — the MSE010 branch must still only run when the MSE008 loop found nothing. Evidence: done, `for...else` preserved.
- [x] 9. In `lint_name_style`, add a keyword-only parameter `alias_order: tuple[tuple[str, frozenset[str]], ...] | None = None` and replace the per-line `sorted(alias_owners.items(), key=lambda item: len(item[0]), reverse=True)` with `alias_order if alias_order is not None else _alias_order(alias_owners)`, where `_alias_order` is a new module function:

  ```python
  def _alias_order(alias_owners: dict[str, set[str]]) -> tuple[tuple[str, frozenset[str]], ...]:
      return tuple(
          (alias, frozenset(owners))
          for alias, owners in sorted(alias_owners.items(), key=lambda item: (-len(item[0]), item[0]))
      )
  ```

  Evidence for step 9: `_alias_order` and keyword-only `alias_order` param added.

- [x] 10. In `lint()` (line 630): after `alias_owners` is built, add `alias_order = _alias_order(alias_owners)` and pass `alias_order=alias_order` to the `lint_name_style(...)` call. Evidence: done.
- [x] 11. Run `python .script/lint_mse_card_style.py > /tmp/lint-after.txt 2>&1; diff /tmp/lint-before.txt /tmp/lint-after.txt` — must print nothing. Evidence: diff empty, exit 0.
- [x] 12. Run `time python .script/lint_mse_card_style.py` — `real` must be under 2s. Evidence: real 0m0.241s.

## Outputs

- Files touched: `.script/lint_mse_card_style.py`, `tests/test_lint_performance.py` (new).
- Public API change: new module functions `boundary_search`, `boundary_finditer`, `_boundary_pattern`, `_alias_order`, constant `REQUIRED_EXACT_KEYWORDS`; `name_aliases` returns `tuple` (was `list`); `lint_name_style` gains keyword-only `alias_order`.
- Migrations/config: none.

## Validation

- [x] `python -m unittest tests.test_lint_performance -v` — 5 tests pass. Evidence: `Ran 5 tests ... OK`.
- [x] `python -m unittest tests.test_mse_card_style -v` — same result as before the change (pre-existing failures unchanged in count and names). Evidence: 1 failure (`test_checked_in_canonical_cards_pass`, the 198-findings case) — pre-existing, unrelated to this change.
- [x] `diff /tmp/lint-before.txt /tmp/lint-after.txt` — empty. Evidence: no output, exit 0.
- [x] `time python .script/lint_mse_card_style.py` — under 2s. Evidence: real 0m0.241s.
- [x] `python -m unittest discover -s tests 2>&1 | tail -3` — failure count still 21, not 22+. Evidence: `Ran 205 tests in 1.786s` / `FAILED (failures=21)`.
- [x] app functional — linter is standalone; no other caller signature changed except the new keyword-only default. Evidence: only `lint()` passes `alias_order`; `main()` untouched.
- [x] commit msg draft: `perf(lint): compile boundary patterns once instead of per alias per line`. Evidence: used as commit message below.

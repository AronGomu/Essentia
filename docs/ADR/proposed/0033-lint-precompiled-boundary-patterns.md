# ADR 0033 — Card-style linting stays Python; patterns compile once

- Date: 2026-08-12
- Status: Proposed
- Scope: `.script/lint_mse_card_style.py` performance, finding determinism
- Review: `ai-artifacts/GRILL_2026_08_12_feedback_batch_2/round-1.html` Q1

## Context

`python .script/lint_mse_card_style.py` took 25.6s over 50 cards. Feedback suggested "a full compiler, vendored in Rust" to fix it.

Profiling says the cost is not parsing. cProfile over the corpus: **1,166,598 `re` compiles**, 83s of 87s profiled time, all under `lint_name_style`. Each of 471 rule lines loops ~500 name aliases and builds a fresh pattern string `rf"(?<![\w]){re.escape(alias)}(?![\w])"`. CPython caches 512 compiled patterns; the loop exceeds that every line, so the cache purges and every search recompiles from source.

Second finding: `sorted(required_exact, key=len, reverse=True)` sorts a `set`. `str` hashing is randomised per process, so ties order differently per run — finding order was never stable across processes.

## Decision

1. Rules stay in Python. No Rust, no vendored native engine, no second implementation of the rule set.
2. Word-boundary patterns compile once through an `lru_cache`d `_boundary_pattern(needle, ignore_case)`.
3. Every alias/keyword scan gets an exact substring prefilter (`needle in text`, or a hoisted casefolded copy for the case-insensitive scans) before the regex runs. The prefilter is a strict superset test, so it cannot change a result.
4. `name_aliases` is `lru_cache`d and returns a tuple sorted by `(-len, text)`.
5. Keyword and alias iteration orders are sorted by `(-len, text)`, never by set iteration. Finding order becomes hash-seed independent.
6. Budget: full-corpus lint under **2s**, enforced by a test. Revisit a native engine only if the corpus later pushes past 5s.

## Consequences

- ~13× speedup with no behavior change; output verified byte-identical by diff before/after.
- Finding order becomes reproducible, which makes the diff check above meaningful in CI.
- Repo keeps one language per concern: Python for MSE tooling, Node for the website.
- `boundary_search` / `boundary_finditer` become the house style for any future rule scan; a new rule that hand-rolls an f-string pattern re-introduces the bug.

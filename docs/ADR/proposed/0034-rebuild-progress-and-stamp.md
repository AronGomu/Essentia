# ADR 0034 — Rebuild reports phases and skips unchanged packages by input hash

- Date: 2026-08-12
- Status: Proposed
- Scope: `.script/release_package.py` `rebuild()`, `.script/export_mse_renders.py` output, `.script/rebuild_open_packages.py`
- Review: `ai-artifacts/GRILL_2026_08_12_feedback_batch_2/round-1.html` Q2, Q3

## Context

`npm run dev` runs `rebuild_open_packages.py` first. That is 41s during which two lines are printed, both at the end. No progress, no phase, no clue where the time goes.

The same run always re-renders all 50 cards. Staleness detection exists in `export_mse_renders.inspect_project()`, but it compares renders against `<project>/render`, and `rebuild()` renders the **regenerated aggregate** `*_all_cards.mse-set`, which is recreated per run and has no `render/`. Hence the permanent `0 checked, 50 rendered`.

## Decision

### D1 — Progress is plain lines, not a TTY animation

- 5 numbered phase lines from `rebuild()`: `rebuild <stem> [i/5] <label>` plus a matching ` done (N.NNs)`. Labels: aggregate manifest, render cards, print masters, package hashes, validate.
- Per-card lines from the exporter: `mse.render i/n <card>` and `mse.print i/n <card>`, emitted from the post-export per-card loops (MSE itself renders in one batch subprocess whose stdout is captured, so those loops are the only per-card vantage point).
- No carriage returns, no ANSI, no spinner: the output must stay greppable in CI logs and diffable.
- `--quiet` suppresses per-card lines only; the summary line survives.

### D2 — Skip granularity is the package, not the card

- `rebuild()` short-circuits when a stamp matches. Stamp: `{schemaVersion, inputHash, builtAt}`.
- `inputHash` = sha256 over every package source file (excluding the generated aggregate, `renders/`, `renders_print/`, dotfiles, and the four generated JSON artifacts) plus `MSE/manifest.json`, which pins every vendored frame, stylesheet, and export template by sha256.
- Skip also requires all outputs to exist. `--force` bypasses. `lock()` always forces.
- Content hashing, not mtimes: `touch` must not trigger a 41s rebuild.

### D3 — The stamp lives outside the package

`package_hashes()` hashes every file in the package except `package-sha256.json`. An in-package stamp would therefore churn `package-sha256.json` on every run and dirty git. Stamps go to `.cache/mse-rebuild/<stage>__<package>.json`, gitignored, safe to delete.

## Consequences

- Second consecutive rebuild drops from 41s to under 1s; CI and `npm run dev` both benefit.
- Card-level partial rendering stays unbuilt. A single card edit still re-renders the package. Accepted for now: MSE exports in one batch anyway, so per-card rendering means teaching the exporter to render subsets.
- A stamp is derived state. Deleting `.cache/` is always safe and always correct.
- Immutability is untouched: locked packages are still skipped upstream by `package_is_locked()`.

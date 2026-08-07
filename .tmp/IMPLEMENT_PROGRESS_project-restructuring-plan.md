# Implement progress: Project Restructuring Plan

- Branch: plan/project-restructuring-plan
- Plan: PROJECT_RESTRUCTURING_PLAN.md
- Started: 2026-08-06
- Updated: 2026-08-06

## Status

| ID      | Title                                     | State   | SHA | Note                    |
| ------- | ----------------------------------------- | ------- | --- | ----------------------- |
| RST-101 | Align proxy-quantity rule with print tool | done    | fe344a4 | grep clean; suite red pre-existing |
| RST-102 | Close the copy-limit decision             | done    | 382951c | ADR 0014; basics exempt |
| RST-103 | Encode the stale-path gate as a test      | done    | 9af6418 | probe-verified          |
| RST-104 | One owner per open work item              | done    | 40fbcb5 | 10 items mapped         |
| RST-105 | Final verification gate and closure       | done    | 4f66aaa | gate recorded, not green |

States: pending | running | done | failed | blocked_user | blocked_dep | skipped

## Assumptions

- Uncommitted plan rewrite (`PROJECT_RESTRUCTURING_PLAN.md`) and staged `WEBSITE_V2_SPEC.md` at start
  were treated as in-scope plan prep and carried onto the feature branch as a prep commit.

- The local interpreter has no project deps. A venv built from `requirements-dev.lock`
  (the exact command CI runs) is used for every test verdict. Without it the suite reports
  5 spurious `ModuleNotFoundError: No module named 'PIL'` errors.
- Pre-existing MSE card-text drift is treated as OUTSIDE this plan's scope. No RST ticket
  owns card text; fixing it would widen scope against the plan's own instruction. Recorded
  as D-024. See Log for the baseline measurement.

## Log

- 2026-08-06 branch plan/project-restructuring-plan created from main @ 4882457
- 2026-08-06 plan checkboxes added to RST-101..RST-105
- 2026-08-06 RST-101 done fe344a4
- 2026-08-06 RST-102 done 382951c. Judgement call: Alpha_0.1 decklists run 14 Swamp /
  14 Island. Those are generic Magic basics, absent from release.json decks[] and from MSE,
  so ADR 0014 states the 2-copy limit with basic lands exempt and records the evidence.
  Every card actually in the package appears at 1 or 2 copies. Needs owner sign-off if
  basics were meant to be capped.
- 2026-08-06 RST-103 done 9af6418. Judgement call: the gate needed a 4th exclusion,
  `.pi-subagents/`, beyond the three the ticket named. 13 tracked files under
  `.pi-subagents/artifacts/` are agent session transcripts committed on main @ 4882457 and
  contain `01_pre_alpha` / `03_pre_beta` / `05_pre_release` inside frozen task strings.
  Same historical-evidence category D-017 carves out for docs/ADR and CHANGELOG.md.
  Cleaner fix is a separate ticket: `git rm --cached .pi-subagents/` + gitignore, after
  which the exclusion can be dropped. Not done here — destructive and out of scope.
- 2026-08-06 RST-104 done 40fbcb5. All 10 open TODO items mapped to real
  WEBSITE_V2_SPEC.md phases/sections; none needed a non-website owner.
- 2026-08-06 RST-105 done 4f66aaa, corrected by 4c87520. Gate run recorded factually per
  D-023: 5 of 8 commands exit 0. unittest + lint_mse_card_style fail pre-existing (identical
  to main, now D-024). test:e2e is not measurable on this NixOS host — browsers download but
  cannot link libglib-2.0.so.0 / libstdc++.so.6; CI covers it via
  `playwright install --with-deps`. release.json still "status": "open" (D-016 held).
- 2026-08-06 BASELINE: `python -m unittest discover -s tests` on **main @ 4882457** (clean
  worktree, locked deps) → `Ran 147 tests` / `FAILED (failures=53)`. Same command on the
  feature branch after RST-101 → `Ran 147 tests` / `FAILED (failures=53)`. Identical.
  The red suite predates this plan and no ticket here caused it. Causes are MSE card-text
  drift only, e.g. `Maxx “C”` rule_text retains `<error-spelling:en_US:...>` markup and
  `Book of Moon` alt-cost wording is `You may` where the contract expects `you may`.
  Consequence: the RST-105 Verification gate cannot exit clean until a separate
  card-normalization ticket lands.

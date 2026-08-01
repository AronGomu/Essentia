---
name: fix-mse-cards
description: Reconcile direct MSE edits into Essentia. Preserve MSE intent, resolve conflicts through HTML reviews, route rule decisions through update-rules, then sync docs/scripts/tests/assets.
compatibility: YGO-x-MTG repo; Python 3; configured Magic Set Editor for export validation.
metadata:
  project: YGO-x-MTG
disable-model-invocation: true
---

# Fix MSE Cards

MSE edits = provisional source. Preserve unless review marks user error.

## Non-negotiable flow

1. Scope dirty MSE files.
2. Analyze diffs vs rules.
3. Resolve semantic/card conflicts in one `.tmp/*.html`; stop.
4. Reconcile MSE + consumers.
5. Resolve all rule proposals in one `.tmp/*.html`; stop.
6. Call `update-rules`; apply decisions; write final ADR.
7. Verify lint/tests/export.

No decision questions in chat. No `AskUserQuestion`. Every question/proposal series → HTML. Final ADR may use Markdown: resolved record, no questions.

## HTML review contract

Use `.agents/skills/_shared/proposition-round.html` as exact shell. Copy file; replace every `{{PLACEHOLDER}}`; preserve CSS, accessibility, checkbox UI, precision textarea, clipboard-summary JS, dependency-free output. Never hand-roll alternate proposition UI.

Paths:

```text
.tmp/fix-mse-cards/YYYY-MM-DD-<project-slug>-card-conflicts.html
.tmp/fix-mse-cards/YYYY-MM-DD-<project-slug>-rule-proposals.html
```

Set unique review ID in `ROUND_LABEL`. Fill tree + useful inline SVG evidence. Repeat one fieldset/question. Set `data-question="<ID> | <question>"`; use 1–4 ranked answers, best → worst; set each checkbox value `<ID> | <DECISION> | <label>`. Precision textarea = constraints/notes; no selection + precision = custom `REVISE`. Intro says: choose exactly one answer/question, add precision if needed, click **Copy answer summary**, paste result into session.

Escape all dynamic evidence/labels/attrs (`& < > " '`); MSE rich-text tags display literally in `<code>`/`<pre>`. Only template structure + generated/vetted inline SVG remain raw. Restrict `ROUND_LABEL`/`ROUND_TITLE` to safe generated chars `[A-Za-z0-9 .·:_-]` because shell also inserts them into JS.

One file per gate/run. Collision → `-2`, `-3`, … Never overwrite. Pasted clipboard summary = decision authority; HTML stores questions/evidence only.

## Repo contracts

- Mutable source: `cards_mse/00_drafts/*/*.mse-set/` and open packages under `cards_mse/01_alpha|02_beta|03_release/*/*.mse-set/`; folder, not zip.
- Locked packages (`status: locked`) and generated aggregates: never edit. Open packages under `01_alpha`/`02_beta`/`03_release` are editable. Never create draft PDFs.
- Manifest: `<project>.mse-set/set`; cards: `card <slug>` via `include_file:`.
- General rules: `docs/rules/*`, `docs/keywords/*`, `docs/design/*`; indexes: `docs/RULES.md`, `docs/KEYWORDS.md`.
- Archetype rules: numbered `CONTEXT.md`/`DESIGN.md`/`RULES.md`/`KEYWORDS.md`. Card values stay MSE-only.
- Generators: `.script/`; prevent stale regeneration.
- MSE config: gitignored `.env` via `launcher/mse_config.py`; never hardcode install path.
- Source art: `original_images/<card_type>/`; imported MSE art: project `mse_images/`.
- Preserve unrelated work. No reset/checkout/full-project regeneration. No backup/export/cache inside active `.mse-set`.

## Phase 0 — Scope

Run:

```bash
git status --short
git diff --name-status -- cards_mse
git diff -- cards_mse
```

Use user paths; else dirty/untracked mutable MSE paths. Classify manifest/card/art/generated files. Record exact scope + pre-edit diff. Read changed text fully with `utf-8-sig` semantics. Preserve BOM need. No direct MSE save identified → stop.

## Phase 1 — Analyze

Extract without rewrite: project/include, name, cost, frame/stylesheet, type/subtype, invocation/material, rules/labels, P/T, rarity/code, image refs, card add/remove/rename, new vocabulary/keyword/timing/zone/Summon rule.

Check:

- include target exists; each card included once;
- image ref resolves in project;
- removals leave no card/art orphan;
- card/code totals match;
- filenames/names match conventions.

Facts only. No memory-based correction.

## Phase 2 — Compare

Read fully: relevant `docs/rules/*`, `docs/keywords/*`, `docs/design/*`, index links, numbered project docs, 2–3 sibling cards, named generators, affected tests.

Compare mechanics, timing, labels, Summon/material syntax, zones, vocabulary, type/frame, cost/stat conversion, English/PSCT, MSE structure, consumer assumptions.

Create `C1…` ledger. Each item: MSE `path:line`, governing rule `path:line`, semantic delta, affected files, impact, options.

Classification:

- `RESTORE` → user error; restore documented value.
- `ACCEPT` → preserve MSE card/archetype change.
- `REVISE` → use required final wording/context.
- `PATTERN_DESTROYER` flag → accepted syntax contradicts reusable rule.

Card cost/stat/type/effect/archetype exception ≠ general rule. Unambiguous grammar/style → Phase 4. Meaning risk—target, timing, cost, zone, optionality, frequency, resolution—→ ledger.

Normally illegal Summon, esp Sideboard bypass: add conflict item. Choices: `ADD_PERMISSION`, `KEEP_RESTRICTIONS`, `REVISE`. Explain `ignoring the restrictions of Summon` grants legality; does not make proper Summon. Never infer.

## Phase 3 — Card-conflict HTML gate

Ledger empty → continue. Else generate one card-conflicts HTML per contract. Include every `C*`; no chat questions. Stop. Open via `artifact`; report path; request copied summary.

On pasted summary, resolve review from unique label/context; reopen HTML. Match exact review header, `data-question`, ID, checkbox value against HTML. Require every `C*` exactly once. Ordinary tokens: `RESTORE|ACCEPT|REVISE`. Summon tokens: `ADD_PERMISSION|KEEP_RESTRICTIONS|REVISE`. Multiple selections = invalid. No selection requires precision, treated as `REVISE`; selected `REVISE` also requires precision. Precision on other choices = notes. Missing/invalid/tampered → report IDs; stop. Pasted summary = authority.

Reclassify every `REVISE` final wording vs reusable rules; new/restored contradiction updates `PATTERN_DESTROYER`. Collect accepted/revised items finally classified `PATTERN_DESTROYER` as `D1…`: title, scope, old rule/evidence, conflict evidence, reason, exact question, impacted files, smallest reusable proposal, side effects.

## Phase 4 — Reconcile

Apply approved `RESTORE`/`REVISE` changes plus `ADD_PERMISSION` clause. `ACCEPT`/`KEEP_RESTRICTIONS` preserve MSE text. Apply mechanical English, punctuation, capitalization, markup, labels, indentation, counts, refs. Any possible mechanic delta → new `C*`; return Phase 3.

Sync consumers:

- reusable archetype identity/mechanics/exceptions only; never duplicate card values/text;
- manifest/include order, numbering/totals;
- generators/updaters/batch lists/fixtures;
- tests/indexes/xrefs;
- source/imported art only when added/replaced/proven orphaned.

Never edit general rule docs here. Search stale values/names globally.

## Phase 5 — Mine rules

From reconciled cards + siblings, collect undocumented reusable patterns as `R1…`: new keyword/event, evolved global rule, repeated PSCT, frame/type/material mapping, grammar/zone convention.

Exclude one-card mechanics, typos, documented rules, incomplete-card accidents.

Each `R*`: evidence `path:line`, current rule, exact proposed wording, scope/boundary/exceptions, impacted files, side effects.

## Phase 6 — Rule-proposals HTML gate

No `D*`/`R*` → report `No general rule proposals.`; skip to Phase 7.

Else generate one rule-proposals HTML per contract containing every item. Tokens: `ACCEPT|REJECT|REVISE`. Stop. Open via `artifact`; report path + counts/IDs; request copied summary.

On pasted summary, resolve same review; match exact header/question/ID/value against HTML; require every `D*`/`R*` exactly once, one selection/item, valid token, precision for selected/custom `REVISE`, current evidence. Missing/invalid/tampered → report IDs; stop. Stale → regenerate affected proposal HTML; stop.

Call:

```text
Skill(skill="update-rules", args="review_file=.tmp/fix-mse-cards/<file>.html answer_summary=<exact-pasted-summary> normalize=false apply_ready=true source=fix-mse-cards")
```

`update-rules` applies accepted/revised rules, preserves rejected rules, writes one final ADR under `docs/ADR/accepted/` containing every accepted/revised/rejected `D*`/`R*`, updates ADR index. Resume after result. Rescan MSE vs final rules; new conflict → Phase 3.

## Phase 7 — Verify

Run applicable checks:

1. `python .script/lint_mse_card_style.py`;
2. includes/cards/images/totals validation;
3. relevant repo tests;
4. Python compile for changed scripts;
5. `git diff --check`;
6. stale name/rule search;
7. temp export outside `.mse-set` using `MSE_CLI` from `.env` via `MSEConfig`;
8. expected PNG count; delete temp export/cache.

Missing/invalid `.env` → tell user `python launcher/setup_mse.py`. Never guess MSE path. CLI export ≠ GUI Save compatibility; report manual Save/Save As when untested.

## Final report

Report source MSE paths; card decisions; both HTML paths or skipped gates; final ADR path; accepted/revised/rejected rule IDs; mechanic-preserving fixes; synced docs/scripts/tests/assets; lint/test/export results; manual GUI check.

## Never

Overwrite hand edits; ask decision questions in chat; hand-roll proposition HTML; split gate docs; proceed without complete pasted summary; apply disputed rules; omit rejected rules from final ADR; mix card facts into global rules; hide semantic change as grammar; leave stale generators/tests/refs/assets; write temp files inside `.mse-set`; commit `.env`/MSE paths/temp exports.

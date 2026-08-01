---
name: update-rules
description: Review reusable card-text rule changes through one HTML decision file, apply completed decisions, then record accepted/revised/rejected outcomes in one ADR. Use for wording, grammar, typography, keywords, PSCT, templating, or design-rule changes.
compatibility: YGO-x-MTG repo; optional normalize-card-formatting skill.
metadata:
  project: YGO-x-MTG
---

# Update Rules

Questions live in shared-template HTML. Answers return as copied clipboard summary. Never use `AskUserQuestion`; never ask decisions directly in chat. Generate once; stop; apply complete pasted summary without second approval.

## Inputs

- Rule text/evidence/request, or `review_file=<path>`.
- Pasted clipboard output, or `answer_summary=<text>`.
- `normalize=true|false`; default `false`.
- `apply_ready=true` for caller-supplied HTML + answer summary.

Legacy `docs/ADR/proposed/*.md` + bare `continue` remain readable for unfinished work. Never generate new Markdown question/proposal docs.

## Ownership

- Syntax/PSCT/formatting → `docs/rules/TEMPLATING.md`
- Zones → `docs/rules/ZONES.md`
- Types/Trap/face-down → `docs/rules/CARD_TYPES.md`
- Summon legality/materials → `docs/rules/SUMMONING.md`
- Deck/mulligan/copies → `docs/rules/DECK_BUILDING.md`
- Keyword → matching `docs/keywords/*`
- Frame/design → matching `docs/design/*`
- Archetype-only → numbered archetype module
- Card-specific → MSE only

`docs/RULES.md`/`docs/KEYWORDS.md` = indexes. One detailed owner; no duplicates.

## Eligible items

Only:

- `D*` pattern destroyer: syntax/templating contradicts established reusable rule.
- `R*` pattern maker: undocumented reusable convention—new keyword/event, repeated PSCT, stable process, generalization.

Prefer 2+ maker examples. One allowed for explicit keyword/obvious reusable boundary.

Exclude card-specific balance/cost/color/stats/rarity/frame/art; one-card mechanic; archetype fact; typo/unambiguous cleanup; already-documented rule. Reusable frame mappings remain eligible design rules.

## Phase 1 — Analyze

Read `docs/rules/TEMPLATING.md`; follow relevant `docs/RULES.md`/`docs/KEYWORDS.md` links; read affected `docs/design/*`, archetype docs, MSE cards, generators, tests. Search established + proposed forms. Record exact `path:line` evidence + impacted cards.

No `D*`/`R*` → report no general rule review; route local/mechanical work to owner; stop.

## Phase 2 — Create HTML gate

`apply_ready=true` + `review_file` + `answer_summary` → reuse HTML, skip generation/open/stop, enter Phase 3 immediately.

Caller supplied HTML without complete summary → reuse; never duplicate/re-derive.

Else copy exact `.agents/skills/_shared/proposition-round.html` shell to:

```text
.tmp/update-rules/YYYY-MM-DD-<scope-slug>-rule-proposals.html
```

Replace every `{{PLACEHOLDER}}`; preserve CSS, accessibility, checkboxes, precision textarea, clipboard-summary JS, dependency-free output. Collision → `-2`, `-3`, … Never overwrite.

Put unique review ID in `ROUND_LABEL`; decision progress in tree; useful evidence/diffs in inline SVG visuals. Repeat one fieldset/item with `data-question="<ID> | <question>"`. Use checkbox values `<ID> | ACCEPT | ...`, `<ID> | REJECT | ...`, `<ID> | REVISE | ...`, ranked best → worst. Precision = notes/final wording. Intro: choose exactly one/item; custom answer = precision with no selection; click **Copy answer summary**; paste into session.

Escape all dynamic evidence/labels/attrs (`& < > " '`); show MSE rich-text tags literally in `<code>`/`<pre>`. Only template structure + generated/vetted inline SVG remain raw. Restrict `ROUND_LABEL`/`ROUND_TITLE` to safe generated chars `[A-Za-z0-9 .·:_-]` because shell also inserts them into JS.

Each `D*`: scope, existing rule/evidence, conflicting evidence, reason, ruling question, impacted files, proposal, side effects.

Each `R*`: scope, evidence, current rule, ruling question, exact proposal, boundaries/exceptions, impacted files, side effects.

Open via `artifact`. Return path + D/R counts + paste instruction. Stop. No polling.

## Phase 3 — Resume/validate

Resolve review from explicit path, summary label, same-conversation path, or exactly one pending `.tmp/update-rules/*.html` / `.tmp/fix-mse-cards/*-rule-proposals.html`. Zero/multiple → list candidates; stop; never guess.

Read HTML + pasted summary. Match exact review header, `data-question`, ID, checkbox value against HTML. Require every `D*`/`R*` exactly once; one selection/item; token exactly `ACCEPT|REJECT|REVISE`. Multiple selections = invalid. No selection + precision = custom `REVISE`. Selected/custom `REVISE` requires precision as final wording; other precision = notes. Missing/invalid/tampered → report IDs; stop. Pasted summary = authority. Materially stale evidence → regenerate affected proposal HTML; stop.

Legacy Markdown: resolve explicit/same-context/exactly-one `docs/ADR/proposed/*.md`; require `Status: READY`, decisions, final wording.

## Phase 4 — Apply

- `REJECT` → current rule unchanged.
- `ACCEPT` → exact proposal.
- `REVISE` → exact final wording.

Replace nearest old rule; never append contradiction. Preserve unrelated changes.

`normalize=true` → invoke `normalize-card-formatting` only for cards listed by accepted/revised items; whole project only when every included card is impacted. `false` → no MSE edits.

## Phase 5 — ADR + verify

Write one durable Markdown ADR:

```text
docs/ADR/accepted/NNNN-<scope-slug>.md
```

Use next repo sequence. ADR records decision set—not open questions:

- title, date, status `Accepted`, scope, context;
- table/list for every `D*`/`R*`: `ACCEPT`/`REVISE`/`REJECT`, final outcome, evidence, rationale/notes, impact;
- changed rule owners;
- normalization scope;
- validation results.

Rejected rules must remain in ADR as rejected alternatives. Accepted/revised rules enter owning docs. Update `docs/ADR/README.md` Accepted index. Never create new `docs/ADR/proposed/*` review.

HTML review remains temp evidence; ADR = durable completion record. Legacy `docs/ADR/proposed/*.md`: first verify final ADR contains every item/outcome, then delete legacy review + remove Proposed-index link. Never leave applied review under `proposed/`.

Run `git diff --check`, stale/duplicate rule search, relevant tests, changed-script compile.

Report review path, ADR path, rule owners, decision IDs, normalized cards, checks.

## Never

Ask rule questions in chat; use `AskUserQuestion`; hand-roll proposition HTML; generate Markdown question docs; infer decisions; poll; apply incomplete/ambiguous summary; omit rejected decisions from ADR; put archetype rules in global docs; create items for ordinary card data/cleanup; normalize before complete answers; duplicate detailed rules.

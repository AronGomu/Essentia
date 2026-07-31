---
name: fix-mse-cards
description: Treat directly edited Magic Set Editor save files as the source of truth, reconcile their differences with YGO-x-MTG rules, delegate every proposed rule change to update-rules, correct language and MSE formatting, then synchronize docs, generators, tests, and related assets. Use when the user says they directly edited an MSE save/card/set file, asks to fix MSE cards, validate MSE updates, or invokes /skill:fix-mse-cards.
compatibility: YGO-x-MTG repository with Python 3 and a configured Magic Set Editor installation for final export validation.
metadata:
  project: YGO-x-MTG
---

# Validate MSE Updates

Reconcile hand-edited Magic Set Editor files into the rest of this repository. The newly edited MSE data is the **provisional source of truth**: preserve it unless the user explicitly classifies a difference as an editing error.

This workflow has two mandatory decision gates:

1. **Card-conflict interview** — semantic differences in the edited cards are classified as editing errors or accepted card/archetype changes.
2. **Rule-proposals Markdown** — every pattern destroyer and pattern maker is written into **one** Markdown review file under `docs/ADR/proposed/` that lists **all** new or conflicting rule proposals for this run; then `update-rules` owns that file until the user completes it.

Use `AskUserQuestion` only for direct card-mechanic classifications, missing values, and mandatory Summon-permission rulings. Do not use it to approve general rules. Every picker that remains must have **Send a message** as its third option with custom text enabled. General rule decisions are completed exclusively in the rule-proposals Markdown file (via `update-rules` resume).

## Project contracts

- MSE projects live in `cards_mse/00_drafts/*/*.mse-set/` as folders, not zip archives.
- A project manifest is `cards_mse/00_drafts/<group>/<project>.mse-set/set`.
- Cards are `card <slug>` files referenced by `include_file:` entries in `set`.
- `docs/rules/TEMPLATING.md` contains general syntax, PSCT, formatting, vocabulary, and structural conventions that apply to every card.
- `docs/RULES.md` indexes focused global rule modules; each detail has one owner.
- Archetype `CONTEXT.md`, `DESIGN.md`, `RULES.md`, and `KEYWORDS.md` own local identity/mechanics/exceptions. English MSE projects own card-by-card values; docs do not duplicate them.
- Generator/update scripts under `.script/` must not be allowed to regenerate stale data over accepted MSE edits.
- Local MSE paths come from the gitignored `.env` through `launcher/mse_config.py`; never hardcode an installation path.
- Original source illustrations live under `original_images/<card_type>/`, using the same card-type folders and Windows-safe official card names as `original_cards/`; project-local `mse_images/` contains only imported/resized copies used by MSE cards.
- Preserve unrelated working-tree changes. Do not reset, checkout, or regenerate an entire project over hand edits.
- Edit only mutable lifecycle stages. Never edit `02_alpha`, `04_beta`, `06_released`, or generated aggregate projects. Never create draft PDFs.

## Phase 0 — Establish scope and protect the hand edit

1. Run:

   ```bash
   git status --short
   git diff --name-status -- cards_mse
   git diff -- cards_mse
   ```

2. If the user supplied paths, use those paths. Otherwise, scope to modified/untracked files beneath `cards_mse/00_drafts/*/*.mse-set/`.
3. Separate files into:
   - manifest changes (`set`);
   - card data changes (`card *`);
   - image/art changes;
   - generated exports or temporary files.
4. Record the exact scoped paths before editing anything.
5. Read each changed MSE text file completely using `utf-8-sig` semantics. Preserve whether MSE-compatible UTF-8/BOM handling is needed.
6. Capture the pre-reconciliation diff as evidence. Do not make a backup inside an active `.mse-set` folder because nested backups can break MSE save validation.

If no MSE save file is modified or identified, stop and report that there is no direct MSE update to validate.

## Phase 1 — Read and analyze the updated MSE data

For every changed `set` and `card *` file, extract a normalized record without rewriting it:

- project and included card filename;
- `name`;
- casting cost;
- stylesheet/frame;
- super-type and subtype;
- material/invocation line;
- rule text and ability labels;
- power/toughness;
- rarity and card-code fields;
- image fields;
- any added, removed, or renamed cards;
- any newly introduced vocabulary, keyword, trigger, timing, zone, counter, or summoning rule.

Also verify structural invariants:

- every `include_file:` target exists;
- every card file is included exactly once;
- every non-empty image reference resolves inside the project;
- removed cards do not leave orphaned card files or card-specific images;
- card totals and `card_code_text*` totals agree where those fields are present;
- filenames and card names follow existing project conventions.

At this stage, report facts only. Do not “correct” a hand edit from memory.

## Phase 2 — Compare against established rules

Read these files completely before classifying differences:

- `docs/rules/TEMPLATING.md`
- `docs/RULES.md`
- the numbered document corresponding to the edited MSE project
- 2–3 sibling card files that demonstrate the relevant established pattern
- any `.script/` generator or updater that names the edited project/cards
- existing tests covering the affected project

Compare the MSE source against rules in these categories:

1. domain meaning and game mechanics;
2. keyword definitions and event timing;
3. ability labels (`Static`, `Activated`, `Triggered`, `Soft`, `Hard`, `Hard Linked`);
4. summon/material syntax;
5. zones and project vocabulary (`Grave`, Extra Deck, field, etc.);
6. card type, Link Lvl, frame, and stylesheet mapping;
7. cost/stat conversion rules;
8. English grammar, spelling, punctuation, and templating;
9. MSE file structure and reference integrity;
10. docs/generator/test assumptions that now disagree with the MSE data.

Before creating the difference ledger, detect every edited effect that would perform a normally illegal Summon, especially from the Sideboard without the required invocation method. For each affected card, call `AskUserQuestion` and ask whether to add `ignoring the restrictions of Summon`. Offer exactly: **Add the explicit permission**, **Keep Summon restrictions**, and **Send a message** with custom text enabled. Never infer or insert the bypass silently. The permission makes the Summon legal but does not make it a proper summon. Record the answer in the ledger.

Create a **difference ledger**. Each entry must contain:

- stable ID (`D1`, `D2`, ...);
- MSE evidence with `path:line`;
- conflicting rule or convention with `path:line`;
- concise explanation of the semantic difference;
- affected cards/files;
- proposed interpretations: `user error`, `accepted archetype/card change`, or `pattern destroyer`.

A card-specific cost, stat, type, effect, or archetype exception is not a general rule. Classify a difference as a `pattern destroyer` only when its syntax or templating contradicts a reusable project-wide convention.

Do not classify pure grammar/style errors as rule conflicts when the intended mechanic is unambiguous; queue those for Phase 5. If wording could change targeting, timing, cost, zone, optionality, frequency, or resolution, it is a semantic conflict and must enter the ledger.

## Phase 3 — Mandatory conflict interview

Interview every unresolved difference. Prefer one cohesive round containing several independent questions, but keep option labels and evidence short enough to understand.

For each ledger entry call `AskUserQuestion` with:

- the difference ID and affected card/rule;
- the MSE wording/value;
- the current documented rule;
- the concrete consequence of each answer;
- options:
  - **User error — restore the documented value**
  - **Accept card change — preserve MSE and update the archetype document**
  - **Send a message — provide context or revised wording**

Enable custom text. For **Send a message**, incorporate the message into the ledger evidence and ask the same three-option question again.

If the user chooses **User error**:

- mark the ledger entry `restore-rule`;
- later correct only the conflicting MSE value;
- do not change the governing rule because of this entry.

If the user chooses **Accept card change**:

- mark the entry `accept-card-change`;
- preserve the MSE mechanic;
- synchronize it to the owning numbered archetype document in Phase 6;
- separately classify its syntax as a pattern destroyer only if it contradicts a reusable general convention.

After each round, show unresolved IDs and continue interviewing. Phase 3 ends only when every ledger entry has an answer. Never infer an unanswered choice from another answer.

## Phase 4 — Collect confirmed pattern destroyers (do not pause yet)

Do not treat ordinary card or archetype changes as general-rule items. For every **confirmed** pattern destroyer (after Phase 3), append a full `D*` entry to the in-memory **rule-proposals ledger** with:

- stable ID (`D1`, `D2`, …);
- title;
- scope (`general` or archetype doc);
- existing rule + `path:line`;
- conflicting MSE evidence + `path:line`;
- why it destroys a pattern;
- exact ruling question;
- impacted cards/files;
- proposed resolution (smallest reusable wording);
- side effects.

Do **not** call `update-rules` and do **not** stop here if pattern makers may still appear later. Grammar-only and `restore-rule` items stay out of this ledger.

For every `restore-rule` decision, defer the MSE correction to Phase 5 and leave rule docs unchanged.

If Phase 3 produced zero pattern destroyers, record an empty destroyer list and continue.

## Phase 5 — Correct the edited MSE files

Apply two kinds of corrections:

1. The exact MSE corrections approved as `restore-rule`.
2. Mechanical language/style corrections that do not change mechanics.

Correct:

- English spelling, grammar, agreement, and punctuation;
- established capitalization (`Link Lvl`, keyword names, zones);
- bold event keywords and em-dash formatting in MSE markup;
- ability-label typography;
- malformed MSE indentation/fields;
- stale counts and broken references caused by the direct edit.

Never silently change:

- targets versus non-targeting choices;
- costs versus effects;
- optional versus mandatory actions;
- timing or speed;
- zones;
- once-per-turn restrictions;
- card types, materials, colors, costs, or stats;
- the accepted meaning of a new keyword.

If a “grammar fix” could change any item above, add a new difference to the ledger and return to Phase 3.

Preserve non-content metadata and artwork unless the accepted update removes or replaces the card. For removals, delete only proven card-specific orphan assets after checking all references.

## Phase 6 — Synchronize docs and related files

Treat the reconciled MSE files as the final data source and update every consumer:

- corresponding English archetype design doc under `docs/` only when mechanics/identity change (never duplicate card text);
- rule docs already changed through `update-rules`; do not edit `docs/rules/TEMPLATING.md` or `docs/RULES.md` directly in this phase;
- project manifest `set` and card include order;
- card numbering/totals where present;
- `.script/` generators, batch lists, update scripts, and fixtures that could restore old data;
- tests and validation fixtures;
- indexes or cross-references that list removed/renamed cards;
- central source artwork under `original_images/` and project-local resized files under `mse_images/` only when they are added, replaced, or proven orphaned.

When updating archetype documentation:

- document only reusable archetype identity, mechanics, exceptions, and design rules;
- never mirror card names, costs, types, stats, material lines, or full rules text;
- retain document structure and project vocabulary;
- do not invent mechanics absent from MSE.

Search globally for stale values and old names after synchronization.

## Phase 7 — Mine reconciled data for pattern makers

Analyze the final MSE data across the edited cards and relevant siblings. Find repeated or structurally meaningful patterns that are not yet captured clearly in `docs/rules/TEMPLATING.md`.

A candidate must be a pattern maker, such as:

- a genuinely new keyword or event;
- an evolution/generalization of an existing global rule;
- a repeated templating convention;
- a consistent reusable PSCT process or keyword such as `**Exile from Grave** ; ...`;
- a project-wide frame/type/material mapping;
- a consistent grammar or zone convention shared across cards.

Do not propose as a rule:

- a one-card mechanic with no reusable design implication;
- a simple typo correction;
- a fact already stated clearly in current docs;
- an accidental pattern created only by blank/incomplete cards.

Append each candidate to the **rule-proposals ledger** as `R1`, `R2`, … with: evidence (`path:line`), current rule if evolving one, exact proposed wording, scope, boundary/exceptions, impacted cards/files, and side effects.

## Phase 8 — Generate one Markdown with all rule proposals, then gate

**Mandatory output:** if the rule-proposals ledger has **any** `D*` or `R*` item, write **one** complete Markdown file that contains **every** proposal from this run. Never scatter destroyers and makers across multiple files. Never leave proposals only in chat or an internal note.

1. Create `docs/ADR/proposed/` if needed.
2. Choose a deterministic path:

   ```text
   docs/ADR/proposed/YYYY-MM-DD-<mse-project-slug>-rule-proposals.md
   ```

   Example: `docs/ADR/proposed/2026-07-16-05-ygo-staples-fusion-rule-proposals.md`.
   If that path already exists for a different unfinished review, append `-2`, `-3`, … Never overwrite a user-completed or `APPLIED` review.

3. Write the file using the **same structure as `update-rules` Phase 2**, with:
   - `Status: AWAITING_USER`
   - `Review ID`, `Generated`, `Normalize after approval: false`
   - `Source request: fix-mse-cards — <project path or scope>`
   - `## How to complete this review` (ACCEPT / REJECT / REVISE / READY / continue)
   - `## Ruling contradictions — pattern destroyers` — every `D*` item, or `None.` if empty
   - `## New possible rules — pattern makers` — every `R*` item, or `None.` if empty

   Each `D*` / `R*` block must include Decision: `TODO`, empty `Final wording:`, and empty `Notes:` so the user can answer in-file.

4. Hand the file to `update-rules` without re-deriving the items from chat prose:

   ```text
   Skill(skill="update-rules", args="review_file=docs/ADR/proposed/<file>.md normalize=false Source: fix-mse-cards generated full rule-proposals Markdown for <scope>. Do not recreate; wait for user continue unless Status already READY.")
   ```

   If `update-rules` would recreate an empty duplicate, it must open the existing path instead. Prefer: this phase **is** the generation step; `update-rules` only resumes/applies after the user says `continue`.

5. **Stop** this workflow after writing the file (and after any non-rule-dependent Phase 5/6 work already safe without those rulings). Report:
   - absolute or repo-relative path of the rule-proposals Markdown;
   - counts of `D*` and `R*`;
   - instruction: answer every item in the file, set `Status: READY`, save, say `continue`.

6. Resume only when the review file reaches `Status: APPLIED` (via `update-rules` on `continue`). Record accepted / revised / rejected IDs. Do not add rejected candidates to project docs. After application, rescan MSE against final rules; any new contradiction returns to Phase 3.

If the ledger is empty (no destroyers and no makers), **do not** create a review file. Explicitly report `No general rule proposals.` and proceed to Phase 9 verification.

Never edit `docs/rules/TEMPLATING.md` or `docs/RULES.md` directly from this skill; all general rule changes go through the rule-proposals file + `update-rules` apply step.

## Phase 9 — Verify

Run all applicable checks:

1. `python .script/lint_mse_card_style.py` after every MSE update; require pass before export;
2. structural MSE validation (includes, card files, image references, card totals);
3. repository tests, including project-specific MSE tests;
4. Python compilation for changed scripts;
5. `git diff --check`;
6. stale-reference search for renamed/removed cards and superseded rule text;
7. MSE export using `MSE_CLI` loaded from `.env`, writing to a temporary directory outside the `.mse-set` folder;
8. confirm expected exported PNG count, then delete all temporary export/cache files.

Never hardcode `mse.exe` or `mse.com`. Load `MSEConfig` from `launcher/mse_config.py`. If `.env` is absent or invalid, instruct the user to run `python launcher/setup_mse.py`; do not guess an installation path.

Do not claim GUI save compatibility from CLI export alone. Report GUI Save/Save As as manual verification when it cannot be performed interactively.

## Final report

Report:

- MSE files treated as source of truth;
- card-conflict decisions (`restore-rule` versus `accept-card-change`);
- path of the generated **rule-proposals Markdown** under `docs/ADR/proposed/` (or explicit `No general rule proposals.`);
- counts and IDs of `D*` / `R*` items in that file;
- grammar/style fixes that preserved mechanics;
- docs/scripts/tests/assets synchronized;
- accepted, revised, and rejected rule candidates after apply;
- structural/test/export results;
- any manual GUI verification still required.

## Never

- Never overwrite direct MSE edits by regenerating from stale docs.
- Never update a disputed rule before its rule-proposals review file is complete and applied.
- Never edit a general project rule directly; every pattern destroyer or pattern maker must appear in the rule-proposals Markdown and be applied only through `update-rules`.
- Never keep rule proposals only in chat: if any `D*` or `R*` exists, the Markdown file is mandatory.
- Never split one run’s destroyers and makers into multiple review files.
- Never place archetype-specific card facts in `docs/rules/TEMPLATING.md`.
- Never silently treat a semantic discrepancy as grammar cleanup.
- Never leave a card-conflict ledger or rule-review file partially answered.
- Never update only the card doc while leaving generators or tests stale.
- Never leave orphan `include_file`, card, image, or numbering references.
- Never create backups, exports, or temporary files inside an active `.mse-set` folder.
- Never commit the local `.env`, MSE installation paths, or generated temporary exports.

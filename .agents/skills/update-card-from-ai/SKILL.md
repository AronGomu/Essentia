---
name: update-card-from-ai
description: Add or update already designed YGO-x-MTG cards from user-supplied Markdown card blocks, without editing through the Magic Set Editor UI. Uses the named .mse-set project as the destination, treats the supplied card fields and effects as provisional source data, interviews the user about rule conflicts and inferred new or evolved rules, then synchronizes docs, MSE files, artwork, generators, rules, and tests. Use when the user provides formatted [ADD] or [UPDATE] card definitions and names the MSE project to modify.
compatibility: YGO-x-MTG repository with Python 3 and a configured Magic Set Editor installation for export verification.
metadata:
  project: YGO-x-MTG
---

# Update Card from AI Input

Add or modify converted cube cards directly from structured Markdown supplied by the user. Do **not** require the user to open Magic Set Editor. The user must name the target MSE project and provide one or more `[ADD]` or `[UPDATE]` card blocks.

The supplied converted card data is the **provisional source of truth** for card mechanics. Preserve it unless the user explicitly classifies a difference as an input error. Correct English spelling, grammar, established vocabulary, and MSE markup, but never silently redesign the mechanic.

Only folder-form projects in mutable lifecycle stages may be destinations; default to `cards_mse/00_drafts/*/*.mse-set/`. Never edit `02_alpha`, `04_beta`, `06_released`, or generated aggregate projects. Draft PDFs are forbidden.

This workflow has two mandatory interview loops, matching `fix-mse-cards`:

1. **Conflict interview** — every difference between supplied card data and established rules must be classified.
2. **Rule-candidate interview** — every inferred new or evolved rule must be accepted, rejected, or revised.

Use `AskUserQuestion` for every classification or confirmation. Do not replace a picker with numbered prose. Never auto-decide interview answers, even if one answer looks obvious, unless the harness explicitly forbids interaction; in that case, stop with a complete unresolved-question ledger rather than changing disputed cards or rules.

This skill differs from the other project workflows:

- Use `add-ygo-card` when the user gives only an original Yu-Gi-Oh! card name and wants the agent to research and design the conversion.
- Use `fix-mse-cards` when the user edited MSE files manually and those file edits are the source of truth.
- Use this skill when the user already designed cards in Markdown and wants those definitions applied to docs and a specified MSE project.

## Accepted input

Require a target MSE project filename or path plus card blocks shaped like:

```markdown
MSE file: 03_YGO_Non_Archetype_Creatures.mse-set

[UPDATE]

Ash Blossom & Joyous Spring {R}
Creature - Tuner Zombie
0/1

Effect:
(1 - Activated Flash Hard) Discard Ash Blossom; ...

---

[ADD]

New Card {2}{U}
Legendary Creature - Wizard
2/3

Effect:
(1 - Triggered) **On Enter** — ...
```

Accept harmless variations:

- `Effect` or `Effects`;
- `-`, `—`, or a newline between type and subtype;
- `0/1` or `0 / 1`;
- straight or typographic quotes;
- Markdown bold/italic in rules text;
- multiple cards separated by `---`;
- `[ADD]` and `[UPDATE]` in the same request.

Do not support `[REMOVE]` through this skill. Route removals through `fix-mse-cards` or a dedicated removal workflow because assets and generator references require destructive reconciliation.

If the target MSE project is missing, ambiguous, or outside a mutable `cards_mse/` stage, use `AskUserQuestion` to select the intended checked-in `.mse-set` folder. If a card block lacks a mechanic-bearing field (name, cost, type, stats when applicable, or effect section), ask for the missing value before editing.

## Phase 1 — Protect the working tree and resolve destinations

1. Resolve the repository root:

   ```bash
   git rev-parse --show-toplevel
   git status --short
   ```

2. Preserve unrelated changes. Never reset, checkout, clean, or regenerate an entire project over existing work.
3. Resolve the target under `cards_mse/` by exact path or exact `.mse-set` filename.
4. Read completely:
   - target `set` manifest;
   - matching archetype design doc under `docs/` only if mechanics/identity change (no full card text duplication);
   - `docs/rules/TEMPLATING.md`;
   - `docs/RULES.md`;
   - all existing target cards with matching names;
   - 2–3 sibling cards with the same card type/frame;
   - scripts/generators that reference the target project or supplied card names;
   - related tests.
5. Determine the matching docs file from existing card `notes: Source:`, project number/name, and current documentation references. Do not guess if two docs are plausible.

## Phase 2 — Parse card blocks into records

Normalize every block into a record containing:

- operation: `ADD` or `UPDATE`;
- display name;
- mana cost as ordered symbols (`{R}{R}{W}` → `RRW` in MSE);
- super-type;
- subtype(s), preserving English project vocabulary;
- power/toughness when the card is a creature;
- ordered effect lines;
- Markdown bold/italic spans;
- explicitly supplied material/summon line;
- any new keyword or event phrase.

Show a concise parsed summary before editing when input is ambiguous. Do not infer omitted costs, stats, targets, timing, zones, or once-per-turn restrictions from the original Yu-Gi-Oh! card.

### Safe language normalization

Automatically correct mechanical-neutral issues:

- English spelling, agreement, apostrophes, and punctuation;
- `Grave` instead of `graveyard` in card text when project rules require it;
- established English card types/subtypes (`Creature`, `Tuner`, `Zombie`, `Bird`, `Wizard`, `Insect`);
- capitalization of `Deck`, `Grave`, `Link Lvl`, and established event keywords;
- `1 target spell or ability` and similar target agreement;
- Markdown `**keyword**` to MSE `<b>keyword</b>`;
- Markdown `*material line*` to MSE `<i>material line</i>`;
- ability-label separators and em dashes.

Never silently change:

- target versus choose;
- cost versus effect;
- optional versus mandatory action;
- activation timing/speed;
- zone;
- quantity;
- duration;
- per-turn scope (`Soft`, `Hard`, `Hard Linked`);
- card name, cost, types, or stats.

When grammar correction could change mechanics, add it to the difference ledger in Phase 3 and resolve it through the mandatory conflict interview. Do not treat it as a mechanical correction.

## Phase 3 — Compare supplied cards against established rules

Before classifying differences, confirm the complete Phase 1 reads cover:

- `docs/rules/TEMPLATING.md`;
- `docs/RULES.md`;
- matching archetype `CONTEXT.md`, `DESIGN.md`, `RULES.md`, and `KEYWORDS.md` modules;
- 2–3 sibling card files that demonstrate each relevant established pattern;
- any `.script/` generator or updater that names the target project or supplied cards;
- existing tests covering the affected project.

Read any missing item now; do not reread files already captured unless they changed during the workflow.

Compare every parsed record against rules in these categories:

1. domain meaning and game mechanics;
2. keyword definitions and event timing;
3. ability labels (`Static`, `Activated`, `Triggered`, `Soft`, `Hard`, `Hard Linked`);
4. summon/material syntax;
5. zones and project vocabulary (`Grave`, Extra Deck, field, etc.);
6. card type, Link Lvl, frame, and stylesheet mapping;
7. cost/stat conversion rules;
8. English grammar, spelling, punctuation, and templating;
9. MSE file structure and reference integrity;
10. docs/generator/test assumptions that would disagree with the supplied card data.

Before creating the difference ledger, detect every supplied effect that would perform a normally illegal Summon, especially from the Sideboard without the required invocation method. For each affected card, call `AskUserQuestion` and ask whether to add `ignoring the restrictions of Summon`. Offer exactly: **Add the explicit permission**, **Keep Summon restrictions**, and **Send a message** with custom text enabled. Never infer or insert the bypass silently. The permission makes the Summon legal but does not make it a proper summon. Record the answer in the ledger.

Create a **difference ledger**. Each entry must contain:

- stable ID (`D1`, `D2`, ...);
- supplied-card evidence identified by card, field, and quoted wording/value;
- conflicting rule or convention with `path:line`;
- concise explanation of the semantic difference;
- affected cards/files;
- proposed interpretations: `user error` or `rules need update`.

Do not classify pure grammar/style errors as rule conflicts when the intended mechanic is unambiguous; queue those for Phase 7. If wording could change targeting, timing, cost, zone, optionality, frequency, resolution, card name, type, material, color, or stats, it is a semantic conflict and must enter the ledger.

## Phase 4 — Mandatory conflict interview

Interview every unresolved difference. Prefer one cohesive round containing several independent questions, but keep option labels and evidence short enough to understand.

For each ledger entry call `AskUserQuestion` with:

- the difference ID and affected card/rule;
- the supplied Markdown wording/value;
- the current documented rule;
- the concrete consequence of each answer;
- options:
  - **User error — restore the documented rule**
  - **Rules need update — keep the supplied value as source of truth**

If the user chooses **User error**:

- mark the ledger entry `restore-rule`;
- correct only the conflicting value in the normalized record before writing docs or MSE;
- do not change the governing rule because of this entry.

If the user chooses **Rules need update**:

- mark the entry `update-rule`;
- preserve the supplied mechanic;
- draft the smallest general rule change that explains it.

After each round, show unresolved IDs and continue interviewing. Phase 4 ends only when every ledger entry has an answer. Never infer an unanswered choice from another answer.

## Phase 5 — Update established rules from answered conflicts

For every `update-rule` decision:

1. Update `docs/rules/TEMPLATING.md` with the accepted domain rule, using existing terminology and placing it beside the closest related rule.
2. Update `docs/RULES.md` when change concerns card syntax, keywords, timing, types, summoning, frames, or templating.
3. Modify or remove old statements that directly contradict the accepted rule; do not append a second contradictory paragraph.
4. Include scope and exclusions. For example, define whether a trigger is equivalent to `On Enter`, when it does not fire, and which card types it applies to.

For every `restore-rule` decision, leave rule docs unchanged unless they are ambiguous and use the corrected normalized record in all later phases.

After all conflict decisions are applied, the reconciled normalized record becomes the final source of truth for the remaining phases.

## Phase 6 — Resolve ADD versus UPDATE

### UPDATE

1. Match by exact MSE `name:` first, then normalized punctuation/case, then docs heading.
2. If no unique card matches, ask the user to choose; never turn a missing update into an add silently.
3. Preserve the existing artwork and non-content metadata unless the input explicitly replaces them.
4. Replace cost, types, stats, and rule text with the reconciled normalized record.
5. If the display name changes:
   - rename the `card <slug>` file;
   - update the manifest `include_file:`;
   - update archetype references and all scripts/maps/tests using old display name;
   - preserve existing image files unless their names are intentionally normalized.

### ADD

1. Fail if an exact or normalized-name card already exists; ask whether the operation should become `UPDATE`.
2. Create `card <safe lowercase slug>` using sibling MSE field order and the frame dictated by card type in project rules.
3. Add a sorted `include_file:` entry.
4. Update matching archetype doc only if addition introduces or changes reusable archetype identity, mechanics, exceptions, or design rules. Never add card block.
5. Artwork:
   - prefer a user-supplied local image path or URL if included;
   - otherwise use YGOPRODeck only to discover cropped artwork by card name;
   - prefer `card_images[0].image_url_cropped`, falling back to the full image;
   - store the source illustration under `original_images/<card_type>/<official_card_name>.jpg`, using the same card-type folder and Windows-safe official-name convention as the matching `original_cards/<card_type>/<official_card_name>.md` record;
   - create the resized/imported copy under the target project's `mse_images/` folder and point the MSE card only to that copy;
   - never overwrite another card's image number.
6. If artwork cannot be resolved unambiguously, keep the new card work pending and ask the user rather than inserting a broken image reference.

Do not invoke `fetch-original-ygo-card` merely to second-guess supplied mechanics. The user has already designed the conversion. It may be used only when the user explicitly asks to verify original Yu-Gi-Oh! identity/data.

## Phase 7 — Write canonical MSE cards

For each record, update English canonical MSE card. Numbered docs must not duplicate card-by-card values.

### MSE representation

- Preserve MSE indentation and field order.
- Cost contains symbols without braces.
- Use `<word-list-type-en>`, `<word-list-race-en>`, and `<word-list-class-en>` consistently with siblings.
- `rule_text` contains no blank lines.
- Convert supplied Markdown `**...**` to `<b>...</b>` and `*...*` to `<i>...</i>`.
- Keep `flavor_text` only according to sibling conventions; never invent flavor text.
- Update `time_modified` without rewriting unrelated metadata.

If card changes reusable archetype behavior, update only relevant archetype rule/exception in numbered doc. Do not add card heading, cost, type, stats, material line, or full rules text.

After all card edits:

1. Sort `include_file:` entries by visible card name.
2. Renumber every present `card_code_text`, `card_code_text_2`, and `card_code_text_3` field as `001/NNN`, `002/NNN`, etc., retaining each rarity suffix.
3. Ensure `NNN` equals manifest card count.

## Phase 8 — Synchronize regeneration sources and consumers

Search for stale card data:

```bash
rg -n "CARD NAME|OLD NAME|OLD EFFECT FRAGMENT" docs cards_mse .script tests
```

Update:

- batch/generator card lists;
- display-name-to-official-name maps;
- fixtures and consistency tests;
- indexes or docs references;
- updater scripts that could restore old values.

Never run a stale generator against the target project before synchronizing it.

## Phase 9 — Mine final card data for rule candidates

Analyze the reconciled normalized records, resulting MSE cards, and relevant siblings. Find repeated or structurally meaningful patterns that are not yet captured clearly in `docs/rules/TEMPLATING.md`.

A candidate can be:

- a genuinely new keyword or event;
- an evolution/generalization of an existing rule;
- a repeated templating convention;
- a new exception with a clear boundary;
- a frame/type/material mapping;
- a consistent grammar or zone convention;
- an invariant revealed by several supplied or sibling cards.

Do not propose as a rule:

- a one-card mechanic with no reusable design implication;
- a simple typo correction;
- a fact already stated clearly in current docs;
- an accidental pattern created only by blank or incomplete cards.

Create a **rule-candidate ledger** with IDs (`R1`, `R2`, ...), evidence identified by card/field and resulting MSE `path:line`, current rule if evolving one, proposed wording, scope, and exceptions.

If no candidates exist, explicitly report that and proceed to tests.

## Phase 10 — Mandatory rule-candidate interview

For each candidate call `AskUserQuestion` with:

- candidate ID;
- supporting card examples;
- exact proposed rule text;
- whether it is new or evolves an existing rule;
- options:
  - **Validate — add/update the rule**
  - **Reject — do not document this as a rule**
  - **Needs revision — I will provide updated rule text**

For **Needs revision**, ask a free-form follow-up for the replacement wording, then show that wording back through `AskUserQuestion` with **Validate revised rule** / **Revise again** / **Reject**. Continue until resolved.

Apply validated/revised rules to `docs/rules/TEMPLATING.md` and, when relevant, `docs/RULES.md`. Record rejected candidates in the final report only; do not add them to project docs.

After applying answers, rescan the final card data against the final rules. Any new contradiction returns to Phase 4.

## Phase 11 — Tests

Add or update project tests that assert:

- manifest includes resolve exactly once;
- card filename and `name:` agree after rename/add;
- canonical MSE fields contain expected name, cost, type, stats, and key rule fragments;
- image references exist;
- card numbering total matches manifest count;
- removed/old names are absent from regeneration sources;
- validated new keywords are documented and rejected candidates remain absent.

Run `python .script/lint_mse_card_style.py` after every MSE update; require pass before export. Then run complete unittest suite and Python compilation for changed scripts.

## Phase 12 — MSE verification

Load MSE paths from the gitignored `.env` through `launcher/mse_config.py`. Never hardcode a local executable path.

1. Verify all manifest/card/image references structurally.
2. Run `git diff --check`.
3. Export the entire target project with `MSE_CLI --export-images` to a temporary directory outside the `.mse-set` folder.
4. Require exit code `0` and an exported PNG count equal to the manifest card count.
5. Delete temporary exports and MSE cache/temp files created in the repository root.
6. Inspect updated card renders when image analysis is available, especially text overflow and missing symbols.

CLI export does not prove GUI Save/Save As. Report that limitation rather than claiming full GUI validation.

## Final response

Respond in English with:

- target docs and MSE project;
- cards added and updated;
- conflict decisions (`restore-rule` versus `update-rule`);
- grammar/templating normalizations made;
- rule docs/generators/tests synchronized;
- accepted, revised, and rejected rule candidates;
- artwork paths for additions;
- test and export results;
- any unresolved artwork or manual GUI verification.

## Never

- Never use this skill without a user-named MSE destination.
- Never invent missing mechanics from memory.
- Never update a disputed card or rule before its conflict interview is resolved.
- Never silently treat a semantic discrepancy as grammar cleanup.
- Never leave an interview ledger partially answered.
- Never silently convert a failed UPDATE match into ADD.
- Never overwrite direct MSE edits outside the named cards.
- Never duplicate card-by-card values into docs.
- Never leave stale generator mappings that can restore old content.
- Never create backups or exports inside an active `.mse-set` folder.
- Never commit `.env`, machine paths, temporary exports, or API responses.

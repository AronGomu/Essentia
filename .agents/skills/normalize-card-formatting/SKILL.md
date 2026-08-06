---
name: normalize-card-formatting
description: Normalize existing Essentia card statistics and rules text to current English templating and formatting rules, using an MSE card file or an entire .mse-set project as input, then synchronize affected archetype rules without duplicating card values, validate MSE integrity, and export renders. Use when the user asks to update, refresh, reformat, normalize, or bring MSE card text up to current rules without redesigning cards.
compatibility: YGO-x-MTG repository with Python 3, Pillow, and a configured Magic Set Editor installation for render validation.
metadata:
  project: YGO-x-MTG
---

# Normalize Card Formatting

Bring existing cards up to the repository's **current** wording, grammar, typography, statistics representation, and MSE markup conventions. This is a formatting and synchronization workflow, not a card-design or rule-evolution workflow.

The supplied MSE save data is the source of truth for mechanics. Preserve targets, costs, optionality, timing, zones, quantities, durations, frequency limits, names, colors, types, and numeric values unless a current project rule makes a correction mechanical and unambiguous.

Use the neighboring workflows instead when appropriate:

- `fix-mse-cards` for user-authored MSE changes that may intentionally alter mechanics or project rules;
- `update-card-from-ai` for `[ADD]` or `[UPDATE]` Markdown card definitions;
- `add-ygo-card` for a new conversion from an original Yu-Gi-Oh! card name.

## Accepted input and scope

Accept one checked-in input beneath `cards_mse/`:

- `cards_mse/00_drafts/<group>/<project>.mse-set/card <slug>`: normalize that card only;
- `cards_mse/00_drafts/<group>/<project>.mse-set/set`: normalize every `include_file:` card;
- `cards_mse/00_drafts/<group>/<project>.mse-set/`: normalize every `include_file:` card.

A project means **all cards included by its manifest**. Do not silently limit project scope to modified cards.

If the user omits a path, use an exact uniquely named project/card from the request. Otherwise, select a unique modified MSE card/project from `git status --short`; if there is no unique safe scope, stop without editing and report the candidate paths.

Canonical projects are folder-form `.mse-set` saves, not zip archives. Do not edit an archive in place. Never include nested backups, diagnostic projects, or export folders as cards. Editable scope is limited to `00_drafts` and packages with `status: open` under `01_alpha`/`02_beta`/`03_release`. Reject locked packages and every generated `_all_cards.mse-set` aggregate.

## Phase 0 — Protect the working tree

1. Resolve the repository root and inspect existing work:

   ```bash
   git rev-parse --show-toplevel
   git status --short
   git diff --name-status -- cards_mse docs
   ```

2. Record exact input, parent project, manifest, scoped cards, and owning numbered archetype document.
3. Preserve unrelated changes. Never reset, checkout, clean, or regenerate another project.
4. Read MSE text with `utf-8-sig` semantics and preserve its BOM/newline convention. Do not create backups inside an active `.mse-set` folder.

## Phase 1 — Load the complete current formatting contract

Read these files **completely on every invocation**, because this skill exists specifically to apply their latest state:

1. `docs/rules/TEMPLATING.md`;
2. `docs/RULES.md`;
3. the matching archetype `CONTEXT.md`, `DESIGN.md`, `RULES.md`, and `KEYWORDS.md` modules;
4. two or three complete sibling card files demonstrating each relevant card type/frame;
5. `CONTEXT.md` under `MSE_ROOT`, if it exists, after loading `MSEConfig` from `launcher/mse_config.py`;
6. any project-specific tests or generator/synchronizer that can rewrite the scoped cards.

Treat `docs/RULES.md` as the index. Follow its links to the single owning rule module; use `docs/rules/TEMPLATING.md` for syntax/PSCT and `docs/KEYWORDS.md` for keyword taxonomy. Apply rules dynamically from current files. If modules contradict, do not guess or rewrite mechanics: preserve affected text and report `path:line` evidence.

Build a short rules checklist before editing. It must cover every applicable current rule for:

- English grammar, spelling, apostrophes, punctuation, and compact quantities;
- English card names, types, and subtypes;
- quoted card/archetype references;
- ability numbering, labels, timings, and frequencies;
- costs, alternative costs, casting conditions, and evergreen keywords;
- bold event/action keywords and em-dash placement;
- canonical vocabulary and zones such as `MV`, `Deck`, `Grave`, and `Sideboard`;
- material/summon lines and Extra Deck types;
- MSE markup, field order, frame selection, image fields, and collection numbers;
- casting-cost and power/toughness representation.

## Phase 2 — Inventory and parse the MSE source

For project scope, parse `include_file:` entries in manifest order and require every target to exist exactly once. For card scope, require the card to belong to its parent manifest exactly once.

Read every scoped card completely and capture:

- file path and `name`;
- `casting_cost`;
- stylesheet/frame;
- `super_type` and `sub_type`;
- material/invocation line;
- every `rule_text` line and ability label;
- `power` and `toughness`;
- rarity and every present `card_code_text*` field;
- image fields;
- `notes: Source:` and owning archetype document.

Use `notes: Source:` first to identify owning archetype document, then numeric project prefix and current documentation index. Numbered docs contain archetype identity, mechanics, exceptions, and design philosophy only; they do not mirror card-by-card values.

Do not invent fields for incomplete placeholder cards. Record them as skipped/incomplete and continue with the remaining cards.

## Phase 3 — Normalize without redesigning

Correct each complete scoped card according to the live Phase 1 checklist.

### Safe automatic corrections

Apply formatting-neutral corrections such as:

- English spelling, agreement, apostrophes, and punctuation;
- Arabic digits for rule quantities;
- canonical abbreviations and capitalization;
- typographic quotes around mechanically referenced card or archetype names;
- `(x - Type)` labels and sequential ability numbers;
- valid `Static`, `Triggered`, `Activated Sorcery`, `Activated Flash`, `Resolution`, `Soft`, `Hard`, and `Hard Linked` forms;
- costs/conditions before evergreen keywords, and evergreen keywords before numbered abilities;
- bold current keywords and event-keyword em dashes;
- current material-line wording and italics;
- removal of blank lines from MSE `rule_text`;
- valid `<b>...</b>` and `<i>...</i>` MSE markup;
- MSE mana costs without braces;
- MSE `power`/`toughness` fields;
- current type wrappers and frame fields when card's existing supertype determines them unambiguously.

For statistics, normalize MSE representation only. Do **not** rebalance a card or recompute numeric P/T merely because generic ATK/DEF conversion formula exists: documented minimum and intentional adaptations make that a design decision. Recompute only when user explicitly asks for conversion validation and an authoritative `original_cards/` record plus current rules yield one unambiguous value with no applicable exception.

### Semantic boundary

Never silently change:

- targeting versus non-targeting selection;
- a cost into an effect, or an effect into a cost;
- optional versus mandatory text;
- trigger event, activation timing, or spell speed;
- source/destination zone;
- quantity, duration, or resolution order;
- once-per-turn scope;
- card name, mana value, color, type, material requirement, or numeric stats;
- the definition or behavior of a keyword.

If a proposed grammar/templating correction crosses this boundary, leave the original mechanic unchanged and add it to an unresolved semantic ledger. This skill does not evolve `docs/rules/TEMPLATING.md` or `docs/RULES.md`; route those entries through `fix-mse-cards`.

If a scoped effect would perform a normally illegal Summon, especially from the Sideboard without the required invocation method, call `AskUserQuestion` for that card before editing and ask whether to add `ignoring the restrictions of Summon`. Offer exactly: **Add the explicit permission**, **Keep Summon restrictions**, and **Send a message** with custom text enabled. Never infer or insert the bypass silently. The permission makes the Summon legal but does not make it a proper summon.

Preserve unrelated metadata and artwork. Update `time_modified` only on cards whose content changed.

## Phase 4 — Synchronize consumers without duplicating cards

MSE remains card source of truth. Do not add card names, costs, types, stats, material lines, or rules text to numbered docs.

Update owning archetype document only when normalized text changes reusable archetype identity, mechanic wording, exception, or design rule. Route general rule changes through `fix-mse-cards`; formatting-only card changes normally require no docs edit.

Search English docs, canonical MSE files, `.script/`, `mse/`, and tests for stale old text. Update generators/synchronizers or fixtures that would otherwise restore old formatting. Do not run stale generator before synchronizing it.

For project scope, sort manifest `include_file:` entries alphabetically by visible MSE `name:` and renumber every present `card_code_text`, `card_code_text_2`, and `card_code_text_3` as `001/NNN`, preserving rarity suffixes. For card scope, validate existing order/numbers; fix them project-wide only when they violate current mandatory convention.

## Phase 5 — Structural validation

Validate the complete parent project, even for one-card scope:

- every `include_file:` resolves exactly once;
- no included card is missing and no accidental duplicate card file exists;
- every non-empty `image`, `image_2`, `mainframe_image*`, `symbol`, and `masterpiece_symbol` reference resolves;
- card image fields follow the current project image convention;
- no backup, nested `.mse-set`, diagnostic, cache, or export folder can poison GUI save behavior;
- collection totals and positions agree with manifest order;
- owning archetype document remains consistent without card-value duplication;
- no stale superseded wording remains in a regeneration source.

Then run:

```bash
python .script/lint_mse_card_style.py
python -m unittest discover -s tests
git diff --check
```

The card-style linter is mandatory after every MSE update and must pass before export.

Compile any changed Python generators/synchronizers with `python -m py_compile <paths>`.

## Phase 6 — Prove MSE export and update renders

Load executable paths only through `MSEConfig.load()` from `launcher/mse_config.py`. Never hardcode a local MSE path. If configuration is missing or invalid, report `python launcher/setup_mse.py` as the required blocker and do not claim export success.

1. Export to a temporary directory **outside** the active `.mse-set` folder.
2. Require a direct MSE CLI process exit code of `0` and a decodable PNG count equal to:
   - `1` for an isolated single-card export; or
   - the manifest count for a project export.
3. If the CLI reports `3221225477` / `0xC0000005`, follow the mono-card diagnostic procedure in `docs/rules/TEMPLATING.md` and retry directly from the shell before declaring corruption.
4. Confirm every PNG opens successfully and inspect the changed renders when image analysis is available for missing art/symbols and text overflow.
5. Copy successful final renders into the project's canonical `render/` folder and name each image from the exact MSE `name:` value. For project scope, remove only stale generated render images proven not to correspond to a current card. For card scope, replace only that card's render.
6. Delete temporary exports and caches; never leave them inside the project.

Structural validation plus a successful direct export proves automated readability/renderability. It does **not** prove GUI Save/Save As compatibility. If GUI automation is available, open the project with `MSEConfig.executable` and perform a real Save/Save As. Otherwise, report that exact manual check as remaining instead of claiming complete non-corruption.

## Phase 7 — Defer print work

Do not create PDFs. Printing is a separate one-off step run on demand with `.script/generate_print_pdfs.py`; output is ignored and never tracked in a package. Temporary diagnostic renders must be deleted after validation.

## Final response

Respond in English with:

- input path and whether scope was one card or the full project;
- cards normalized and incomplete cards skipped;
- formatting, grammar, markup, and stat-representation fixes;
- MSE, affected archetype docs, and generator files synchronized;
- unresolved semantic ledger entries, if any;
- structural checks, tests, and `git diff --check` results;
- MSE export count and render path;
- whether GUI Save/Save As was verified or remains manual.

## Never

- Never redesign cards under a formatting request.
- Never rewrite current project rules from patterns found in cards.
- Never use docs to overwrite newer MSE mechanics.
- Never duplicate card-by-card values into docs.
- Never edit archetype docs for formatting-only card changes.
- Never run stale generators over the input.
- Never leave broken includes, image references, numbering, or stale renders.
- Never put backups, temporary projects, or validation exports inside an active `.mse-set` folder.
- Never hardcode `.env` values or commit machine-specific MSE paths.
- Never claim GUI save compatibility from CLI export alone.

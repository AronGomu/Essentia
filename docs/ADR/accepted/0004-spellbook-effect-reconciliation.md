# Rule review — Spellbook effect-text diff reconciliation

- Status: APPLIED
- Review ID: 2026-07-19-13-ygo-spellbook-effect-diff-rule-proposals
- Generated: 2026-07-19
- Applied: 2026-07-19
- Normalize after approval: false
- Source request: fix-mse-cards — re-analyze `HEAD` versus direct July 19 edits in `cards_mse/00_drafts/13_spellbook/13_YGO_Spellbook.mse-set/`; preserve frozen French archive

## How to complete this review

Answer directly in this Markdown file. For every item, replace `TODO` with exactly one decision:

- `ACCEPT` — apply the proposed rule;
- `REJECT` — keep the current rule;
- `REVISE` — use the text in `Final wording`.

For `REVISE`, write the replacement rule under `Final wording`. Use `Notes` for rationale or implementation constraints. Do not remove IDs, questions, or evidence. When finished, change `Status` to `READY`, save the file, and tell the agent `continue`.

## Effect-diff summary

The direct save translates 16 cards to English and also changes mechanics or reusable syntax. Translation, MSE-generated `<error-spelling:...>` markup, malformed auto-format tags, spacing, capitalization, and punctuation are mechanical cleanup—not rule decisions. Card-only balance/effect changes remain provisional MSE truth unless an item below identifies a reusable conflict.

Repeated effect-text changes:

- **Book Affinity** disappears from High Priestess and Justice; **Spell Affinity** disappears from Judgment.
- Ten Spellbook Sorceries change `(1 - Resolution)` to `(1 - Resolution Hard)`.
- Several effects omit zone ownership (`from Grave`, `from exile`, `from Deck`, `into hand`).
- Fate and Miracles introduce compact ranges (`1-3`, `0-2`).
- Justice introduces **On End Step**; Star Hall removes `Your` from **On Your Cast**.
- Knowledge moves sacrifice/discard from an additional casting cost into its numbered Resolution.
- Master copies targeted text and resolves it without casting; Life gates Reanimate on exact selected count.

## Ruling contradictions — pattern destroyers

### D1 — Affinity keywords become printed, card-selective mechanics

- Scope: archetype (`docs/13_spellbook/RULES.md`)
- Existing rule: **Book Affinity** applies to “Spellbook” or “Prophecy” creatures and **Spell Affinity** applies to “Spellbook” Sorceries (`docs/13_spellbook/RULES.md:18-22`).
- Conflicting MSE evidence: High Priestess now prints only a reveal-3 **Alternative Cost** (`card high priestess of prophecy:18-20`); Justice prints no affinity (`card justice of prophecy:18`); Judgment prints no affinity (`card spellbook of judgment:18`). Magician still prints **Book Affinity** and ten other Sorceries still print **Spell Affinity**.
- Why this destroys a pattern: Card identity no longer automatically grants its documented affinity.
- Question: Are Spellbook affinity keywords opt-in mechanics that apply only when printed on a card?
- Impacted cards/files: High Priestess of Prophecy; Justice of Prophecy; Spellbook of Judgment; Spellbook Magician of Prophecy; ten Spell Affinity Sorceries; `docs/13_spellbook/RULES.md`; tests.
- Proposed resolution: Define **Book Affinity** and **Spell Affinity** by effect and eligible card type, but state that neither is automatically granted by name or type; a card has the affinity only when its MSE rules text prints the keyword.
- Side effects: Preserves direct removals without listing card-by-card exceptions in archetype docs.
- Decision: REVISE
- Final wording: Remove **Book Affinity** as a keyword. A card that used **Book Affinity** prints the keyword's original alternative-cost text in full instead. Do not grant that alternative cost from card identity. **Spell Affinity** remains a printed, opt-in keyword that applies only to cards whose rules text includes it.
- Notes: User rejected retaining Book Affinity because its one remaining use does not justify an archetype keyword.

### D2 — `Hard` frequency appears on Resolution abilities

- Scope: general ability-label syntax
- Existing rule: `Soft`, `Hard`, and `Hard Linked` frequencies are defined for Activated and Triggered abilities; Resolution describes what a Sorcery or Instant does when it resolves (`docs/CONTEXT.md:102-171`; `docs/RULES.md:70-113`).
- Conflicting MSE evidence: Eternity, Fate, Judgment, Knowledge, Life, Miracles, Power, Secrets, Master, and Wisdom print `(1 - Resolution Hard)` (`card *:18-20`). Only Library retains `(1 - Resolution)`.
- Why this destroys a pattern: A resolving spell does not activate a named ability under current frequency rules; `Hard` has no documented enforcement point on Resolution.
- Question: May a Resolution ability carry `Hard`, and if so, what game action is limited once per card name each turn?
- Impacted cards/files: Ten Spellbook Sorceries; global ability-label rules; tests.
- Proposed resolution: Do not use frequency suffixes on `Resolution`. If a spell itself must be limited once per card name each turn, print a separate unnumbered casting restriction with explicit wording; otherwise use `(1 - Resolution)`.
- Side effects: Mechanical label cleanup unless a once-per-name restriction was intended; that intent must use explicit card text.
- Decision: REVISE
- Final wording: `Hard` may suffix a `Resolution` ability. `Resolution Hard` means the card can be activated only once per turn, and all copies of cards with the same name share that once-per-turn limit.
- Notes: Preserve `Resolution Hard` on the direct MSE edits.

### D3 — Knowledge moves an additional cost into resolution

- Scope: general PSCT cost/effect boundary + Spellbook card mechanic
- Existing rule: Costs are not numbered effects and must appear before numbered abilities; instructions inside `(1 - Resolution)` happen during resolution (`docs/CONTEXT.md:126-141`).
- Conflicting MSE evidence: Old Knowledge paid `sacrifice 1 “Spellbook” creature or discard 1 “Spellbook”` as an additional casting cost, then drew 2. New text places `Sacrifice 1 “Spellbook” OR discard 1 “Spellbook”; Draw 2` inside `(1 - Resolution Hard)` (`card spellbook of knowledge:18-20`).
- Why this destroys a pattern: Opponents can now respond before the sacrifice/discard choice, and failure at resolution can change whether cards are drawn.
- Question: Is sacrifice/discard intentionally part of Knowledge's resolution rather than an additional casting cost?
- Impacted cards/files: Spellbook of Knowledge; PSCT cost rules; tests.
- Proposed resolution: Preserve direct MSE mechanic as resolution only if intentional; template it as `(1 - Resolution) Sacrifice 1 “Spellbook” or discard 1 “Spellbook”; draw 2 cards.` Do not call either action an additional cost.
- Side effects: Material timing change from previous card; no payment occurs when cast.
- Decision: ACCEPT
- Final wording:
- Notes: Follow Yu-Gi-Oh! PSCT ordering: state the cost first, write `;`, then state the effect resolution.

### D4 — Fate removes targets and mandatory non-targeting disclaimer

- Scope: general targeting syntax
- Existing rule: Non-targeting effects must explicitly state `This effect does not target.` (`docs/CONTEXT.md:471`).
- Conflicting MSE evidence: Fate modes now say `Flip 1 creature`, `Return 1 nonland permanent`, and `Exile 1 nonland permanent`, with neither `target` nor disclaimer (`card spellbook of fate:20-23`).
- Why this destroys a pattern: Selection moves to resolution, but current project rule requires a disclaimer to make that distinction explicit.
- Question: May clear non-targeting selectors omit `This effect does not target.`?
- Impacted cards/files: Spellbook of Fate; global targeting rule; future non-targeting mode effects; tests.
- Proposed resolution: A selector without `target` chooses on resolution. Require `This effect does not target.` only when omission leaves genuine ambiguity; Fate's numbered non-targeting modes need no disclaimer.
- Side effects: Shorter card text; targeted effects must still use `target` before `;`.
- Decision: ACCEPT
- Final wording:
- Notes:

### D5 — Star Hall uses bare `On Cast` without required scope

- Scope: general event-keyword syntax + Spellbook card mechanic
- Existing rule: **On Cast** is a family requiring **On Your Cast**, **On Opponent's Cast**, or **On Any Cast** (`docs/CONTEXT.md:252-258`).
- Conflicting MSE evidence: Star Hall changes **On Your Cast “Spellbook”** to bare **On Cast “Spellbook”** (`card spellbook star hall:19`).
- Why this destroys a pattern: Bare **On Cast** does not identify whose spell triggers the ability.
- Question: Did removing `Your` intentionally expand Star Hall to any player's “Spellbook” cast?
- Impacted cards/files: Spellbook Star Hall; On Cast rules; tests.
- Proposed resolution: Keep explicit scope. Use **On Any Cast “Spellbook”** if opponents' casts count; otherwise restore **On Your Cast “Spellbook”**. Record chosen wording in `Final wording` with `REVISE` if proposal's any-player interpretation is wrong.
- Side effects: Any-player wording lets opponents add counters to Star Hall.
- Decision: REVISE
- Final wording: Remove `Your` from every controller-scoped `On Your X` keyword. Unqualified `On X` means the event caused by or concerning the card's controller and cards they control. Use `On Opponent X` for an opponent as source and `On Any X` for every player. Apply the same default to personal zones and costs: unqualified `hand`, `Deck`, `Grave`, and `exile` mean your corresponding zone; specify `opponent` or `any` when another scope applies.
- Notes: Star Hall remains `On Cast “Spellbook”`; it counts only its controller's casts.

### D6 — Judgment counts cards `played` instead of spells `cast`

- Scope: general game-action vocabulary + Spellbook card mechanic
- Existing rule: Spell events use `cast`; **On Cast** triggers before a spell resolves. `played` is not defined as a project action (`docs/CONTEXT.md:252-260`).
- Conflicting MSE evidence: Judgment counts `the number of non-creature “Spellbook” played this turn` (`card spellbook of judgment:18`).
- Why this destroys a pattern: `played` can be read as including lands or cards put directly onto the field, while `cast` counts spells.
- Question: Should Judgment count only non-creature “Spellbook” spells cast this turn?
- Impacted cards/files: Spellbook of Judgment; cast-event vocabulary; tests.
- Proposed resolution: Reserve `cast` for spells and replace `played this turn` with `cast this turn`. Use a different explicit action when cards put directly onto field must count.
- Side effects: Excludes uncast cards and lands unless separately stated.
- Decision: ACCEPT
- Final wording:
- Notes:

## New possible rules — pattern makers

### R1 — Controller-zone shorthand for unqualified zones

- Scope: general compact card-text syntax
- Evidence: New text repeatedly omits possessives: Library uses `from Deck`, `into hand`, and `into Deck` (`card spellbook library of the crescent:20`); Eternity uses `from exile` (`card spellbook of eternity:20`); Fate and Master use `from Grave` (`card spellbook of fate:20`, `card spellbook of the master:20`); Tower uses `from Deck` (`card the grand spellbook tower:25`).
- Existing rule: Zone names are standardized, but no rule defines the owner/controller of an unqualified Deck, hand, Grave, or exile zone.
- Question: Should unqualified personal zones default to the effect controller's corresponding zone?
- Proposed rule: In compact card text, unqualified `hand`, `Deck`, `Grave`, and `exile` mean the corresponding zone owned by or associated with the effect's controller. Write `opponent's` or another player's zone explicitly. Retain `your` whenever omission could make source, destination, or target ownership ambiguous.
- Boundary and exceptions: Battlefield/field is shared and does not use this shorthand. `target ... from Grave` may need explicit ownership when opponents' cards could legally be targeted.
- Impacted cards/files: Library, Eternity, Fate, Master, Tower; global zone conventions; tests.
- Side effects: Saves space but creates a project-specific default unlike normal Magic prose.
- Decision: ACCEPT
- Final wording:
- Notes: Goal is shortest clear card text.

### R2 — `On End Step` event keyword

- Scope: general event keyword
- Evidence: Justice introduces `<b>On End Step</b>` (`card justice of prophecy:18`). **On Upkeep** already uses controller-default turn scope.
- Existing rule: No compact end-step event keyword is documented.
- Question: Should **On End Step** become the controller-default keyword for beginning of end step?
- Proposed rule: **On End Step** means “At the beginning of your end step.” Specify another player when needed, for example **On Opponent End Step**.
- Boundary and exceptions: Use on permanent triggered abilities. Delayed effects created by resolving a spell use explicit prose and state duration/turn.
- Impacted cards/files: Justice of Prophecy; event-keyword docs; tests.
- Side effects: Adds one reusable event keyword.
- Decision: ACCEPT
- Final wording:
- Notes:

### R3 — Compact inclusive numeric ranges

- Scope: general compact quantity syntax
- Evidence: Fate changes `up to 3` to `1-3`; Miracles changes `up to 2` to `0-2` (`card spellbook of fate:20`; `card spellbook of miracles:20`).
- Existing rule: Quantities use Arabic numerals, but range punctuation and minimum-selection meaning are not defined.
- Question: Should card text use compact inclusive numeric ranges?
- Proposed rule: Write inclusive ranges with an en dash: `1–3` requires at least 1 and allows at most 3; `0–2` allows none. Prefer `up to 2` when normal Magic wording is clearer and no downstream effect depends on the exact selected count.
- Boundary and exceptions: Never use a hyphen-minus for ranges. A change from `up to 3` to `1–3` is mechanical because it removes zero as an option.
- Impacted cards/files: Fate; Miracles; compactness rules; tests.
- Side effects: Requires explicit confirmation of minimum quantities during card reconciliation.
- Decision: REVISE
- Final wording: Write inclusive numeric ranges with an en dash: `1–3` requires at least 1 and allows at most 3; `0–2` allows none. Always prefer compact dash ranges over `up to N` when the same bounds can be expressed as `0–N`. Never use a hyphen-minus for a range.
- Notes: Always prefer dash range notation.

### R4 — Copy targeted rules text and resolve without casting

- Scope: general reusable process
- Evidence: Master changes from choosing a card to targeting it, then says `copy its text and resolve it` (`card spellbook of the master:20`).
- Existing rule: No project-wide template distinguishes resolving copied rules text from casting a copy.
- Question: Should this become the standard non-cast copy process?
- Proposed rule: When an effect copies a target card's rules text and applies it immediately without casting, identify the target before `;`, then write `copy the target's text and resolve it`. This does not cast a spell, trigger **On Cast**, or pay the copied card's mana/alternative costs.
- Boundary and exceptions: Use `cast the copy` only when a spell copy is actually cast. Additional costs embedded in copied rules text are handled only if the copied text explicitly requires them during resolution.
- Impacted cards/files: Spellbook of the Master; future copy effects; tests.
- Side effects: Different timing and triggers from casting a copy.
- Decision: REVISE
- Final wording: When an effect copies a target card's Resolution ability, identify the target before `;`, then write `copy the target's Resolution effect and resolve it`. This does not cast the copied card. It replaces the copying effect's resolution with the copied card's Resolution effect only; it does not copy casting costs, alternative costs, restrictions, or non-Resolution abilities.
- Notes:

### R5 — Exact-count Reanimate gate with post-success cleanup

- Scope: general reusable PSCT process
- Evidence: Life changes its creature selector to Wizard, retains X selected non-creature “Spellbook”, and adds exile after successful Reanimate (`card spellbook of life:20`).
- Existing rule: **Reanimate** is defined, but exact-count gating and cleanup of co-selected cards are not templated.
- Question: Should exact-count conditional Reanimate use a target-plus-chosen-cards template?
- Proposed rule: Write `Target 1 [creature] in your Grave and choose X [additional cards] from your Grave; Reanimate the target if X equals the target's MV. If you do, [move] the chosen cards.` Only the creature is targeted unless the card explicitly targets every selected object.
- Boundary and exceptions: Use `less than or equal to` when over/under-selection is allowed. State whether failed equality leaves chosen cards in place.
- Impacted cards/files: Spellbook of Life; Reanimate rules; tests.
- Side effects: Clarifies targeting and identifies which cards post-success cleanup moves.
- Decision: REVISE
- Final wording: `Target 1 [creature] MV X in Grave and choose X [additional cards] from Grave; Reanimate it, if you do, exile [move] chosen cards.` Only the creature is targeted unless the effect explicitly targets the additional cards.
- Notes: Personal-zone default removes `your` from final card text.

### R6 — Delayed end-step instruction created during resolution

- Scope: general PSCT timing syntax
- Evidence: Judgment's Resolution begins `At the start of your end step, ...` (`card spellbook of judgment:18`), unlike Justice's permanent **On End Step** trigger.
- Existing rule: No template distinguishes a permanent end-step trigger from a delayed instruction created by resolving a Sorcery.
- Question: Should resolving a spell create a delayed end-step effect with explicit `this turn` wording?
- Proposed rule: When a resolving spell schedules an instruction for the current turn's end step, write `At the beginning of your end step this turn, [effect].` Keep this prose inside `(1 - Resolution)`; do not use **On End Step**, which denotes a permanent's recurring triggered ability.
- Boundary and exceptions: If the effect persists beyond current turn or until a condition, state that duration explicitly.
- Impacted cards/files: Spellbook of Judgment; Justice of Prophecy; timing rules; tests.
- Side effects: Makes Judgment's delayed timing explicit and prevents recurring-trigger interpretation.
- Decision: REVISE
- Final wording: Use `This turn On End Step — [effect]` for a non-recurring delayed end-step ability created by a resolving effect. **On End Step** alone remains the recurring controller-default permanent trigger.
- Notes:

### R7 — Frozen French archive excluded from canonical maintenance

- Scope: general repository/source-of-truth workflow
- Evidence: `French archive (removed)`, `French archive (removed)`, `French archive (removed)`, and `French archive (removed)` contain 652 files pinned by `FRENCH_ARCHIVE_SHA256SUMS`; checksum verification currently reports 652/652 matching. `docs/CONTEXT.md:23` calls them archival exceptions but does not explicitly require maintenance tools to prune them.
- Existing rule: Canonical content is English; frozen French snapshots are non-authoritative.
- Question: Should all canonical maintenance workflows ignore frozen French paths and verify them only by checksum?
- Proposed rule: Treat all files under `French archive (removed)`, `French archive (removed)`, `French archive (removed)`, and `French archive (removed)` as immutable archival snapshots. Exclude them from reconciliation, normalization, generators, rendering, proxy generation, global rewrites, and requirements that every new English file gain a French counterpart. Inspection and checksum verification against `FRENCH_ARCHIVE_SHA256SUMS` are allowed; ordinary work updates English canonical sources only.
- Boundary and exceptions: Replacing archive content requires a separate explicit archival operation and regenerated manifest; normal card/rule work never edits archived bytes.
- Impacted cards/files: `docs/CONTEXT.md`; `docs/RULES.md`; card workflow skills; archive tests; proxy discovery; frozen French trees.
- Side effects: New English docs/reviews no longer mutate or expand the frozen archive.
- Decision: ACCEPT
- Final wording:
- Notes:

## Application result

- Accepted: D3, D4, D6, R1, R2, R7.
- Revised: D1, D2, D5, R3, R4, R5, R6.
- Rejected: none.
- Skipped: MSE card normalization, because `Normalize after approval: false`.
- Failed: none.
- General rules updated: `docs/CONTEXT.md`; `docs/RULES.md`.
- Archetype rule updated: `docs/13_spellbook/RULES.md`.
- Global examples synchronized: `docs/10_burning_abyss/RULES.md`; `docs/12_nekroz/RULES.md`.
- Archive contract synchronized: `tests/test_english_source_of_truth.py` no longer requires canonical English projects, cards, docs, or reviews to gain French counterparts; checksum manifest remains authoritative.

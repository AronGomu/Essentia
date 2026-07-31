# Rule review — 06 YGO Staples Synchro

- Status: APPLIED
- Applied: 2026-07-17
- Review ID: 2026-07-17-06-ygo-staples-synchro
- Generated: 2026-07-17
- Normalize after approval: false
- Source request: fix-mse-cards — cards_mse/00_drafts/06_synchro_staples/06_YGO_Staples_Synchro.mse-set

## How to complete this review

Answer directly in this Markdown file. For every item, replace `TODO` with exactly one decision:

- `ACCEPT` — apply the proposed rule;
- `REJECT` — keep the current rule;
- `REVISE` — use the text in `Final wording`.

For `REVISE`, write the replacement rule under `Final wording`. Use `Notes` for rationale or implementation constraints. Do not remove IDs, questions, or evidence. When finished, change `Status` to `READY`, save the file, and tell the agent `continue`.

## Ruling contradictions — pattern destroyers

### D1 — Ability timing label `Activated Ritual Soft`

- Scope: general (`docs/CONTEXT.md`, `docs/RULES.md`)
- Existing rule: Activated timing is `Sorcery` or `Flash` after `Activated` (`docs/RULES.md` Activated section). `Ritual` is a super-type / summon procedure, not an activation speed.
- Conflicting evidence: Pre-fix MSE on Black Rose Dragon used `(2 - Activated Ritual Soft)` with a plant-exile cost (`card black rose dragon`).
- Why this destroys a pattern: Introduces a third activation speed token that is not defined and collides with Ritual Summon vocabulary.
- Question: Confirm that `Ritual` is never a legal Activated timing token and that the Black Rose line must use `Activated Sorcery Soft` (or Flash if intended)?
- Impacted cards/files: `cards_mse/00_drafts/06_synchro_staples/06_YGO_Staples_Synchro.mse-set/card black rose dragon` (already corrected mechanically to Sorcery Soft pending this ruling).
- Proposed resolution: Document explicitly that Activated timing tokens are only `Sorcery` and `Flash`. Never write `Activated Ritual`.
- Side effects: Any future `Activated Ritual` is invalid markup.
- Decision: REJECT
- Final wording:
- Notes:

## Application result

- Accepted: R1 Hand Summon; R3 On Opponent Activation or Attack (+ `or` separator rule); R4 Exile N [selector] from Grave; R5 Protection from everything
- Revised: R2 → keyword **On Enter Synchro** (not On Enter Your Synchro); default controller-side for events without Opponent
- Rejected: D1 (no global prohibition on `Activated Ritual`; current Black Rose card uses `Activated Sorcery Soft`)
- Docs: `docs/CONTEXT.md`, `docs/RULES.md`
- MSE: Black Rose Sorcery Soft; Moonlight `or`; Hyper Librarian On Enter Synchro; slash→or on Xyz/BA/Shaddoll hits
- Generator: `.script/create_extra_deck_staples_projects.py`
- Skipped/failed: none

## New possible rules — pattern makers

### R1 — Keyword **Hand Summon**

- Scope: general (`docs/CONTEXT.md`, `docs/RULES.md`)
- Evidence: Ancient Fairy Dragon ability 1: `<b>Hand Summon</b> 1 creature MV 1 or less.` (`card ancient fairy dragon`).
- Existing rule: **Summon** puts a card onto the battlefield from a stated zone without casting (`docs/CONTEXT.md` Summon).
- Question: Should **Hand Summon** become a documented action keyword meaning “**Summon** 1 creature from your hand” (with optional filters after the keyword)?
- Proposed rule: **Hand Summon** means: “**Summon** the creature indicated from your hand.” On a card, write `**Hand Summon**` then the filters (`1 creature MV 1 or less`, etc.). Same proper-summon restrictions as **Summon**.
- Boundary and exceptions: Does not bypass Extra Deck / Ritual proper-summon rules unless the effect also grants `ignoring the restrictions of Summon`.
- Impacted cards/files: `card ancient fairy dragon`; global keyword docs; keyword inventory.
- Side effects: Shortens repeated “Summon from your hand” lines.
- Decision: ACCEPT
- Final wording:
- Notes:

### R2 — Event keyword **On Enter Your Synchro**

- Scope: general
- Evidence: T.G. Hyper Librarian: `<b>On Enter Your Synchro</b> — Draw 1 card.` (`card t.g. hyper librarian`).
- Existing rule: **On Enter** is self-enter only; opponent/filtered enters use other On* forms (`docs/CONTEXT.md` event keywords).
- Question: Document **On Enter Your Synchro** as “Whenever a Synchro Creature enters the battlefield under your control”?
- Proposed rule: **On Enter Your Synchro** means: “Whenever a Synchro Creature enters the battlefield under your control.” Include this card if it itself is an arriving Synchro Creature.
- Boundary and exceptions: Scope is controller-based, type Synchro only. Other types need their own keyword or full PSCT.
- Impacted cards/files: `card t.g. hyper librarian`; global docs.
- Side effects: Parallel forms could appear later (On Enter Your Fusion, etc.).
- Decision: REVISE
- Final wording: On Enter Synchro
- Notes: For all effect, if not specified, its always from card from our side that triggers it. Otherwise it would be: On Enter (Yours &) Opponent

### R3 — Event / timing keyword **On Opponent Activation or Attack**

- Scope: general
- Evidence: Red Supernova Dragon ability 2 uses `<b>On Opponent Activation or Attack</b>` as the trigger window on an Activated Flash Soft line (`card red supernova dragon`).
- Existing rule: Attack events use **On Attack** family; cast/activation events use **On Cast** / ability responses; slash/OR combines defined events (`docs/CONTEXT.md`).
- Question: Should **On Opponent Activation or Attack** be a defined global keyword meaning “When an opponent activates an ability or attacks with a creature” (and usable as a condition on Activated Flash lines)?
- Proposed rule: **On Opponent Activation or Attack** means: “When an opponent activates an ability or declares an attack with a creature.” May introduce a Triggered ability or restrict when an Activated Flash ability activates. Always in bold. Canonical casing: capitalized `Opponent`.
- Boundary and exceptions: “Activation” = ability activation (stack), not simple spell casting (use **On Opponent's Cast** for spells). Attack = declare attackers step / attack declaration as used elsewhere in the cube.
- Impacted cards/files: `card red supernova dragon`; global docs.
- Side effects: Distinct from pure **On Attack** on the source creature.
- Decision: ACCEPT
- Final wording:
- Notes: Replace all '/' by 'or'. 'or' is the only way to allow several trigger conditions

### R4 — Cost keyword pattern **Exile N [filter] from Grave**

- Scope: general
- Evidence: Black Rose Dragon: `<b>Exile 1 Plant from Grave</b>: …` (`card black rose dragon`). Related existing keyword **Exile from Grave** only covers exiling *this* card from your Grave as activation (`docs/CONTEXT.md`).
- Question: Document a reusable cost form **Exile N [selector] from Grave** meaning “As a cost, exile N cards corresponding to the selector from your Grave” (other cards, not necessarily this card)?
- Proposed rule: **Exile N [selector] from Grave** means: “As a cost, exile N cards from your **Grave** that match the selector.” Example: `**Exile 1 Plant from Grave**`. Distinct from **Exile from Grave**, which exiles *this* card and fixes the activation zone.
- Boundary and exceptions: Selector uses project naming/type rules. N is a positive integer.
- Impacted cards/files: `card black rose dragon`; global docs.
- Side effects: Prevents overloading **Exile from Grave** for unrelated mill/cost exiles.
- Decision: ACCEPT
- Final wording:
- Notes:

### R5 — Evergreen **Protection from everything**

- Scope: general
- Evidence: Chaos Angel: `<b>Protection from everything</b>` (`card chaos angel`).
- Existing rule: Evergreen Magic keywords print bold on their own line or in text; English list includes Protection (`docs/CONTEXT.md` evergreen paragraph).
- Question: Confirm English evergreen form **Protection from everything** (and **Protection from [quality]**) as bold keywords equivalent to Magic’s protection from everything / protection from [quality]?
- Proposed rule: The forms **Protection from everything** and **Protection from [quality]** are evergreen Magic keywords in English. Write them in bold. **Protection from everything** means protection from everything (like *protection from everything*).
- Boundary and exceptions: Same layered rules as Magic protection.
- Impacted cards/files: `card chaos angel`; global docs.
- Side effects: Aligns protection wording with English Magic terminology.
- Decision: ACCEPT
- Final wording:
- Notes:

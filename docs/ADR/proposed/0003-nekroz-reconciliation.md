# Rule review — 12_YGO_Necroz MSE reconciliation

- Status: AWAITING_USER
- Review ID: 2026-07-17-12-ygo-necroz-rule-proposals
- Generated: 2026-07-17
- Normalize after approval: false
- Source request: fix-mse-cards — cards_mse/00_drafts/03_nekroz/03_YGO_Nekroz.mse-set

## How to complete this review

Answer directly in this Markdown file. For every item, replace `TODO` with exactly one decision:

- `ACCEPT` — apply the proposed rule;
- `REJECT` — keep the current rule;
- `REVISE` — use the text in `Final wording`.

For `REVISE`, write the replacement rule under `Final wording`. Use `Notes` for rationale or implementation constraints. Do not remove IDs, questions, or evidence. When finished, change `Status` to `READY`, save the file, and tell the agent `continue`.

## Ruling contradictions — pattern destroyers

### D1 — Ritual MV check: “satisfies its Ritual cost” vs explicit equality

- Scope: general (`docs/CONTEXT.md` Ritual MV comparison)
- Existing rule: For Ritual Summon mana-value costs, compare MV values explicitly; default is equality (`docs/CONTEXT.md` Ritual Summon / MV cost section).
- Conflicting MSE evidence: `card nekroz - cycle` and `card nekroz - mirror` use `whose MV meets its Ritual cost`, while `card nekroz - kaleidoscope` uses `whose MV satisfies their Ritual cost(s)`, instead of explicit `whose total MV equals ...` wording.
- Why this destroys a pattern: “Satisfies” is vaguer than explicit equality / ≥ and may hide overpay policy.
- Exact ruling question: May Ritual material lines use `whose MV satisfies its Ritual cost` as the project default for exact-match ritual costs, or must cards keep explicit `equal` / `greater than or equal`?
- Impacted cards/files: Cycle, Mirror, Kaleidoscope; future Ritual spells; `docs/CONTEXT.md`.
- Proposed resolution: Allow `whose MV satisfies its Ritual cost` as shorthand for the documented default equality check. Keep `greater than or equal` when overpay is intended.
- Side effects: Shorter ritual templates; equality remains the rules default unless stated otherwise.
- Decision: TODO
- Final wording:
- Notes:

### D2 — Gungnir ability 1 replaced Grave-return with indestructible grant

- Scope: archetype card identity (not general rule), listed here only if treated as reusable “discard this for protection” pattern
- Existing rule: Prior Gungnir (1) returned a “Nekroz” from Grave to hand; (2) discarded a “Nekroz” for indestructible on a “Nekroz” creature.
- Conflicting MSE evidence: Both abilities now grant indestructible (discard this / discard 1 “Nekroz” + target “Nekroz” creature).
- Why this destroys a pattern: Two nearly identical indestructible grants on one card collapse the old toolbox split (recursion vs protection).
- Exact ruling question: Accept dual indestructible modes as the new Gungnir design (card change only), or restore ability 1 as Grave return?
- Impacted cards/files: `card nekroz - gungnir` only unless a general “discard this for indestructible” keyword is desired.
- Proposed resolution: Accept as card-specific design; no general rule. (If REJECT, restore prior ability 1.)
- Side effects: Less recursion, more protection stacking.
- Decision: TODO
- Final wording:
- Notes:

## New possible rules — pattern makers

### R1 — Brionac’s Sideboard return versus **Bounce**

- Scope: card-specific conflict with the existing general **Bounce** rule
- Evidence: `card nekroz - brionac` ability 2 says `Target 1 creature that was put onto the field from a Sideboard; <b>Bounce</b> the target.` This replaces prior `Shuffle ... into Sideboard` wording.
- Existing rule: **Bounce** returns the targeted permanent to its owner's hand (`docs/CONTEXT.md`, `docs/RULES.md`).
- Exact ruling question: Should Brionac use the existing **Bounce** keyword and return the target to its owner's hand, or restore explicit wording that shuffles the target into its owner's Sideboard?
- Proposed resolution: Treat this as a card-specific destination decision. Do not redefine the global **Bounce** keyword.
- Boundary and exceptions: If Sideboard return is selected, write the action in full rather than overloading **Bounce**.
- Impacted cards/files: `card nekroz - brionac`; its tests and render.
- Side effects: Determines Brionac's destination without changing the global keyword.
- Decision: TODO
- Final wording:
- Notes:

### R2 — Discard self by short card name (`Discard Brionac`)

- Scope: general reusable templating
- Evidence: Multiple Nekroz rituals: `Discard Brionac`, `Discard Catastor`, `Discard Clausolas`, `Discard Armor`, `Discard Trishula`, `Discard Unicore`, `Discard Valkyrus` instead of `Discard this card`.
- Existing rule: Self-discard usually `Discard this card`.
- Exact proposed wording: On a named creature, a hand ability may use the short display name after `Discard` (`Discard Brionac`) as equivalent to discarding this card from hand. Prefer short name when the MSE `name` line is `Nekroz - X` and the reminder name is `X` / last token.
- Boundary and exceptions: Keep `this card` when the short name is ambiguous.
- Impacted cards/files: Most Nekroz ritual monsters; generators/tests.
- Side effects: Clearer YGO flavor; name must match printed short name.
- Decision: TODO
- Final wording:
- Notes:

### R3 — **Release** from exile with `ignoring the restrictions of Summon`

- Scope: card-specific application of an existing general rule
- Evidence: `card nekroz - exa` (2): `Target 1 other “Nekroz” creature in your exile; <b>Release</b> the target ignoring the restrictions of Summon.`
- Existing rule: **Release** puts a card from exile onto the field and follows the same proper-summon restrictions as **Summon** and **Reanimate**. A normally illegal action needs explicit `ignoring the restrictions of Summon` (`docs/CONTEXT.md`).
- Exact ruling question: Should Exa retain `ignoring the restrictions of Summon` so it can Release a Ritual Creature that was not properly summoned?
- Proposed resolution: Retain the permission on Exa. No new general rule is needed.
- Boundary and exceptions: This permission makes the Release legal but does not count as a proper Ritual Summon.
- Impacted cards/files: `card nekroz - exa` only.
- Side effects: Makes the card's restricted-zone interaction explicit without changing general rules.
- Decision: TODO
- Final wording:
- Notes:

# 0013 — Activation condition colon and Title self-name

- Date: 2026-08-03
- Status: Accepted
- Scope: Global activation/casting If-condition separator; hyphenated Archetype - Title self-reference
- Review: `.tmp/update-rules/2026-08-03-activation-condition-colon-rule-proposals-2.html`

## Context

User edits on Nekroz - Valkyrus (1), Decisive Armor, and Gungnir exposed two reusable wording patterns: colon after activation `If` conditions, and unquoted Title self-reference for `Archetype - Title` MSE names. Pronoun-after-target and `to end turn` were already settled. P/T changes remain card-specific and were not ruled here.

`normalize=false`, so this decision updates rule owners only.

## Decisions

### R1 — Activation condition colon gate

- Outcome: **ACCEPT**
- Final rule: Activation/casting `If`-condition gates use colon with no space before it: `If [condition]: [costs and targets]; [resolution].` Keep comma for replacements, `If you do` / `If you can’t`, and non-gate mid-resolution If clauses.
- Evidence: Valkyrus (1) `If you control no Creatures : Discard…`; Exciton already used colon without space; TEMPLATING lacked comma-vs-colon rule.
- Rationale: Colon marks the gate between condition and costs more clearly than comma; no space before colon matches English/card corpus (Exciton).
- Impact: `docs/rules/TEMPLATING.md`; Valkyrus and other activation-gated If lines during later normalization.

### R2 — Hyphenated self-name uses Title

- Outcome: **ACCEPT**
- Final rule: For MSE names `Archetype - Title`, self-reference uses unquoted `Title` (full right-hand side). No `this card`, no quoted `Title`, no shorter nickname than Title. Full MSE name only if Title alone is ambiguous.
- Evidence: Decisive Armor `Discard “Armor”` → `Discard Decisive Armor`; Gungnir `Discard this card` → `Discard Gungnir`; Valkyrus/Brionac/Trishula Title discards. ADR 0009 preferred full self-name but did not define the hyphen split.
- Rationale: Title is the distinctive self-token for hyphenated cube names; rejects overly short nicknames (`Armor`) and generic `this card`.
- Impact: `docs/rules/TEMPLATING.md` Names; Nekroz and similar `Archetype - Title` self-lines during later normalization.

## Changed rule owners

- `docs/rules/TEMPLATING.md`

## Normalization scope

None. Review used `normalize=false`. User MSE edits on Valkyrus/Decisive Armor/Gungnir were not overwritten by this ADR apply step; residual cleanup (space before colon, error-spelling tags, aggregate sync) remains a separate normalize/export pass if requested.

## Validation

- `git diff --check`: passed
- Stale/duplicate rule search: active TEMPLATING states colon gate and Title self-name; old “prefer full printed MSE self-name only” wording replaced by Title rule for hyphenated names
- `python -m unittest tests.test_update_rules_skill`: passed
- Changed-script compile: not applicable

# 0009 — Reference wording

- Date: 2026-08-02
- Status: Accepted
- Scope: Global card-text references and zero-mana alternative-cost wording
- Review: `.tmp/update-rules/2026-08-02-reference-wording-rule-proposals.html`

## Context

Ash Blossom & Joyous Spring, Bagooska, and Book of Moon exposed three inconsistent reusable forms: immediate target references, concrete self-references, and zero-mana alternative costs. Existing global rules required `the target`, permitted generic `this card`/`this Spell`, and existing Spellbook text used `without paying its mana cost`.

The completed review accepted all three proposed conventions. `normalize=false`, so this decision updates reusable rule owners only; MSE cards and card-specific tests remain unchanged until a later normalization pass.

## Decisions

### D1 — Immediate target references

- Outcome: **ACCEPT**
- Final rule: After same-ability targeting, use `it`/`its` for one object and `them`/`their` for multiple objects. Retain an explicit noun phrase only when a pronoun would be ambiguous or a typed/linked reference is required.
- Evidence: `docs/rules/TEMPLATING.md:64` required `**Target** 1 Creature; the target ...`; Ash Blossom & Joyous Spring and Book of Moon requested `it`; existing cards and tests contain both forms.
- Rationale: Pronouns are shorter while remaining clear immediately after target identification. Explicit noun phrases preserve clarity for ambiguous, typed, or linked references.
- Impact: `docs/rules/TEMPLATING.md`; Copy Resolution in `docs/keywords/ACTIONS.md`; Ash Blossom & Joyous Spring, Book of Moon, other target-reference cards, and related tests during future normalization.

### R1 — Printed self-name references

- Outcome: **ACCEPT**
- Final rule: Prefer the full printed MSE self-name, without quotation marks, in concrete card text instead of `this card`, `this Creature`, or `this Spell`. Generic self-reference remains valid in reusable definitions without a concrete card name.
- Evidence: Bagooska requested `Destroy Bagooska`; Book of Moon requested `Cast Book of Moon`; existing cards mix printed names with generic self-reference. `docs/rules/TEMPLATING.md` defined both forms but no preference.
- Rationale: Printed names make concrete effects explicit and preserve requested Yu-Gi-Oh!-style identity. Generic definitions cannot name a concrete source and therefore retain generic wording.
- Impact: `docs/rules/TEMPLATING.md`; Bagooska, Book of Moon, other self-referencing cards, generators, and related tests during future normalization.

### D2 — Zero-mana alternative costs

- Outcome: **ACCEPT**
- Final rule: Write `you may **Cast** [full self-name] for free` for a zero-mana alternative cost. `For free` replaces only mana payment; additional costs and casting restrictions still apply unless separately waived.
- Evidence: Book of Moon requested `Cast Book of Moon for free`; Book of Moon, Spellbook Magician, Upstart Goblin, Spell Affinity, and related tests used `without paying its mana cost`.
- Rationale: The shorter phrase matches requested compact syntax. The explicit boundary preserves additional costs and casting restrictions.
- Impact: `docs/rules/TEMPLATING.md`; `docs/04_spellbook/KEYWORDS.md`; Book of Moon and other zero-mana alternative-cost cards and tests during future normalization.

## Changed rule owners

- `docs/rules/TEMPLATING.md`
- `docs/keywords/ACTIONS.md`
- `docs/04_spellbook/KEYWORDS.md`

## Normalization scope

None. Review used `normalize=false`. Ash Blossom & Joyous Spring, Bagooska, Book of Moon, other MSE cards, generated website data, renders, and card-specific tests were not changed.

## Validation

- `git diff --check`: passed
- Stale/duplicate rule search: passed; old free-cost and immediate-target templates remain only in historical ADR evidence or deferred MSE/card tests. Generic self-references remain only in reusable definitions allowed by R1.
- `python -m unittest tests.test_update_rules_skill tests.test_spellbook_cards`: passed (15 tests)
- `python -m unittest tests.test_update_rules_skill tests.test_english_source_of_truth tests.test_spellbook_cards`: blocked because environment lacks Pillow (`ModuleNotFoundError: No module named 'PIL'`); other 15 loaded tests passed
- Changed-script compile: not applicable; no scripts changed

# 0010 — Compact duration, quantity card, zone article

- Date: 2026-08-02
- Status: Accepted
- Scope: Global same-turn duration shorthand, default-object quantity wording, bare zone article style
- Review: `.tmp/update-rules/2026-08-02-compact-duration-quantity-zone-rule-proposals.html`

## Context

Burning Abyss Alich, Barbar, Draghig, and Effect Veiler requested denser reusable wording: same-turn duration `to end turn`, omit bare `card` on quantity actions and counting anaphors, and drop `the` before bare zone names. Existing templates still used `until the end of the turn`, `Draw 1 card`, and `on the Field` / `on the Stack`.

Personal-zone `your` omission was already settled in `docs/rules/ZONES.md` and ADR 0004; it was not reopened. `normalize=false`, so this decision updates reusable rule owners only; MSE cards and card-specific tests remain unchanged until a later normalization pass.

## Decisions

### D1 — Same-turn duration shorthand

- Outcome: **ACCEPT**
- Final rule: Write same-turn end duration as `to end turn`. Replace `until the end of the turn` and `until end of turn`. Keep longer phrases only for non-current-turn durations.
- Evidence: `docs/rules/TEMPLATING.md` used `until the end of the turn` (ability-loss + P/T template; ADR 0007). Alich and Effect Veiler requested `to end turn`. Corpus also mixed Spellbook `until end of turn`.
- Rationale: One compact token for current-turn end duration. Multi-turn durations stay explicit.
- Impact: `docs/rules/TEMPLATING.md`; Alich, Effect Veiler, Clausolas, Dante, Maxx C, many temporary buffs/negations, and related tests during future normalization.

### R1 — Default object is card — omit bare card

- Outcome: **ACCEPT**
- Final rule: Default object of quantity actions and counting anaphors is a card. Omit bare `card`/`cards`: `Draw 1`, `Discard 1`, `for each exiled`, `for each milled`. Keep explicit nouns for type, qualifier, named selector, structural top card, or non-default object terms.
- Evidence: Draghig `Discard 1 card, then Draw 1 card`; Barbar `for each card exiled`; Spellbook Knowledge already used `Draw 2`; Phoenix Wing / Karma Cut tests already expect `Discard 1`. Named-selector omit-card rule did not cover bare quantities. `docs/keywords/EVENTS.md` showed `**Draw** 1 card`.
- Rationale: Card is the default object of these actions and anaphors. Restrictive nouns remain when they change eligibility or meaning.
- Impact: `docs/rules/TEMPLATING.md`, `docs/keywords/EVENTS.md`; Draghig, Barbar, Maxx C, draw/discard staples, and related tests during future normalization.

### D2 — No article before bare zone names

- Outcome: **ACCEPT**
- Final rule: Do not put `the` before a bare canonical zone name. Write `on Stack`, `on Field`, `from Grave`, `into Hand`, `from Deck`. Keep `the` only inside larger ordinary noun phrases that are not bare zone labels.
- Evidence: Effect Veiler `on the Stack`; `docs/rules/TEMPLATING.md` ability-loss note used `on the Field`; keyword docs already preferred article-free `on Stack` / `on Field` / `from Grave` in many places.
- Rationale: Aligns card-text and templates with compact zone style already half-adopted in keyword docs.
- Impact: `docs/rules/TEMPLATING.md`, `docs/rules/ZONES.md`, `docs/keywords/ACTIONS.md`; Effect Veiler, Bagooska, Back Jack, Field/Stack lines, and related tests during future normalization.

## Changed rule owners

- `docs/rules/TEMPLATING.md`
- `docs/rules/ZONES.md`
- `docs/keywords/EVENTS.md`
- `docs/keywords/ACTIONS.md`

## Normalization scope

None. Review used `normalize=false`. Alich, Barbar, Draghig, Effect Veiler, other MSE cards, generated website data, renders, and card-specific tests were not changed. Existing personal-zone `your` debt (for example Barbar `from your Grave`) remains under ADR 0004 / `ZONES.md` for later normalization.

## Validation

- `git diff --check`: passed
- Stale/duplicate rule search: passed; active owners use `to end turn`, bare-zone article-free forms, and `**Draw** 1`. Mentions of old long duration remain only as replacement instructions or historical ADR evidence; deferred MSE/card tests still carry old forms until normalization
- `python -m unittest tests.test_update_rules_skill`: passed (9 tests)
- Changed-script compile: not applicable; no scripts changed

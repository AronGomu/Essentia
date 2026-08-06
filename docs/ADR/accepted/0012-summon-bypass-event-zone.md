# 0012 — Summon bypass, event casing, zone articles, Ritual-alone

- Date: 2026-08-02
- Status: Accepted
- Scope: Global proper-summon bypass phrase, event-keyword casing, indefinite zone articles, Ritual-alone substitute template
- Review: `.tmp/update-rules/2026-08-02-summon-bypass-event-zone-rule-proposals.html`

## Context

Maxx “C”, Nekroz Brionac, Exa, Shurit, and Trishula requested denser or corrected forms. Reusable items were: proper-summon bypass phrasing, indefinite articles before bare zones, exact event-keyword casing, and a compact Ritual-alone substitute template.

Already settled and not reopened: full self-name without quotation marks (ADR 0009); bare `card` omit on quantities/anaphors (ADR 0010). Maxx trailing comma after `to end turn` treated as punctuation cleanup under existing duration token.

`normalize=false`, so this decision updates rule owners only; MSE cards remain unchanged until a later normalization pass.

## Decisions

### D1 — Proper-summon bypass phrase

- Outcome: **ACCEPT**
- Final rule: Replace `ignoring the restrictions of summon` / `… of Summon` with `ignoring summoning restrictions`. Meaning unchanged; still explicit-only; does not count as proper summon.
- Evidence: Exa long bypass phrase; `docs/rules/SUMMONING.md:15,19`; `docs/keywords/ACTIONS.md:21`; Instant Fusion.
- Rationale: Shorter canonical permission phrase with identical rules meaning.
- Impact: `docs/rules/SUMMONING.md`, `docs/keywords/ACTIONS.md`; Exa, Instant Fusion, future bypass lines and tests during later normalization.

### R1 — No `a`/`an` before bare zones

- Outcome: **ACCEPT**
- Final rule: Do not put `a` or `an` before a bare canonical zone name. Write `from Sideboard`, `onto Field`, `from Grave`. Keep articles inside larger ordinary non-zone noun phrases.
- Evidence: Brionac / Unicore `from a Sideboard`; ADR 0010 already dropped `the` only.
- Rationale: Completes zone article style for bare zone labels.
- Impact: `docs/rules/ZONES.md`, `docs/rules/TEMPLATING.md`; Brionac, Unicore, similar Sideboard lines during later normalization.

### D2 — Event keyword exact casing

- Outcome: **ACCEPT**
- Final rule: Printed event keywords must match the documented token exactly, including Title Case. Write `On Exile`, never `on Exile` or other casing variants.
- Evidence: Exa and Great Sorcerer `<b>on Exile</b>`; `docs/keywords/EVENTS.md` defines `**On Exile**`.
- Rationale: Keyword invocations are closed tokens; casing is part of the token.
- Impact: `docs/keywords/EVENTS.md`, `docs/rules/TEMPLATING.md`; Exa, Great Sorcerer, any mistyped event leads during later normalization.

### R2 — Compact Ritual-alone substitute

- Outcome: **ACCEPT**
- Final rule: Single-body Ritual material substitute form: `[full self-name] can satisfy Ritual sacrifice of [selector] alone.` Example: `Shurit can satisfy Ritual sacrifice of “Nekroz” alone.`
- Evidence: Shurit long static permission line; no prior compact template.
- Rationale: Locks a reusable short form for alone-substitute Ritual materials without changing MV math.
- Impact: `docs/rules/SUMMONING.md`, `docs/rules/TEMPLATING.md`; Shurit and future alone-substitute creatures during later normalization.

## Changed rule owners

- `docs/rules/SUMMONING.md`
- `docs/keywords/ACTIONS.md`
- `docs/rules/ZONES.md`
- `docs/rules/TEMPLATING.md`
- `docs/keywords/EVENTS.md`

## Normalization scope

None. Review used `normalize=false`. Maxx “C”, Brionac, Exa, Shurit, Trishula, Instant Fusion, Great Sorcerer, other MSE cards, aggregate, renders, and card-specific tests were not changed.

## Validation

- `git diff --check`: passed
- Stale/duplicate rule search: active owners use `ignoring summoning restrictions`, article-free bare zones including no `a`/`an`, exact event Title Case note, and Ritual-alone template; old bypass phrase remains only in historical ADR evidence or deferred MSE/card tests
- `python -m unittest tests.test_update_rules_skill`: passed
- Changed-script compile: not applicable; no scripts changed

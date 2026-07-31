# Templating and PSCT

## Names

MSE `name:` stores chosen cube name. Official name remains in `original_cards/`. Mechanical card/archetype/name-fragment references are italic. Full self-name has no quotation marks; other names/fragments retain typographic quotes inside italics.

Markdown examples: `*D.D. Crow*`, `*“Lyrilusc”*`. MSE examples: `<i-auto>D.D. Crow</i-auto>`, `<i-auto>“Lyrilusc”</i-auto>`.

Do not italicize generic types, supertypes, zones, `this card`, or archetype word inside custom keyword.

## Ability format

Every effect/ability uses:

```text
(x - Type timing frequency) **condition keyword** — activation procedure, costs and targets; resolution.
```

Types: `Static`, `Triggered`, `Activated`, `Resolution`.

- Prefix number/type/timing/frequency first.
- Event keyword follows prefix, bold, then em dash.
- Activation conditions, costs, and target choice precede `;`.
- Resolution follows `;`.
- Resolution label does not move preceding cost into resolution.
- Targeting is activation action, never cost.
- Use `and` for simultaneous actions, `then` for ordered/dependent action, `if you do` for explicit success dependency.
- Preserve `you may`; distinguish **Target** from `choose`.

Costs and casting conditions are unnumbered before evergreen keywords/numbered abilities. General alternative line is `**Alternative Cost** — ...`. Documented affinity may replace label. Never write `(1 - Alternative Cost)`.

## Timing/frequency

Activated timing normally follows type:

- `Ritual` or `Sorcery`: sorcery speed.
- `Flash`: instant speed.

Timing may be omitted when defined keyword fixes it.

- `Soft`: once per turn per object; leaving/returning creates new object.
- `Hard`: once per turn per card name; all copies share limit.
- `Hard Linked`: one linked effect of card name per turn.
- `Triggered Soft`: once per turn for object.
- `Resolution Hard`: card activation once per turn by name.

## Keywords and evergreen abilities

Complete documented invocation is bold. Unknown bold phrase is invalid. Evergreen Magic abilities appear bold on own line, not numbered passive ability, after cost/casting lines before numbered abilities.

Bold atomic compounds including arguments/connectors: **Detach 1 and Mill 3**, **Exile 1 Plant from Grave**, **Protection from Creatures**, **Ward 2**.

## Compact text

- Use Arabic numerals for governing quantities.
- Prefer `Choose 1 other Creature` over `Choose another Creature`.
- Prefer inclusive en-dash ranges: `1–3`, `0–2`; use `0–N` instead of `up to N` when equivalent.
- Use `MV` for mana value.
- Use `Deck`, not library.
- Use `If`, not `When`, for explicit card-text conditions outside event keyword definitions.
- Choose target in current ability: `**Target** 1 Creature; the target ...`.
- Use `the targeted Creature` only after earlier linked designation.

## Selectors

When selector already has card/archetype/name fragment, omit generic `card(s)`: `**Search** 1 *“Spellbook”*`, `**Target** 1 *“Spellbook”* in Grave`, `1 non-Creature **Ritual Summon** *“Nekroz”*`. Keep restrictive type/qualifier.

A selector without `target` chooses on resolution. Add `This effect does not target.` only when omission creates genuine ambiguity.

## Type/material wording

- Use type before archetype: `**Search** 1 Ritual Creature *“Nekroz”*`.
- Use race before type: `Dragon Ritual Creature`.
- Sideboard material line is italic and omits summon prefix.
- Destruction replacement: `If this card would be destroyed, you may sacrifice ... instead.`
- Ability loss/stat reset: `The target Creature loses all its abilities and becomes 0/0 until the end of the turn.`
- Ability loss `on the Field` ends when card leaves Field.

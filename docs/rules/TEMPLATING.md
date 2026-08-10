# Templating and PSCT

## Names

MSE `name:` stores chosen cube name. Official name remains in `original_cards/`. Mechanical card/archetype/name-fragment references are italic. Full self-name has no quotation marks; other names/fragments retain typographic quotes inside italics.

Markdown examples: `*D.D. Crow*`, `*“Lyrilusc”*`. MSE examples: `<i-auto>D.D. Crow</i-auto>`, `<i-auto>“Lyrilusc”</i-auto>`.

In concrete card text, prefer the printed self-name over `this card`, `this Creature`, or `this Spell`. After the object is clear in the same sentence, use a pronoun. Reusable rule and keyword definitions without a concrete card name may retain generic self-reference.

When MSE `name:` is `[Archetype] - [Title]`, self-reference uses unquoted `[Title]` (the full right-hand side). Do not write `this card`, quoted `“Title”`, or a shorter nickname than Title. Use the full MSE name only when Title alone would be ambiguous. Examples: `**Discard** Decisive Armor`, `**Discard** Gungnir`, `**Discard** Valkyrus`. Other-card and archetype references keep quotes and italics as documented above.

Do not italicize generic types, supertypes, zones, generic self-references, or archetype word inside custom keyword.

## Ability format

Every effect/ability uses:

```text
(x - Type timing frequency) **condition keyword** — activation procedure, costs and targets; resolution.
```

Types: `Static`, `Triggered`, `Activated`, `Resolution`.

- Prefix number/type/timing/frequency first.
- Event keyword follows prefix, bold, then em dash.
- A defined event nested in resolution creates a same-turn delayed instruction under [`EVENTS.md`](../keywords/EVENTS.md); it is not a second recurring ability.
- Activation conditions, costs, and target choice precede `;`.
- Resolution follows `;`.
- Resolution label does not move preceding cost into resolution.
- Targeting is activation action, never cost.
- When an `If` clause is an activation or casting condition that gates costs and/or the activation procedure, end the condition with `:` (no space before the colon), then costs/targets, then `;`, then resolution: `If [condition]: [costs and targets]; [resolution].` Example: `If you control no Creatures: **Discard** Valkyrus; prevent all combat damage that would be dealt to you this turn.`
- Keep comma after `If` for replacements (`If …, … instead`), `If you do,` / `If you can’t,`, and non-gate mid-resolution If clauses.
- Use `and` for simultaneous actions, `then` for ordered/dependent action, `if you do` for explicit success dependency.
- Preserve `you may`; distinguish **Target** from `choose`.

Costs and casting conditions are unnumbered before evergreen keywords/numbered abilities. General alternative line is `**Alternative Cost** — ...`. For a zero-mana alternative cost, write `you may **Cast** [full self-name] for free`. `For free` replaces only the mana payment; additional costs and casting restrictions still apply unless separately waived. Documented affinity may replace label. Never write `(1 - Alternative Cost)`.

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

Bold atomic compounds including arguments: **Exile 1 Plant from Grave**, **Protection from Creatures**, **Ward 2**. Two keywords joined by a connector stay separately bold, connector plain: **Detach 1** and **Mill 1-4**.

A keyword quantity is a single value or an inclusive range. Both dash forms stand — **Mill 0–3** and **Mill 1-4** — and either bound may be X: **Detach X-2**.

A numbered ability may consist solely of a documented archetype custom keyword when that keyword defines the complete effect. Bodyless base actions and event keywords remain invalid. Cards outside the owning archetype print the full effect.

## Compact text

- Use Arabic numerals for governing quantities.
- Prefer `Choose 1 other Creature` over `Choose another Creature`.
- Prefer inclusive en-dash ranges: `1–3`, `0–2`; use `0–N` instead of `up to N` when equivalent.
- Use `MV` for mana value.
- Use `Deck`, not library.
- Use `If`, not `When`, for explicit card-text conditions outside event keyword definitions.
- Choose target in current ability: `**Target** 1 Creature; it ...`.
- After same-ability targeting, use `it`/`its` for one object and `them`/`their` for multiple objects.
- Retain an explicit noun phrase only when a pronoun would be ambiguous or a typed/linked reference is required, such as `the targeted Creature`.
- Write same-turn end duration as `to end turn`. Replace `until the end of the turn` and `until end of turn`. Keep longer phrases only for non-current-turn durations (example: `until the end of the opponent’s next turn`).
- Do not put `the`, `a`, or `an` before a bare canonical zone name. Write `on Stack`, `on Field`, `from Grave`, `into Hand`, `from Deck`, `from Sideboard`. Keep articles only inside larger ordinary noun phrases that are not bare zone labels (example: `the top card of Deck`).
- Event keyword follows prefix bold and must match documented token exactly, including Title Case: `**On Exile**`, never `on Exile`.
- When one named permanent may alone satisfy Ritual material/sacrifice for a selector family, write: `[full self-name] can satisfy Ritual sacrifice of [selector] alone.`

## Selectors

When selector already has card/archetype/name fragment, omit generic `card(s)`: `**Search** 1 *“Spellbook”*`, `**Target** 1 *“Spellbook”* in Grave`, `1 non-Creature **Ritual Summon** *“Nekroz”*`. Keep restrictive type/qualifier.

Default object of a quantity action or counting anaphor is a card. Omit bare `card`/`cards` after governing quantities and after a prior card selection already in scope. Canonical forms: `**Draw** 1`, `**Discard** 1`, `for each exiled`, `for each milled`. Keep an explicit noun when it restricts or disambiguates: type/qualifier (`Creature`, `nonland permanent`), named/archetype selector, structural noun (`top card of Deck`), or game term where `card` is not the default object (`card type`).

A selector without `target` chooses on resolution. Add `This effect does not target.` only when omission creates genuine ambiguity.

## Type/material wording

- Use type before archetype: `**Search** 1 Ritual Creature *“Nekroz”*`.
- Use race before type: `Dragon Ritual Creature`.
- Sideboard material line is italic and omits summon prefix.
- Destruction replacement: `If [full self-name] would be destroyed, you may sacrifice ... instead.`
- Ability loss and power/toughness setting are independent instructions. Ability loss alone does not change power or toughness.
- When both apply, state both: `**Target** 1 Creature; it loses all its abilities and becomes P/T to end turn.` Choose P/T per effect.
- A temporary-negation effect not intended as removal uses toughness 1 or greater, so its P/T instruction does not cause death solely through 0 toughness.
- Ability loss `on Field` ends when card leaves Field.

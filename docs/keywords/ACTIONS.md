# Action keywords

Closed base-action catalog:

**Discard**, **Exile**, **Search**, **Summon**, **Hand Summon**, **Ritual Summon**, **Fusion Summon**, **Reanimate**, **Salvage**, **Reclaim**, **Release**, **Attach**, **Bounce**, **Negate**, **Negate & Destroy**, **Set**, **Detach N**, **Mill N**, **Scry N**, **Slow Blink N Any Creature**, **Draw**, **Target**, **Counter**, **Return**, **Destroy**, **Send**, **Cast**, **Sacrifice**, **Reveal**.

Bold/capitalize exact base-form command when it performs action. Homonymous nouns, adjectives, participles remain plain (`the target`, `Predator counter`, `draw step`, `was cast`). `Choose` and `Put` are ordinary instructions.

## Definitions

### Search

Search Deck for indicated object, reveal when required, put into Hand, shuffle. Named selector omits generic `card(s)`.

### Mill N

Send top N cards of Deck to Grave. Quantity is mandatory: **Mill 1**, **Mill 2**, **Mill 3**, or **Mill 0–3**; never bare **Mill**.

### Summon / Hand Summon

**Summon** puts indicated card onto Field from stated zone without casting or paying mana cost. **Hand Summon** is Summon from Hand. Neither bypasses proper-summon restriction. Illegal movement needs explicit `ignoring the restrictions of summon`.

### Reanimate

Return target card from its Grave to Field. Does not bypass proper summon.

Exact-count gate template: `**Target** 1 [Creature] MV X in Grave and choose X [additional cards] from Grave; **Reanimate** it, if you do, **Exile** chosen cards.` Only creature is targeted unless explicitly stated.

### Salvage / Reclaim / Release

- **Salvage**: Grave → Hand.
- **Reclaim**: Exile → Hand.
- **Release**: Exile → Field; proper-summon rules apply.

### Attach / Detach N

**Attach** makes indicated card material under indicated Xyz Creature.

**Detach N** sends N materials from Xyz Creature to Grave. Before `:`/`;`, Detach is cost. After event + em dash, it is mandatory triggered action. Keep **Detach X** only when any number is chosen.

### Bounce

Return indicated permanent to owner's Hand.

### Negate

Requires target permanent, spell, or ability on Stack. Permanent loses abilities; its abilities on Stack are countered. Spell/ability target is countered.

### Negate & Destroy

Resolve **Negate**, then **Destroy** activating card or contextual target. Destruction is legal from Field, Hand, Deck, or Sideboard; illegal from Grave/Exile. Applicable **On Destroy** triggers fire.

### Set

Put card face down on Field under Trap/explicit rules. Setting does not use Stack, cast card, pay casting cost, or trigger **On Cast**.

### Slow Blink N Any Creature

`**Target** 0–N creatures; **Exile** them until next end step, then **Return** them to Field under owner's control.`

### Exile from Grave

Compound action/cost: activate only from Grave, exile this card from Grave. Write **Exile from Grave**, not long form. Additional costs/choices remain before separator.

**Exile N [selector] from Grave** exiles N matching cards from your Grave as cost; distinct from self-exiling **Exile from Grave**.

### Copy Resolution

Target before `;`, then `copy the target's Resolution effect and resolve it`. This does not cast copy or copy costs, restrictions, or non-Resolution abilities.

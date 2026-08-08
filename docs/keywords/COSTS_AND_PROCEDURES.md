# Costs and procedures

## Alternative Cost

Alternative casting cost is unnumbered before abilities:

```text
**Alternative Cost** — [condition or payment].
```

Documented affinity keyword may replace label. It must define condition, cost substitution, frequency, and affected card types.

## Xyz Alternative Cost

```text
**Xyz Alternative Cost** — W, **Discard** 1 *“Burning Abyss”* Creature and use 1 *“Dante”* you control. Its materials transfer.
```

Line replaces normal materials, uses indicated creature as material, performs proper Xyz Summon, and states transfer when needed.

## Ritual Summon

Named procedure puts Ritual Creature onto Field, paying ritual cost stated by the Ritual Summon effect. Non-creature carrier uses `Ritual Summon` supertype. Default material MV equality is explicit; card may permit greater/equal payment.

## Fusion Summon

Named procedure puts Fusion Creature onto Field from Sideboard using stated materials/zones. Non-creature carrier uses `Fusion Summon` supertype.

## Activation timing/frequency

Ability prefix metadata:

- `Ritual`/`Sorcery`: sorcery-speed activation.
- `Flash`: instant-speed activation.
- `Soft`: once per turn per object.
- `Hard`: once per turn per card name.
- `Hard Linked`: one linked ability per turn per name.

These terms stay in ability prefix, not separate bold keyword text.

## Costs

- Additional costs occur before `;` or `:` in affected ability.
- Target selection is never cost.
- **Exile from Grave** and **Exile N [selector] from Grave** are documented compound costs.
- **Detach N** is cost when before `:`/`;`; after event/em dash it is effect action.
- Casting conditions and costs remain unnumbered.

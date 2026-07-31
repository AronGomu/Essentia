# Event keywords

Event keyword introducing ability is bold followed by em dash. Combined defined events use lowercase bold ` or ` only; never `/` or uppercase `OR`.

Controller-default event looks at your side. Do not add `Your`. Use `Opponent` or `Any` when scope expands.

## Combat/entry

- **On Enter** — this card enters Field.
- **On Attack** — this creature attacks.
- **On Block** — this creature blocks.
- **On Blocked** — this creature becomes blocked.
- **On Attack or Block** — this creature attacks or blocks.
- **On Block or Blocked** — this creature blocks or becomes blocked.
- **On Fusion Summon** — Fusion Creature enters via own Fusion Summon; generic movement does not trigger.
- **On Link Summon** — Link Creature enters via own Link Summon; generic movement does not trigger.
- **On Enter Synchro** — Synchro Creature enters under your control, including this card.
- **On Opponent Creature Enter** — creature enters under opponent control.
- **MV2+ Opponent Creature Enter** — opponent creature MV 2+ enters.

An event placed after an instruction repeats instruction on each occurrence for stated duration: `**Draw** 1 card **On Opponent Creature Enter**`.

## Casting/activation/summon

- **On Cast** — you cast spell, before resolution.
- **On Opponent Cast** — opponent casts spell.
- **On Any Cast** — any player casts spell.
- **On Cast [parameters]** — restrict spell family; reserve `cast`, never `played`.
- **On Opponent Summon** — opponent performs **Summon** action; normal creature cast does not count.
- **On Opponent Activation or Attack** — opponent activates ability or declares attack. Activation means ability on Stack, not spell cast.

## Zone/state

- **On Leave Field** — this card leaves Field.
- **On Send Grave** — this card enters Grave from any zone.
- **On Send Grave by Effect** — card effect puts this card into Grave; costs/rules/non-effect actions do not count.
- **On Destroy** — this card is destroyed and sent to Grave.
- **On Creature you Control Destroy** — creature you control is destroyed unless card restricts cause.
- **On Exile** — this card is exiled from any zone.
- **On Sacrifice** — this card is sacrificed or used as Ritual Creature material.
- **Flip** — face-down creature turns face up.

## Turn structure

- **On Upkeep** — start of your upkeep; specify opponent when required.
- **On End Step** — beginning of your end step; recurring permanent trigger.
- **This turn On End Step** — one-shot delayed end-step instruction created during resolution.

Use defined event keyword instead of prose when meanings match.

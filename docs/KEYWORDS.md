# Keywords

A keyword is an atomic term whose meaning comes from Magic rules, global cube rules, or an archetype rule instead of being repeated in full on every card.

## Closed taxonomy

1. [Action keywords](keywords/ACTIONS.md) — named commands that perform a defined operation.
2. [Event keywords](keywords/EVENTS.md) — named trigger or event conditions.
3. [Ability keywords](keywords/ABILITIES.md) — Magic evergreen or custom abilities.
4. [Cost and procedure keywords](keywords/COSTS_AND_PROCEDURES.md) — named costs, summon procedures, or activation shortcuts.

The website's per-keyword ruling text lives in `docs/keywords/{id}.md`, one lower-case kebab-case file per keyword. That file is the source of record for the published ruling; its `doc:` key names the module that narrates the keyword. UPPER_CASE files in `docs/keywords/` remain module docs and are published as doc pages; lower-case files never are. Adding a file publishes a new keyword on the next `cd website && npm run content`.

Render complete keyword invocations in bold with canonical capitalization. Unknown bold phrases are invalid until documented in one owning module. Ability metadata such as `Static`, `Triggered`, `Activated`, `Resolution`, `Flash`, `Sorcery`, `Ritual`, `Soft`, `Hard`, and `Hard Linked` belongs inside the ability prefix and is not keyword text.

Archetype-specific dictionaries live in each archetype's `KEYWORDS.md`.

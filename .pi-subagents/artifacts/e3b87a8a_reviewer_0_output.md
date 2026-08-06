## Review

- Correct: 50 includes → 50 unique card files; numbering `001/050`–`050/050`; 50 image refs resolve. Manifest additions at `cards_mse/01_pre_alpha/01_legend_of_alpha/01_YGO_Legend_of_Alpha.mse-set/set:59,65`; deck additions at `cards_mse/01_pre_alpha/stage.json:32-33`.
- Correct: Dance Princess scope matches decision: only effects performing Nekroz Ritual Summon at `cards_mse/01_pre_alpha/01_legend_of_alpha/01_YGO_Legend_of_Alpha.mse-set/card nekroz - dance princess:19`.
- Correct: S1–S4 retain proper-summon restrictions; no bypass text:
  - `.../card burning abyss - cir:21`
  - `.../card burning abyss - traveler:18`
  - `.../card nekroz - catastor:19`
  - `.../card leviair the sea dragon:26`
- Correct: D14 markup restored across mechanical names; examples `.../card d.d. crow:18`, `.../card burning abyss - barbar:21`, `.../card nekroz - brionac:19`.
- Correct: 26 runnable targeted `unittest` tests pass. `git diff --check` clean.

### Blockers

- Blocker: Brionac lacks required Sideboard exception. Current text always sends target to Deck at `cards_mse/01_pre_alpha/01_legend_of_alpha/01_YGO_Legend_of_Alpha.mse-set/card nekroz - brionac:20`. Fusion/Synchro/Xyz/Link target must go owner Sideboard. `tests/test_necroz_cards.py:68-71` codifies incomplete Deck-only text.
- Blocker: cleanup introduced 3 unapproved mechanic deltas:
  - Daigusto Emeral: `your Deck` → `their owners’ Decks`; ownership can change destination at `cards_mse/01_pre_alpha/01_legend_of_alpha/01_YGO_Legend_of_Alpha.mse-set/card daigusto emeral:20`.
  - Gungnir: `Discard this card` → named-fragment selector `Discard “Gungnir”`; potentially permits another matching card at `cards_mse/01_pre_alpha/01_legend_of_alpha/01_YGO_Legend_of_Alpha.mse-set/card nekroz - gungnir:19`. D14 authorizes markup restoration, not selector broadening.
  - Dance Princess: removed `other` from Exile target → broader legal selector at `cards_mse/01_pre_alpha/01_legend_of_alpha/01_YGO_Legend_of_Alpha.mse-set/card nekroz - dance princess:21`.

### Structural/style notes

- Note: style lint fails:
  - `cards_mse/01_pre_alpha/01_legend_of_alpha/01_YGO_Legend_of_Alpha.mse-set/card downerd magician:23: MSE004: unknown bold phrase 'After Attack or Block'`
  - Expected until D5 rule proposal applied.
- Note: cleanup changed canonical `the target` → `it`, conflicting with `docs/rules/TEMPLATING.md:61`. Changed examples:
  - `.../card burning abyss - calcab:21`
  - `.../card burning abyss - virgil:20`
  - `.../card nekroz - catastor:19`
  - `.../card silent honor ark:20`
  - `.../card tornado dragon:20`
  Tests reinforce divergence at `tests/test_non_archetype_creatures.py:32,38` plus `tests/test_non_archetype_non_creatures.py:38`.
- Note: Catastor Ward markup flattened from mana-cost markup to literal `<kw-a>Ward 2</kw-a>` at `.../card nekroz - catastor:20`. Export/manual render needed to confirm generic-mana glyph survived.
- Note: new Book, Draghig card files plus image assets remain untracked. Commit omission → tracked manifest/stage refs break.
- Note: accepted decisions lack regression coverage. No assertions for D1, D4, D5, Dance exact scope, Sideboard exception, S1–S4 absence of bypass. `tests/test_necroz_cards.py:68-95` checks fragments only; `tests/test_burning_abyss_cards.py:71-97` misses Cir/Traveler restrictions. No modified test checks actual `stage.json` membership.
- Note: `tests/test_mse_content.py` unavailable in current env → missing `PIL`. Other targeted tests pass.

### Complete rule-proposal candidates

**D1 — Variable ability-loss stat reset**

- Conflict: fixed `0/0` template at `docs/rules/TEMPLATING.md:76`; final cards use `0/1` at `.../card burning abyss - alich:21`, `.../card nekroz - clausolas:20`.
- Proposed rule: “Ability-loss/stat-reset effects use card-specified P/T. Canonical form: `The target Creature loses all its abilities and becomes P/T until the end of the turn.`”
- Boundary: card must state P/T; no implied default.
- Side effect: normalize clause order plus `the target`.

**D4 — Nested delayed event**

- Conflict: ability shape requires one event plus em dash at `docs/rules/TEMPLATING.md:13-24`; current delayed event at `.../card burning abyss - scarm:21`.
- Proposed rule: “`Primary Event — Secondary Event, instruction` creates one-shot delayed trigger at next occurrence of Secondary Event. Standalone `Secondary Event — instruction` remains recurring.”
- Boundary: nested event only inside resolving triggered/resolution text; define next-event timing explicitly.
- Side effect: distinguishes Scarm from recurring **On End Step** at `docs/keywords/EVENTS.md:46-47`.

**D5 — After-combat event**

- Conflict: catalog defines **On Attack or Block**, not **After Attack or Block**, at `docs/keywords/EVENTS.md:9-14`.
- Proposed rule: “**After Attack or Block** triggers after combat involving this Creature as attacker or blocker concludes.”
- Boundary: distinct from attack/block declaration events.
- Impact: `.../card downerd magician:23`; lint keyword catalog/tests.

**D8 — Deck shuffle plus Extra Deck redirection**

- Evidence: Brionac `.../card nekroz - brionac:20`; Virgil `.../card burning abyss - virgil:20`; Emeral `.../card daigusto emeral:20`.
- Proposed rule: “If Fusion, Synchro, Xyz, or Link Creature would move to Hand or Deck, return it to owner’s Sideboard instead. Otherwise, `shuffle [object] into its owner’s Deck` moves object to Deck then randomizes Deck.”
- Boundary: excludes Ritual Creatures; no redirection for Grave/Exile/Field movement.
- Brionac explicit fallback: `If target is Fusion, Synchro, Xyz, or Link Creature, return it to its owner’s Sideboard. Otherwise, shuffle it into its owner’s Deck.`
- Side effect: also affects **Bounce** on Calcab plus Deck movement on Virgil/Emeral.

**D9 — Bodyless custom-keyword invocation**

- Conflict: every ability currently requires body at `docs/rules/TEMPLATING.md:13-24`; bodyless recovery appears at:
  - `.../card nekroz - cycle:20`
  - `.../card nekroz - kaleidoscope:20`
  - `.../card nekroz - mirror:20`
- Proposed rule: “Numbered ability may consist solely of documented archetype custom keyword. Owning archetype keyword definition supplies complete effect.”
- Boundary: keyword must have complete definition; no bodyless base actions/events; non-archetype cards print full body.
- Existing definition: `docs/03_nekroz/KEYWORDS.md:3-7`.

**Pattern makers:** none beyond D8/D9 generalizations. D3, D11 remain one-card/archetype mechanics. D12 Alternative Cost, D13 `then`, zone defaults, ranges already documented.
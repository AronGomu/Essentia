# Rule review — Keyword bolding, capitalization, zones, and card-name italics

- Status: APPLIED
- Review ID: 2026-07-24-keyword-bold-italics-taxonomy
- Generated: 2026-07-24
- Applied: 2026-07-24
- Normalize after approval: true
- Source request: Define keywords and establish bold/capitalization/italics rules after auditing all canonical English MSE card text.

## Audit scope

- Audited 200 canonical English card files under `cards_mse/00_drafts/*/*.mse-set/card*`.
- Excluded frozen `French archive (removed)`.
- Compared MSE markup with `docs/CONTEXT.md`, `docs/RULES.md`, numbered archetype docs, and `docs/KEYWORDS.md`.
- No MSE cards were edited during this review.

## How to complete this review

Answer directly in this Markdown file. For every item, replace `TODO` with exactly one decision:

- `ACCEPT` — apply the proposed rule;
- `REJECT` — keep the current rule;
- `REVISE` — use the text in `Final wording`.

For `REVISE`, write the replacement rule under `Final wording`. Use `Notes` for rationale or implementation constraints. Do not remove IDs, questions, or evidence. When finished, change `Status` to `READY`, save the file, and tell the agent `continue`.

## Ruling contradictions — pattern destroyers

### D1 — Zone names are currently treated as bold keywords

- Scope: general
- Existing rule: Current docs classify canonical `Grave` as a keyword and require `<b>Grave</b>` in MSE (`docs/CONTEXT.md`, “Formatting abilities and keywords” and “Grave”; `docs/RULES.md`, “On Send Grave”).
- Conflicting evidence: Proposed rule says game zones use initial uppercase only, not bold: `Hand`, `Field`, `Deck`. Current cards contain 51 bold `Grave` instances, e.g. `cards_mse/00_drafts/03_non_archetype_creatures/03_YGO_Non_Archetype_Creatures.mse-set/card d.d crow:18`, `cards_mse/00_drafts/09_non_archetype_non_creatures/09_YGO_Non_Archetype_Non_Creatures.mse-set/card monster reborn:18`.
- Why this destroys a pattern: Accepting proposal changes `Grave` from keyword to proper game-zone vocabulary and requires removing bold markup project-wide.
- Question: Should all game-zone names be capitalized but never bold?
- Impacted cards/files: 96 `Grave`, 42 `hand`, 43 `field`, 29 `Deck`, 39 `exile`, 12 `Sideboard`, 4 `stack` occurrences across canonical MSE; 51 current `<b>Grave</b>` instances; both global rules docs; tests/generators containing literal text.
- Proposed resolution: Define canonical zone display names as `Hand`, `Field`, `Deck`, `Grave`, `Exile`, `Sideboard`, and `Stack`. Zone names receive initial uppercase and no bold unless included inside a larger bold compound keyword such as **Exile from Grave**.
- Side effects: Removes existing `<b>Grave</b>` markup; capitalizes many lowercase zone words; does not change zones or mechanics.
- Decision: ACCEPT
- Final wording:
- Notes: Accept recommended proposal.

### D2 — Action keywords currently alternate between keyword commands and ordinary verbs

- Scope: general
- Existing rule: Current docs bold only defined shortcut actions such as **Summon**, **Reanimate**, **Salvage**, **Reclaim**, **Release**, **Attach**, **Bounce**, **Negate**, **Set**, **Detach X**, and **Mill X**. Ordinary PSCT verbs such as `discard`, `exile`, `search`, `draw`, `target`, and `destroy` usually remain unbolded.
- Conflicting evidence: Proposed rule explicitly makes action keywords bold with initial uppercase: **Discard**, **Exile**, **Search**. Current cards use these as ordinary verbs, often mid-sentence and lowercase, e.g. `Discard Ash Blossom...` (`cards_mse/00_drafts/03_non_archetype_creatures/03_YGO_Non_Archetype_Creatures.mse-set/card ash blossom  joyous spring:18`), `...; exile it` (`card d.d crow:18`), `Search 1 “Spellbook”` (`cards_mse/00_drafts/13_spellbook/13_YGO_Spellbook.mse-set/card spellbook magician of prophecy:20`).
- Why this destroys a pattern: Same verbs would move from prose/PSCT instructions into formal keyword vocabulary. Mid-sentence capitalization may become nonstandard unless keywords are always treated as named commands.
- Question: Should **Discard**, **Exile**, and **Search** become formal action keywords everywhere, including mid-sentence uses?
- Impacted cards/files: 42 discard, 43 exile, 35 search occurrences; both global rules docs; most project tests; rendered cards.
- Proposed resolution: Define **Discard**, **Exile**, and **Search** as action keywords. Bold and capitalize exact command token wherever it performs that game action: `<b>Discard</b>`, `<b>Exile</b>`, `<b>Search</b>`. Conjugated/past forms require separate wording or remain prose unless explicitly added to keyword grammar.
- Side effects: Large MSE normalization; sentence-internal capital letters; possible wording changes for `exiled`, `discarded`, `searches`.
- Decision: ACCEPT
- Final wording:
- Notes: Accept recommended proposal.

## New possible rules — pattern makers

### R1 — Formal keyword taxonomy and markup contract

- Scope: general
- Evidence: Current global rule says “any keyword” is bold but does not provide a closed taxonomy test. User supplied three categories: action keywords, ability/evergreen/custom keywords, and zones.
- Existing rule: Keywords are bold; ability labels use `(x - Type)`; zones currently partly treated as keywords.
- Question: Should this reusable taxonomy become the controlling rule for deciding what receives bold markup?
- Proposed rule: A **keyword** is a project-defined atomic game term whose meaning is supplied by Magic rules, cube global rules, or an archetype rule instead of being fully explained on each card. Keywords belong to one of: (1) action keywords—named commands that perform a defined operation; (2) ability keywords—Magic evergreen abilities or custom global/archetype abilities; (3) event keywords—named trigger/event conditions; (4) cost/procedure keywords—named costs, summon procedures, or activation shortcuts. Render the complete keyword phrase in bold with canonical capitalization. Zone names, card types, ability metadata (`Static`, `Triggered`, `Activated`, `Resolution`, `Soft`, `Hard`, `Hard Linked`, `Flash`, `Sorcery`), numbers, selectors, and ordinary English instructions are not bold keywords unless a separate rule explicitly promotes them.
- Boundary and exceptions: Variable keyword arguments may remain within bold phrase (`Detach 2`, `Mill 3`, `Ward 2`). `Flash` inside ability metadata keeps existing MSE keyword styling if desired. Compound keywords are bold as one unit.
- Impacted cards/files: All 200 canonical MSE cards; global rules; archetype docs; tests/generators.
- Side effects: Gives deterministic test for future formatting; requires resolving doubtful list below.
- Decision: ACCEPT
- Final wording:
- Notes: Accept recommended proposal.

### R2 — Complete action-keyword boundary

- Scope: general
- Evidence: Canonical card corpus contains these candidate action verbs: discard (42), exile (43), search (35), draw (23), target (102), counter (22), choose (8), summon (49), return (9), destroy (37), put (19), send (50), cast (14), sacrifice (17), reveal (6), detach (25), attach (9), reanimate (13), salvage (7), release (5), reclaim (4), bounce (3), negate (2), set (1), flip (11), mill (3).
- Existing rule: Only selected compact shortcuts/actions are formally defined and bold; proposal explicitly adds **Discard**, **Exile**, **Search**.
- Question: Which verbs are formal action keywords versus ordinary PSCT instructions?
- Proposed rule: Use this closed action-keyword set: **Discard**, **Exile**, **Search**, **Summon**, **Hand Summon**, **Ritual Summon**, **Fusion Summon**, **Reanimate**, **Salvage**, **Reclaim**, **Release**, **Attach**, **Bounce**, **Negate**, **Negate & Destroy**, **Set**, **Detach N**, **Mill N**, **Scry N**, **Slow Blink N Any Creature**. Keep `draw`, `target`, `choose`, `counter`, `return`, `destroy`, `put`, `send`, `cast`, `sacrifice`, and `reveal` as ordinary verbs unless separately promoted.
- Boundary and exceptions: **Flip** can be an event/ability keyword rather than action. **Exile from Grave** and **Exile N [selector] from Grave** are compound cost/activation keywords, not ordinary **Exile** plus prose.
- Impacted cards/files: Most canonical MSE projects; global rule catalog and tests.
- Side effects: Determines bulk bolding/capitalization scope.
- Decision: REVISE
- Final wording: Use this closed action-keyword set: **Discard**, **Exile**, **Search**, **Summon**, **Hand Summon**, **Ritual Summon**, **Fusion Summon**, **Reanimate**, **Salvage**, **Reclaim**, **Release**, **Attach**, **Bounce**, **Negate**, **Negate & Destroy**, **Set**, **Detach N**, **Mill N**, **Scry N**, **Slow Blink N Any Creature**, **Draw**, **Target**, **Counter**, **Return**, **Destroy**, **Send**, **Cast**, **Sacrifice**, and **Reveal**.
- Notes: User-supplied revised closed catalog. `Choose` and `Put` remain ordinary instructions.

### R3 — Card names and name fragments use italics

- Scope: general
- Evidence: Cards currently refer to self by plain text (`Discard D.D. Crow`, `Discard Effect Veiler`) and refer to named/archetype selectors with typographic quotes but no italics (`“Spellbook”`, `“Shaddoll”`, `“Burning Abyss”`). Material lines use italics for a different reason. User proposes card names and partial card names in italics.
- Existing rule: Mechanical card/archetype/name-fragment references use typographic quotation marks `“...”`; no global italics rule exists.
- Question: Should all card-name and name-fragment references be italicized, and should typographic quotes remain?
- Proposed rule: Italicize every mechanical reference to a complete card name or card-name fragment in rules text. Keep typographic quotation marks around referenced names/fragments: `<i-auto>“Spellbook”</i-auto>`, `<i-auto>“Burning Abyss”</i-auto>`. Italicize unquoted self-name references: `<i-auto>D.D. Crow</i-auto>`. Do not italicize generic types, subtypes, attributes, supertypes, zones, or pronouns such as `this card`.
- Boundary and exceptions: Ability keywords named after an archetype remain bold, not italic, e.g. **Shaddoll Recovery**. A card name embedded inside an event keyword needs explicit nesting policy; recommendation: italic inside bold keyword only when it remains a selector, e.g. `<b>On Cast <i-auto>“Spellbook”</i-auto></b>`.
- Impacted cards/files: All quoted name selectors plus self-name references across canonical MSE; quote/name rules in both global docs; tests/renders.
- Side effects: Extensive markup; possible text-fit changes; MSE nested-markup validation required.
- Decision: ACCEPT
- Final wording:
- Notes: Accept recommended proposal.

### R4 — Ability metadata is styling, not bold keyword text

- Scope: general
- Evidence: Ability prefixes use italic/automatic MSE styling such as `(1 - Activated Flash Hard)`; some files encode `Flash` through `<kw-a><key>Flash</key></kw-a>`, while others leave `Flash`, `Sorcery`, `Soft`, and `Hard` plain inside `<i-auto>`.
- Existing rule: Ability labels and frequencies are mandatory structural metadata, but current docs loosely call some terms keywords.
- Question: Should ability metadata be excluded from the bold-keyword catalog?
- Proposed rule: `Static`, `Triggered`, `Activated`, `Resolution`, `Flash`, `Sorcery`, `Ritual` when used as activation timing, `Soft`, `Hard`, and `Hard Linked` are ability metadata. Keep them inside the italic ability prefix; do not add `<b>` markup. Existing `<kw-a><key>Flash</key></kw-a>` may remain as template styling but does not classify `Flash` as printed bold rules-text keyword.
- Boundary and exceptions: `Ritual Summon` is a procedure keyword and remains bold; standalone Magic ability **Flash**, if ever printed as an evergreen ability outside metadata, is bold.
- Impacted cards/files: Many activated abilities across all MSE projects; global rule definitions.
- Side effects: Prevents metadata from being swept by bulk keyword bolding.
- Decision: ACCEPT
- Final wording:
- Notes: Accept recommended proposal.

### R5 — Compound keyword capitalization and argument formatting

- Scope: general
- Evidence: Corpus has complete bold phrases such as **Detach 1 and Mill 3**, **Exile 1 Plant from Grave**, **On Enter or MV2+ Opponent Creature Enter**, **Protection from creatures**, **Ward 2**.
- Existing rule: Some X-form families exist, but capitalization/markup boundaries are not consolidated.
- Question: Should complete compounds, selectors, numeric arguments, and conjunctions stay inside one bold span?
- Proposed rule: Bold complete atomic compound keyword invocation, including fixed conjunctions and required arguments: **Detach 1 and Mill 3**, **Exile 1 Plant from Grave**, **Protection from creatures**, **Ward 2**. Use canonical title-style initial capitals only on lexical keyword components; keep grammatical connectors lowercase (`and`, `or`, `from`, `you`). Variables/selectors retain normal domain casing (`Plant`, `Grave`, `MV2+`).
- Boundary and exceptions: If actions are semantically independent, use separate bold spans joined by prose. Zone names inside compound keywords inherit compound bolding despite zone rule.
- Impacted cards/files: Current one-off compounds plus future cards; global docs.
- Side effects: Clarifies parser/test matching and MSE markup.
- Decision: ACCEPT
- Final wording:
- Notes: Accept recommended proposal.

### R6 — Mandatory card-style linter after MSE updates

- Scope: general
- Evidence: Card formatting currently relies on prose rules plus literal test fragments. Drift exists in bold zones, capitalization, keyword markup, and derived terms. User requires a lint script executed whenever card updates finish.
- Existing rule: Normalization runs tests and `git diff --check`, but no dedicated card-text style linter enforces keyword taxonomy, zone casing, or name italics.
- Question: Should repository add a mandatory read-only MSE card-style linter and wire it into normal verification?
- Proposed rule: Add `.script/lint_mse_card_style.py` as read-only canonical-English MSE linter. It parses every `include_file:` card from non-French `.mse-set` manifests, validates rich-text tag balance, keyword bolding/capitalization against centralized closed catalogs, zone capitalization/non-bold rules, card-name/name-fragment italics, ability-prefix formatting, and forbidden legacy forms. It reports `path:line`, rule ID, offending text, and suggested correction; exits `1` on violations and `0` on success. Add tests for valid/invalid fixtures. Invoke it after every MSE card create/update/normalize workflow and from the existing test suite so CI enforces it. Never rewrite cards automatically.
- Boundary and exceptions: Final catalogs and exact checks derive only from accepted/revised D1–D2 and R1–R5 decisions. Frozen `French archive (removed)` remains excluded. Parser must preserve BOM/newlines and inspect only `rule_text`, not flavor text or metadata unless a rule explicitly covers them.
- Impacted cards/files: New `.script/lint_mse_card_style.py`; new tests; workflow/skill verification docs; possibly a shared keyword catalog data file if needed by both linter and tests.
- Side effects: Existing violations will fail CI until normalized; deterministic style gate prevents drift.
- Decision: ACCEPT
- Final wording:
- Notes: Accept recommended proposal.

## Words and phrases in doubt

These require classification before normalization. Suggested class reflects current rules/corpus, not a final decision.

### Candidate action keywords

| Word/phrase | Current corpus treatment | Suggested class | Why doubtful |
|---|---|---|---|
| Discard | Plain; 42 uses | Action keyword per request | New promotion; conjugated forms unresolved |
| Exile | Mostly plain verb; 43 uses | Action keyword per request | Also zone noun; compound keywords exist |
| Search | Plain; 35 uses | Action keyword per request | Current shortcut has defined semantics but no bold |
| Draw | Plain; 23 uses | Ordinary instruction | Common Magic keyword action, but request boundary unclear |
| Target | Plain; 102 uses | Ordinary PSCT instruction | Rules term, not usually printed keyword |
| Counter | Plain; 22 uses | Ordinary instruction | Could overlap defined **Negate** |
| Choose | Plain; 8 uses | Ordinary instruction | PSCT selector, not shortcut |
| Destroy | Plain; 37 uses | Ordinary instruction | Common game action; not currently shortcut |
| Sacrifice | Plain; 17 uses | Ordinary/cost instruction | Could be promoted by same logic as Discard |
| Reveal | Plain; 6 uses | Ordinary instruction | No custom definition |
| Send | Plain; 50 uses | Ordinary instruction | Generic movement instruction |
| Put | Plain; 19 uses | Ordinary instruction | Generic movement instruction |
| Return | Plain; 9 uses | Ordinary instruction | Generic; **Bounce/Salvage/Reclaim** already specialize it |
| Cast | Plain; 14 uses | Ordinary game action | Event family **On Cast** exists |
| Summon | Bold shortcut in 14 locations; broader text has 49 uses | Action keyword | Also appears in proper-summon prose/restrictions |
| Detach N | Bold | Action/cost keyword | Variable argument boundary |
| Attach | Bold | Action keyword | Defined shortcut |
| Mill N | Bold | Action keyword | X/N form |
| Scry N | Bold once | Magic keyword action | Standard Magic keyword action, undocumented locally |
| Reanimate | Bold | Action keyword | Defined shortcut |
| Salvage | Bold | Action keyword | Defined globally, despite stale inventory saying undocumented |
| Reclaim | Bold | Action keyword | Defined globally |
| Release | Bold | Action keyword | Defined globally |
| Bounce | Bold | Action keyword | Defined shortcut; colloquial Magic term |
| Negate | Bold | Action keyword | Custom defined operation differs from `counter` |
| Negate & Destroy | Bold | Compound action keyword | Includes conjunction |
| Set | Bold | Action keyword | Defined custom action |
| Flip | Bold | Event/ability keyword | Can also be imperative action |
| Hand Summon | Bold once | Compound action keyword | Specific Summon shortcut |
| Slow Blink N Any Creature | Bold | Compound action keyword | Custom shortcut with selector |

### Candidate ability, event, cost, and procedure keywords

| Word/phrase | Suggested class | Why doubtful |
|---|---|---|
| Flying, Trample, Vigilance, Haste, Double Strike, Hexproof, Indestructible, Effect Indestructible, Ward N, Protection from ... | Magic evergreen/custom ability keywords | Should all Magic keyword actions/abilities follow same bold rule? |
| Bounded N | Custom ability keyword | Includes numeric argument; lowercase `bounded` later is currently bold once but likely ordinary derived adjective |
| Alternative Cost | Structural/cost label | Label vs keyword distinction |
| Xyz Alternative Cost | Procedure/cost label | Compound label |
| Fusion Alternative Cost | Procedure/cost label | Existing rule usually says Alternative Cost; possible legacy phrase |
| Abyssal Curse, Descent | Burning Abyss custom ability keywords | Archetype-only; docs naming exists but inventory stale |
| Shaddoll Recovery, Nekroz Recovery, Spell Affinity | Archetype custom keywords | Archetype-only |
| On Enter, On Send Grave, On Destroy, On Exile, On Sacrifice, On Upkeep, etc. | Event keywords | Complete event family should be closed/documented |
| On Enter or MV2+ Opponent Creature Enter | Compound event keyword | `MV2+` grammar and event-family composition |
| On Cast “Spellbook” | Parameterized event keyword | Card-name fragment italics nested inside bold |
| Ritual Summon, Fusion Summon | Procedure/action keywords | Also card supertypes and prose nouns |
| Flash | Ability metadata or evergreen keyword | Context-dependent formatting |
| Static, Triggered, Activated, Resolution, Soft, Hard, Hard Linked, Sorcery | Ability metadata | Structural terms, not printed keyword abilities |

### Candidate zones

| Term | Proposed canonical display | Why doubtful |
|---|---|---|
| hand | Hand | Magic normally uses lowercase; request says uppercase |
| field / battlefield | Field | Both forms exist; project uses `field` but current capitalization is inconsistent |
| Deck | Deck | Already usually uppercase |
| Grave | Grave | Currently bold in 51 instances; proposal says no bold |
| exile | Exile | Same spelling as action keyword **Exile**; noun/action distinction required |
| Sideboard | Sideboard | Already uppercase; cube proxy for Extra Deck |
| stack | Stack | Magic normally lowercase; request may include all game zones |
| Extra Deck | Extra Deck | General-doc term vs compact card-text `Sideboard` |

### Card-name reference doubts

| Case | Example | Proposed treatment |
|---|---|---|
| Full self-name as cost/source | `Discard D.D. Crow` | `**Discard** *D.D. Crow*` |
| Full other card name | named references where present | Italic + typographic quotes if mechanically referenced |
| Archetype/name fragment | `“Spellbook”`, `“Shaddoll”`, `“Burning Abyss”` | Keep quotes + add italics |
| Name inside keyword | `On Cast “Spellbook”` | Bold event phrase; italic quoted selector nested inside |
| Custom keyword containing archetype word | `Shaddoll Recovery` | Bold only; not italic |
| Pronoun/self shorthand | `this card` | Plain, not italic |
| Generic type/subtype | `Tuner`, `Wizard`, `Plant`, `Fusion Creature` | Plain, not italic |

## Mechanical cleanup found but not decision-bearing

- Current `docs/KEYWORDS.md` is stale: it lists several now-documented terms as undocumented and includes old French terms.
- `bounded` is bold once inside prose (`cards_mse/00_drafts/10_burning_abyss/10_YGO_Burning_Abyss.mse-set/card burning abyss - cherubini:23`); likely should be plain derived terminology if R1 is accepted.
- Zone capitalization is inconsistent (`hand`, `field`, `exile`, `stack` lowercase; `Deck`, `Grave`, `Sideboard` uppercase).
- Existing card tests often assert literal unformatted text and will need synchronized markup expectations after normalization.

## New possible rules count

- Pattern destroyers: 2
- Pattern makers: 6

## Application result

- Accepted: D1, D2, R1, R3, R4, R5, R6.
- Revised: R2 — closed action catalog uses the exact user-supplied list.
- Rejected: none.
- Skipped: none.
- Failed: none.
- Rules synchronized: `docs/CONTEXT.md`, `docs/RULES.md`, affected archetype docs, and `docs/KEYWORDS.md`.
- Canonical MSE normalization: 154 changed cards across all 10 English projects; 184 manifest-included cards linted/export-verified; frozen French archives unchanged.
- Enforcement added: `.script/lint_mse_card_style.py`, synchronized `.script/_kw_inventory.py`, and unit/CLI regression tests.
- Renders/provenance refreshed for all affected projects.

## Post-application amendment — location/type case and self-name costs

- User-approved: 2026-07-24.
- `Grave` remains canonical zone spelling/case; lowercase `grave`, `graveyard(s)`, `GY`, `GYD`, and `G.Y.` are invalid in card text.
- `Creature(s)` and `Spell(s)` are canonical card-type terms; capitalize them and keep them plain when standalone.
- Atomic keywords retain bold around complete phrases, including type/location terms.
- Every mechanical full/partial card-name reference remains italic regardless of role. This explicitly includes self-names used as activation conditions or costs, e.g. `**Discard** *Effect Veiler*`.
- Applied to all manifest-included canonical English cards; French archives excluded.

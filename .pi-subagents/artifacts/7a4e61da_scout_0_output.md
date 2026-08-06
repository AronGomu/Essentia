# Code Context

## Files Retrieved
1. `cards_mse/01_pre_alpha/01_legend_of_alpha/01_YGO_Legend_of_Alpha.mse-set/set` (lines 1-109) — 50-card manifest; adds Book, Draghig.
2. `cards_mse/01_pre_alpha/01_legend_of_alpha/01_YGO_Legend_of_Alpha.mse-set/card *` (all 50 files, complete; changed tracked files lines 1-27; new Book lines 1-24, Draghig lines 1-27) — full UTF-8-SIG reads. 48 tracked changed cards plus 2 untracked cards.
3. `cards_mse/01_pre_alpha/stage.json` (lines 1-50) — Burning Abyss deck adds `burning-abyss-draghig`, `book-of-moon`.
4. `docs/rules/TEMPLATING.md` (lines 1-77), `docs/RULES.md` (lines 1-17), `docs/rules/SUMMONING.md` (lines 1-45) — governing global rules.
5. `docs/01_burning_abyss/{CONTEXT,RULES,KEYWORDS}.md` (complete), `docs/03_nekroz/{CONTEXT,RULES,KEYWORDS}.md` (complete), `docs/ADR/proposed/0003-nekroz-reconciliation.md` (complete) — current numbered docs. Card `notes:` still cite obsolete `docs/10_burning_abyss` / `docs/12_nekroz` paths.
6. Siblings read complete: `card burning abyss - alich`, `card burning abyss - traveler`, `card nekroz - cycle`, `card nekroz - kaleidoscope`, `card d.d. crow`, `card effect veiler`, `card evilswarm exciton knight`.
7. `.agents/skills/fix-mse-cards/SKILL.md` (lines 1-190), `.script/mse_content.py` (relevant loader refs), `.script/sync_burning_abyss_from_mse.py` (project refs), `tests/test_{mse_content,burning_abyss_cards,necroz_cards,non_archetype_creatures,non_archetype_non_creatures,mse_project_menu,release_package}.py` (complete/relevant project sections).

## Key Code

### Phase 0-1 fact inventory
- Scope status: 48 modified tracked cards, modified `set`, modified `stage.json`; 2 untracked cards; 2 untracked project art PNGs; 3 untracked root alias images (`image1..3`). No scoped deletion.
- Every changed/scoped text file read completely using `encoding="utf-8-sig"`. All 50 cards currently have BOM. Tracked edit broadly changes `mse_version: 2.5.8` → `2.1.2`, adds BOM, converts valid MSE tags to `<error-spelling...>` wrappers, renumbers codes from 48 → 50.
- Manifest: 50 includes; 50 `card *` files; no duplicate/missing include; no orphan card.
- Card codes: all totals `050`; 148 fields found. Two cards expose fewer than 3 code fields (`Effect Veiler`, one other pre-existing layout), but every present total/index valid.
- Image resolution: all non-empty card `image:` refs resolve, including root aliases `image1`/`image2`. `mse_images/book-of-moon-image.png`, `mse_images/burning-abyss-draghig-image.png`, `mse_images/downerd-magician-image.jpg` are unreferenced project-local images. First 2 appear duplicate/stale beside new root aliases; Downerd pre-existing orphan. `image3` is unreferenced root alias.
- New Book: U common Instant, Alternative Cost, face-down effect (`card book of moon:9-24`). New Draghig: B 2/2 common Fiend, Abyssal Curse/Descent, discard-then-draw (`card burning abyss - draghig:9-27`). Both included once; deck IDs added in `stage.json`.
- No script located that generates Legend card text. Tests directly inspect active project. `tests/test_mse_content.py:105-108` still asserts draft Nekroz has 19 cards despite context saying draft empty/current cards active → stale assumption risk.

### Semantic difference ledger
Interpretation choices for every ID: **user error** (restore prior/documented mechanic), **accepted archetype/card change** (keep MSE), **pattern destroyer** (keep MSE plus reusable rule proposal). Pure unambiguous typography/grammar omitted from semantic ledger, queued for later workflow.

- **D1 — Alich stat reset 0/0 → 0/1.** MSE `card burning abyss - alich:21`; conflict `docs/rules/TEMPLATING.md:76` mandates loses abilities + becomes 0/0. Card mechanic plus global syntax contradiction. Options: user error / accepted card exception / pattern destroyer permitting 0/1 reset.
- **D2 — Barbar loses target, changes one opponent → all opponents.** MSE `card burning abyss - barbar:21`; conflict `docs/rules/TEMPLATING.md:23-28,61-62` activation target ordering/preservation. Damage scope materially expands. Options apply.
- **D3 — Rubic gains Synchro-material restriction.** MSE `card burning abyss - rubic:21`; no current BA local rule; `docs/01_burning_abyss/RULES.md:3-5` lists only Descent/Curse/proper summon. Card-specific new mechanic; normally accepted card change, not pattern destroyer unless generalized.
- **D4 — Scarm delayed trigger changed to nested `On End Step`.** MSE `card burning abyss - scarm:21`; conflict `docs/rules/TEMPLATING.md:13-24` one ability prefix/event structure. Could mean delayed trigger vs immediate registration of independent event. Options apply; likely pattern destroyer if nested event syntax intended.
- **D5 — Downerd `On Attack or Block` → `After Attack or Block`.** MSE `card downerd magician:21`; no documented `After Attack or Block` event; `docs/rules/TEMPLATING.md:22,49` requires documented/bold event keyword. Timing may move detach after combat event. Options apply; pattern destroyer if new event keyword.
- **D6 — Effect Veiler target/Stack semantics.** MSE `card effect veiler:18` removes “on Field,” changes two sentences to `it loses ... and Counter ... in the Stack`. Conflict `docs/rules/TEMPLATING.md:23-27,77`; target zone and resolution grammar affect what can be targeted/countered. Options apply.
- **D7 — Exciton color B → W.** MSE `card evilswarm exciton knight:10`; prior tracked value B. Card-specific affinity change; user error vs accepted card change only.
- **D8 — Brionac Bounce → bare Shuffle.** MSE `card nekroz - brionac:20`; prior was `Bounce`; existing unresolved ADR already owns destination question at `docs/ADR/proposed/0003-nekroz-reconciliation.md:56-67`. Bare Shuffle omits destination/owner → mechanically incomplete. User error / accepted card destination with explicit wording / pattern destroyer defining `Shuffle`.
- **D9 — Nekroz Recovery bodies deleted.** MSE Cycle `card nekroz - cycle:20`, Kaleidoscope `card nekroz - kaleidoscope:20`, Mirror `card nekroz - mirror:20` now print label only. `docs/03_nekroz/KEYWORDS.md:3-7` defines label as full effect, so label-only may be valid compact keyword invocation; however ability-format rule requires event/custom keyword then em dash/body (`docs/rules/TEMPLATING.md:13-24`). Options: accept keyword shorthand/card change; restore expanded text; pattern destroyer explicitly allowing bodyless custom keyword abilities.
- **D10 — Kaleidoscope plurality reduced.** MSE `card nekroz - kaleidoscope:19` changes `1 or more` to `1` while retaining plural “Creatures/their/cost(s),” plus second branch singular `its Ritual cost`. Conflict `docs/rules/SUMMONING.md:23` explicitly supports one or more plus plural agreement. Consequence: one summon vs multi-summon ambiguous. Options apply.
- **D11 — Dance Princess response lock broadened/unclear.** MSE `card nekroz - dance princess:19` changes “effects that Ritual Summon 1 Nekroz Creature” to “effects for Nekroz Creature.” Scope may include effects not performing summon. User error vs accepted card change; pattern destroyer only if `effects for` becomes reusable selector.
- **D12 — New Book zero-cost condition.** MSE `card book of moon:18-20`; conforms Alternative Cost placement `docs/rules/TEMPLATING.md:30`, but entirely new card mechanic. User error vs accepted card change; no general conflict.
- **D13 — New Draghig looting order lacks separator/dependency.** MSE `card burning abyss - draghig:21`; `docs/rules/TEMPLATING.md:23-28` says costs/targets before `;`, `then` ordered/dependent. Current effect can mean discard as resolution then draw, unlike likely cost. User error / accepted resolution sequence / pattern destroyer only if no-semicolon activation syntax intended.
- **D14 — broad removal of italics/self-name markup.** Examples `card d.d. crow:18`, `card nekroz - brionac:19`, all edited archetype/name refs. Direct conflict `docs/rules/TEMPLATING.md:5-9`. Mechanical references remain identifiable, but reusable project-wide naming pattern destroyed. Restore markup vs accept pattern destroyer. `<error-spelling...>` is editor residue, not semantic markup substitute.

### Illegal Summons requiring explicit decision
Rules: `docs/rules/SUMMONING.md:5-19`. Workflow requires explicit permission interview; never infer.
- **S1 Cir:** `card burning abyss - cir:21` Reanimates any BA Creature from Grave. Selector can include improperly summoned Ritual/Extra Deck BA cards → illegal absent `ignoring the restrictions of summon`.
- **S2 Traveler:** `card burning abyss - traveler:18` Reanimates any number of BA Creatures. Same issue, potentially Dante/Virgil/Ritual cards → explicit decision mandatory.
- **S3 Catastor:** `card nekroz - catastor:19` Reanimates Nekroz Ritual Creature from Grave. Nekroz Ritual restriction `docs/03_nekroz/RULES.md:5-9` makes bypass mandatory if intent includes unproperly summoned cards.
- **S4 Leviair:** `card leviair the sea dragon:20` Releases any exiled MV 1 Creature. Selector can catch improperly summoned restricted type → explicit permission decision or selector restriction needed.
- Exa already says `ignoring the restrictions of summon` (`card nekroz - exa:20`) → legal movement, not proper summon. Kaleidoscope/Cycle/Mirror perform matching Ritual Summon → no bypass issue.

### Nonsemantic Phase-5 queue, not ledger
Malformed/grammar examples: `opponents Creatures` (Bagooska), `Creature Grave` (Cir), `<b>Reanimate </b>any` plus redundant “to Field” (Traveler), `Target 1 in 1 Grave` (Crow), `AND` + space before colon (Exciton), `Discard 1`/`Draw 1` missing object (Virgil/Valkyrus), `Shuffle` missing destination (Brionac unless D8 decides), MSE spellcheck wrappers everywhere, obsolete notes paths, subtype empty-tag churn, missing italics, lowercase `summon` in Exa permission. These need later normalization only after semantic decisions.

## Architecture
`set` include order → MSE loader/card numbering. Card `image:` → project-root asset/alias. `stage.json` deck stable IDs → lifecycle/deck composition. Global docs own summon/templating; `docs/01_burning_abyss` + `docs/03_nekroz` own local exceptions; active tests read same pre-alpha project. Proposed Nekroz ADR remains `AWAITING_USER`; current edits overlap its D1/R1/R2/R3 questions, so later workflow must reconcile rather than duplicate.

## Start Here
Open `cards_mse/01_pre_alpha/01_legend_of_alpha/01_YGO_Legend_of_Alpha.mse-set/set:55-109`, then resolve S1-S4 mandatory summon questions, then D1-D14 conflict interview. No files edited.
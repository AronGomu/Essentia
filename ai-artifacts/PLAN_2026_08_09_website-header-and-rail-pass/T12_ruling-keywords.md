# T12: Add the eight ruling keywords

**Plan:** `./ai-artifacts/PLAN_2026_08_09_website-header-and-rail-pass.md`
**Depends:** none
**Commit outcome:** The eight ruling keywords the user authored exist in the
docs and surface in the card preview.

## Context (self-contained)

`feedback.md`'s second section was never scoped by this plan and never
delivered. A reviewer CONFIRMED that `docs/keywords/` holds 77 files, none of
which is `resolution.md`, `static.md`, `triggered.md`, `activated.md`,
`soft.md`, `hard.md`, `linked.md` or `trap.md`, and that the directory is
untouched by this branch.

The user wrote out all eight definitions in full. **Use this text as the
source of truth** — it is verbatim from `feedback.md:10-19`. Fix only spelling
and grammar; do not reinterpret the rules.

```
Must add keywords to docs and show them in card preview for :

- Resolution : Effect when non-permanent (instant, sorcery) card is resolving on the stack.
- Static : Passive ability. Do not use the stack. Active as soon card enter required zone to take effect. Default zone is Field.
- Triggered : Ability is activated anytime the condition is fulfilled after resolution of the trigger effect.
- Activated [[Sorcery/Flash]] : Ability that you activate yourself when you have priority and timing. Sorcery means only activable any time you can play a sorcery. Flash is MTG keyword : any time you have priority (even in opponent turn).
- Soft : You can only use this ability once per turn on the field. Other copies or new instance of the card (dies and reanimated) can activate or trigger same ability.
- Hard : You can only use this ability of {Name of the Card} only once per turn. All other copies of the same card cannot activate or trigger their effect.
- Linked : All *soft* abilities are grouped together. Same independantly for _hard_ abilities. If one the linked abilities is activated or triggered, all other other abilities cannot be used this turn following same *Soft* or _Hard_ rulling.
- Trap (in card super type) : Cannot be cast from hand. Can only be set face down.
```

Note "Trap" is qualified "(in card super type)" — it is a super-type keyword,
not an ability keyword. `Activated [[Sorcery/Flash]]` names one keyword with two
timing variants.

Before writing anything, establish two facts from the repo (use
`graphify query`, then read):

1. The shape of an existing `docs/keywords/*.md` file, and whether the
   directory has an index or registry that must also be updated. `ABILITIES.md`
   and `ACTIONS.md` suggest grouped files exist alongside per-keyword files —
   determine which shape these eight belong in.
2. How a keyword reaches the card preview — i.e. what makes an existing keyword
   render there. Follow that existing path; do not invent a new one.

If (2) turns out to require changes under `website/scripts/content/`, that is
permitted for this ticket (it was Scope Out for the original seven tickets, but
this ticket supersedes that for the keyword pipeline only). Do not touch
`cards_mse/`.

### Environment — verified by the parent, do not rediscover

- **Playwright cannot launch natively on this host** (NixOS, missing
  `libglib-2.0.so.0` / `libgtk-3.so.0`; `install-deps` needs blocked sudo).
  Run e2e through Docker:

  ```bash
  cd /home/aron/projects/essentia/website && docker run --rm --ipc=host \
    -v /home/aron/projects/essentia:/work -w /work/website \
    mcr.microsoft.com/playwright:v1.61.1-noble \
    bash -c "npm ci --no-audit --no-fund && npx playwright test tests/e2e/<spec>.spec.ts"
  ```

  The in-container `npm ci` is required and must run first, in the same
  `bash -c`. The config starts its own web server against `dist`.

- **After every Docker Playwright run, delete `website/playwright-report/` and
  `website/test-results/` before running `npm run ci` on the host** — otherwise
  `astro check` walks them and dies with `JavaScript heap out of memory`. Then
  confirm `find /home/aron/projects/essentia/website -not -user aron` is empty.

- **Pixel tolerances in this ticket's test code are guidance, not contract.** If
  one is unsatisfiable purely because of an untouched, out-of-scope value,
  widen it to the structural value plus slack and comment where the number came
  from. Do not chase it by editing out-of-scope CSS, and do not report it as a
  plan defect.

- **The built site runs a hashed CSP.** `website/scripts/harden-csp.mjs`
  rewrites `style-src`/`script-src` `'unsafe-inline'` into `sha256-`
  allowlists at build. A `<style>` block is hashed and works; a per-element
  `style="…"` **attribute** is blocked (that would need `'unsafe-hashes'`).
  `npm run dev` keeps `'unsafe-inline'`, so CSP bugs reproduce only in the
  built site — verify through the Docker runbook, which serves `dist`.

- **Only 3 of 5 configured sections publish here** (sole release
  `LOTA-0001-Alpha_0.1`): Non-archetype, Burning Abyss, Nekroz. Assertions that
  enumerate rail labels must expect three. Do not touch `cards_mse/`.

- **`.utility-nav a` (`global.css:1671`) is NOT dead — do not delete it.** An
  earlier note called it dead; a reviewer refuted that. `.utility-menu` is a
  child of `nav.utility-nav`, so the descendant selector still matches all
  three popover links, and being **unlayered** it beats `.utility-menu a` in
  `@layer layout`. It supplies the `⋯` menu's actual
  `min-height: 2.45rem; font-size: 0.85rem; padding: 0.35rem 0.5rem`.

- Shipped on this branch already, do not undo: T1 `9057dae` full-width header
  above the rail; T2 `ad45513` one square rail toggle; T3 `eebffe9` flat rail +
  drawer; T4 `017f911` accent tints; T5 `d712955` compact ≤44rem header with a
  native `⋯` popover; T6 `41b780e` single-row guard; T7 `4af3bd8` hero pass.


## Requirements

1. All eight keywords exist in `docs/keywords/` following the directory's
   existing conventions, with the user's definitions.
2. Each renders in the card preview by the same mechanism existing keywords use.
3. Existing keywords keep working.
4. No card data changes.

## Inputs

- `docs/keywords/` (77 existing files — read several for shape)
- whatever surfaces keywords in the card preview (establish it, then list it here)
- `feedback.md:8-19` — the authored definitions

## TDD

1. **Red** — add a test asserting each of the eight keywords resolves in the
   card preview path; confirm it fails.
2. **Green** — add the docs and any wiring.
3. **Refactor** — keep green.

## Impl steps

- [ ] 1. Establish and write into this ticket: the keyword file shape, any
      index/registry, and the exact path a keyword takes to the card preview.
- [ ] 2. Add the failing test from TDD. Confirm red.
- [ ] 3. Author the eight keyword entries, correcting only spelling/grammar
      (`independantly` → `independently`, `rulling` → `ruling`, the doubled
      "other other"). Keep the user's meaning exactly.
- [ ] 4. Wire them into the preview by the established mechanism.
- [ ] 5. Run the test; confirm green.
- [ ] 6. Verify in a real page through the Docker runbook that a card whose
      text uses one of these keywords shows its ruling.
- [ ] 7. Delete `website/playwright-report/` and `website/test-results/`, then
      run `cd website && npm run format && npm run ci`.
- [ ] 8. Run `python -m unittest discover -s tests` from the repo root — the
      keyword docs are also consumed by Python tooling; confirm still green.
- [ ] 9. Run `graphify update .` from the repo root.

## Outputs

- Files touched: `docs/keywords/*`, preview wiring, tests.
- Behaviour change: eight new ruling keywords available in the card preview.

## Validation

- [ ] all eight keywords present in `docs/keywords/` in the house shape
- [ ] each renders in the card preview — observed on a real page
- [ ] `cd website && npm run ci` exits 0
- [ ] `python -m unittest discover -s tests` green
- [ ] commit msg draft: `feat(docs): add the eight ruling keywords and surface them in card preview`

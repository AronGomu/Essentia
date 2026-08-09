# T9: Lower the "New" badge off the mana cost

**Plan:** `./ai-artifacts/PLAN_2026_08_09_website-header-and-rail-pass.md`
**Depends:** none
**Commit outcome:** The `New` tile badge sits on the artwork instead of covering
the card's mana cost.

## Context (self-contained)

`feedback.md` opens with a section this plan never scoped and never delivered:

```
## "New" Badge

Set css "top" property for tile-badge to "2rem".
Context : Current position hide manacost of cards which is essential information.
This lower position to be on artwork only.
```

Current state, verbatim: `website/src/styles/global.css:696-698` declares
`.tile-badge { position: absolute; top: 0.9rem; … }`.
`git diff main..HEAD -- website/src/styles/global.css | grep tile-badge` is
empty — no ticket in this plan touched it.

The user gave both the exact value (`2rem`) and the reason (the badge overlaps
the mana cost, which is essential information). Take the value as authored.

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

1. `.tile-badge` resolves `top: 2rem`.
2. The badge no longer overlaps the mana cost on a card tile at any width.
3. Nothing else about the badge (right offset, colours, z-index) changes.

## Inputs

- `website/src/styles/global.css` (`.tile-badge`, ~line 696)
- `website/tests/support/css.ts` — `resolve(css, selector, property, widthPx)`
- a tile-rendering test file of your choosing under `website/tests/unit/`

## TDD

1. **Red** — add a unit test asserting `resolve(css, '.tile-badge', 'top', w)`
   is `'2rem'` at 1440/1280/900/704/390; confirm it fails.
2. **Green** — change the declaration.
3. **Refactor** — none.

## Impl steps

- [ ] 1. Add the unit test described in TDD; run it; confirm red.
- [ ] 2. Change `.tile-badge`'s `top: 0.9rem` to `top: 2rem` in `global.css`.
- [ ] 3. Run the unit test; confirm green.
- [ ] 4. Visually confirm through the Docker runbook at 1400×900 on `/` that the
      badge sits over artwork and clears the mana cost. Capture the evidence.
- [ ] 5. Delete `website/playwright-report/` and `website/test-results/`, then
      run `cd website && npm run format && npm run ci`.
- [ ] 6. Run `graphify update .` from the repo root.

## Outputs

- Files touched: `website/src/styles/global.css`, one unit test.
- Behaviour change: `New` badge moves down 1.1rem.

## Validation

- [ ] the new unit test passes
- [ ] `cd website && npm run ci` exits 0
- [ ] observed: badge clears the mana cost on a real tile
- [ ] commit msg draft: `fix(website): drop the new badge clear of the mana cost`

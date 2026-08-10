# T1: Reading-surface design tokens

**Plan:** `./ai-artifacts/PLAN_2026_08_07_website-feedback-pass-2.md`
**Depends:** none
**Commit outcome:** Docs/blog reading tokens are declared in `global.css` and documented in `website/DESIGN.md`; site renders exactly as before.

## Context (self-contained)

- Goal: ship feedback batch 2 on the Astro site under `website/` — correct card rule
  text, restyle docs/blog, retractable rail, wider search, flash-free transitions.
- This slice: the **only** ticket with a user-interactive step. Feedback says
  *"Define style for docs section. This is too much dark black. Use impeccable skill and
  interactively help me to define design for docs and blog, building on top of already
  existing DESIGN.md"*. Run that session here, freeze the outcome as CSS custom
  properties + a `DESIGN.md` section, so T9 can build against fixed values.
- Out of scope here: touching any page, component or layout. No selector may consume
  the new tokens in this commit. Do not edit `docs/DESIGN.md` (that is the card-design
  doc, published to the site); the site design system is `website/DESIGN.md`.
- Assumptions in force: A1 (`ai-artifacts/`), A2 (ADR path `docs/ADR/proposed/NNNN-slug.md`),
  A7 (default token values below ship even if the interactive session is skipped).

## Requirements

- Run the `impeccable` skill with the user for the docs + blog reading surfaces,
  building on the existing `website/DESIGN.md` ("The Blackfoil Archive").
- Emit exactly the 8 token names listed below, in `:root` inside `@layer tokens` of
  `website/src/styles/global.css`. The session may change **values**; it may not add,
  rename or drop token names — T9 quotes these names verbatim.
- Document the same 8 names in a new `## Reading Surfaces (Docs & Blog)` section of
  `website/DESIGN.md`, each with its value and its jurisdiction sentence.
- Record the decision as `docs/ADR/proposed/0020-reading-surfaces-for-docs-and-blog.md`.
- Append this feedback batch to `.dev/feedback.md` under a dated heading with `Status: open`.

## Inputs

- `website/DESIGN.md` — existing design system; §Colors names Blackfoil / Sleeve /
  Ruleline / Cardstock / Silver Ink and the "Neutral Night Rule" (dark substrate is
  chroma-zero). The new reading tokens deliberately carry a **small** chroma so long-form
  text panels read warmer than the gallery shell; the ADR must justify that exception.
- `website/src/styles/global.css` — `@layer reset, tokens, base, layout, components, motion, utilities;`
  on line 1; `:root` block opens at line 4 with `--blackfoil: oklch(0.08 0 0);`.
- `.dev/feedback.md` — backlog file, newest entry on top, template comment at the head.
- `docs/ADR/proposed/` — highest existing number is `0019`.
- **From Depends:** none.

## Decided token values — FROZEN by the impeccable session (2026-08-08)

The design session ran and changed these values. The drafted defaults were wrong:
`oklch(0.145 0.006 188)` renders `#080b0b` against a `#020202` page — a **1.05:1**
lift, an invisible panel that would not have answered the feedback at all. The
session also identified the real defect behind *"too much dark black"*: body ink
`--cardstock` `#e6edec` on `--blackfoil` `#020202` is **17.5:1**, max-contrast
halation, which reads as harsh rather than dark.

Insert these immediately after the `--sidebar: 17rem;` line inside `:root`:

```css
    /* Reading surfaces — long-form docs and blog prose. A lit reading room
       inside the dark archive: the substrate lifts well clear of the gallery
       black and carries a small WARM chroma, so prose reads as paper under a
       lamp and sits perceptually opposite the cool card art beside it. Ink is
       deliberately below maximum to kill halation on long text.
       See website/DESIGN.md § Reading Surfaces and docs/ADR/proposed/0020. */
    --reading-surface: oklch(0.27 0.008 80);
    --reading-surface-raised: oklch(0.325 0.009 80);
    --reading-ink: oklch(0.94 0.012 80);
    --reading-ink-muted: oklch(0.78 0.016 80);
    --reading-rule: oklch(0.44 0.01 80);
    --reading-measure: 70ch;
    --reading-rail: 17rem;
    --reading-toc: 15rem;
```

Rendered values and verified contrast (WCAG 2.2, sRGB):

| Token                      | Hex       | Pair                        | Ratio    |
| -------------------------- | --------- | --------------------------- | -------- |
| `--reading-surface`        | `#282622` | vs `--blackfoil` page       | 1.38:1 lift |
| `--reading-surface-raised` | `#37342f` | vs `--reading-surface`      | 1.21:1 step |
| `--reading-ink`            | `#efeae2` | on `--reading-surface`      | **12.64:1** (AAA) |
| `--reading-ink`            | `#efeae2` | on `--reading-surface-raised` | **10.44:1** (AAA) |
| `--reading-ink-muted`      | `#bdb6ac` | on `--reading-surface`      | **7.53:1** (AAA) |
| `--reading-ink-muted`      | `#bdb6ac` | on `--reading-surface-raised` | 6.22:1 (AA) |
| `--reading-rule`           | `#55524c` | vs `--reading-surface`      | 1.94:1 divider |

Accents landing on the reading surface: `--relic` 6.35:1, `--gold` 7.48:1,
`--ice` 7.82:1, `--ember` 4.84:1 — all pass AA body. Existing `--cardstock`
(12.68:1) and `--silver-ink` (7.06:1) also remain legal on it, so a component
that has not migrated yet is never illegible.

**Session-decided jurisdiction rules** — T9 must honour both:

- **The Reading Contrast Rule.** Long-form text uses `--reading-ink` on
  `--reading-surface`. `--reading-ink-muted` is metadata only, and never on
  `--reading-surface-raised` where it drops to AA.
- **The Lit Room Rule.** Only the prose panel and its rails lift. The site
  header, the catalog rail and the page gutter stay on `--blackfoil`, so a
  reading page still reads as the same archive with one room lit — this is the
  agreed mitigation for choosing the bold lift over the subtle one.

## Check plan

| Test                                  | Input                       | Expect                                                     |
| ------------------------------------- | --------------------------- | ---------------------------------------------------------- |
| `declares every reading token once`   | `src/styles/global.css`     | each of the 8 names appears exactly once as `--name:`       |
| `declares reading tokens inside :root`| `src/styles/global.css`     | all 8 occur between `:root {` and its closing `}`          |
| `documents every reading token`       | `DESIGN.md`                 | file has `## Reading Surfaces (Docs & Blog)` and all 8 names |
| `keeps ink above surface lightness`   | `src/styles/global.css`     | parsed `oklch()` L of `--reading-ink` > `--reading-surface` + 0.5 |
| `does not consume the tokens yet`     | `src/styles/global.css`     | `var(--reading-` occurs 0 times                             |

## TDD

1. **Red** — write `website/tests/unit/reading-tokens.test.ts` with the 5 tests above;
   run `cd website && npx vitest run tests/unit/reading-tokens.test.ts`; expect failures.
2. **Green** — add the tokens and the `DESIGN.md` section until all 5 pass.
3. **Refactor** — none expected.

## Impl steps

- [x] 1. ~~Run the docs/blog design session with the user.~~ **Done 2026-08-08.** The
      user chose: bold lift (`L 0.27`), warm vellum (hue 80), measure 70ch, rail
      17rem, toc 15rem. Values above are frozen; token names unchanged. Do not
      re-run this step — build against the frozen block.
- [x] 2. Create `website/tests/unit/reading-tokens.test.ts`. Read both files with
      `readFileSync` from `node:fs`, relative to `import.meta.dirname`
      (`../../src/styles/global.css`, `../../DESIGN.md`). Use a
      `const TOKENS = ['--reading-surface','--reading-surface-raised','--reading-ink','--reading-ink-muted','--reading-rule','--reading-measure','--reading-rail','--reading-toc'] as const;`
      Parse lightness with `/--reading-ink:\s*oklch\(([\d.]+)/`.
      **Evidence:** file created at `website/tests/unit/reading-tokens.test.ts` (5 tests).
- [x] 3. Run `cd website && npx vitest run tests/unit/reading-tokens.test.ts` — confirm red.
      **Evidence:** `Tests 4 failed | 1 passed (5)` before tokens were added.
- [x] 4. Insert the token block into `website/src/styles/global.css` after `--sidebar: 17rem;`,
      substituting any values the session changed.
      **Evidence:** 8 `--reading-*` declarations now present in `website/src/styles/global.css`
      `:root`, verbatim frozen values from this ticket.
- [x] 5. Append `## Reading Surfaces (Docs & Blog)` to `website/DESIGN.md` after the
      `## Colors` section. One bullet per token: name, value, one-sentence jurisdiction.
      Add a closing rule sentence: **The Reading Contrast Rule.** Long-form text uses
      `--reading-ink` on `--reading-surface`; `--reading-ink-muted` is for metadata only.
      **Evidence:** `website/DESIGN.md` now has `## Reading Surfaces (Docs & Blog)` between
      `## Colors` and `## Typography`, with all 8 token names, the Reading Contrast Rule,
      and the Lit Room Rule.
- [x] 6. ~~Reconcile `docs/ADR/proposed/0020-reading-surfaces-for-docs-and-blog.md`.~~
      **Done 2026-08-08.** The session changed the shape, not only the values: the
      exception is now warm hue 80 rather than relic hue 188, the lift is justified
      explicitly, and a new decision 8 (**The Lit Room Rule**) was added. Decision
      items 4 and 8 are updated. No further ADR edit needed.
- [x] 7. Prepend to `.dev/feedback.md` (below the HTML comment template) a
      `## 2026-08-07 — website feedback batch 2` heading with `Status: open` and the raw
      feedback list, so the backlog stays the record of record.
      **Evidence:** `.dev/feedback.md` line 10-11 now reads
      `## 2026-08-07 — website feedback batch 2` / `Status: open` directly below the
      HTML comment template, above the existing raw feedback list.
- [x] 8. Run `cd website && npx vitest run tests/unit/reading-tokens.test.ts` — confirm green.
      **Evidence:** `Test Files 1 passed (1)` / `Tests 5 passed (5)`.
- [x] 9. Run `cd website && npm run format && npm run ci`.
      **Evidence:** `npm run format` reformatted the new test file only; `npm run ci`
      (format:check, lint, check, test, build) — all sub-steps exit 0, `Tests 322 passed
      (322)`, `151 page(s) built`, `dist scan: clean`.

## Outputs

- Touched: `website/src/styles/global.css`, `website/DESIGN.md`,
  `website/tests/unit/reading-tokens.test.ts` (new),
  `docs/ADR/proposed/0020-reading-surfaces-for-docs-and-blog.md` (new), `.dev/feedback.md`.
- Public API: 8 CSS custom properties available site-wide. No behaviour change.
- Migrate/config: none.

## Validation

- [x] `cd website && npx vitest run tests/unit/reading-tokens.test.ts` — 5 passed
      **Evidence:** `Test Files 1 passed (1)` / `Tests 5 passed (5)`.
- [x] `cd website && npm run ci` — exit 0
      **Evidence:** format:check/lint/check all 0 errors, `test` 322 passed (322),
      `build` 151 pages built, `dist scan: clean`.
- [ ] manual: `npm run dev`, open `/docs/` — identical to before this commit
      **Not run** — no interactive browser available in this environment.
      Automated equivalent substituted below.
- [x] app functional — no selector consumes the tokens, so nothing can regress
      **Evidence (automated equivalent of the manual /docs/ check):**
      `git diff -- website/src/styles/global.css` is a single pure-insertion hunk
      (8 new `--reading-*` lines after `--sidebar: 17rem;`, zero lines removed/changed);
      built `dist/_astro/BaseLayout.BpxFoeU7.css` declares the 8 `--reading-*` custom
      properties but `grep -c "var(--reading-" dist/_astro/*.css` = 0, so no selector
      in the compiled output consumes them — visual output is unchanged.
- [x] commit msg draft: `feat(website): add reading-surface tokens for docs and blog`

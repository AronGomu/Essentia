# ADR 0020 — Docs and blog share one reading surface, lifted off the blackfoil

- Date: 2026-08-07
- Status: Proposed — accepted for implementation by `ai-artifacts/archive/PLAN_2026_08_07_website-feedback-pass-2.md` (T1 defines the tokens, T9 builds the surface)
- Scope: website design system, docs pages, blog pages

## Context

Feedback: *"Blog Section side panel is lacking. Missing margin left. Missing style. Revamp it."* and *"Define style for docs section. This is too much dark black."*

Three concrete defects sit behind that.

**No inset.** Every page on the site wraps its content in `.page-shell` (`width: min(100% - 2rem, 88rem); margin-inline: auto; padding-block: var(--space-6)`). The docs pages do not — `.docs-shell` is a bare grid mounted straight onto `<main>`, so its rail butts against the fixed catalog rail with zero gutter. That is the literal "missing margin left".

**No surface.** `.docs-rail` has exactly one rule (`ul { list-style: none; padding: 0 }`). There is no panel, no border, no hover or current-page treatment. Long-form text sits directly on `--blackfoil` (`oklch(0.08 0 0)`) — the gallery substrate, chosen so card renders provide all the saturation. On a gallery that reads as controlled darkness. On 3 000 words of rules text it reads as a void, which is the "too much dark black".

**No blog rail at all.** `/blog/` and `/blog/<slug>/` render a `.page-shell` and nothing else. There is no navigation between articles.

`website/DESIGN.md` already states **The Neutral Night Rule**: the dark substrate is chroma-zero, and mood comes from imagery and named accents rather than a colour wash. Taken literally, that forbids warming the reading panels. But the rule exists to stop the *gallery* shell competing with card art — a constraint that does not apply to a text panel, where there is no artwork to protect and where a pure-neutral void actively harms legibility.

## Decision

1. Docs and blog share one layout: `.reading-shell` → `.reading-rail` + `.reading-body` + optional `.chapter-summary`. `docs-shell` / `docs-rail` / `docs-body` are retired as class names.
2. `.reading-shell` is inset exactly like `.page-shell`, so reading pages sit on the same gutter as every other page.
3. Reading surfaces get eight dedicated tokens, declared once in `:root` and documented in `website/DESIGN.md § Reading Surfaces (Docs & Blog)`:
   `--reading-surface`, `--reading-surface-raised`, `--reading-ink`, `--reading-ink-muted`, `--reading-rule`, `--reading-measure`, `--reading-rail`, `--reading-toc`.
4. **Narrow exception to the Neutral Night Rule.** The reading tokens carry a small chroma (0.008–0.016) at **hue 80 — warm, not the site's cool relic hue 188** — so text panels read as paper under a lamp rather than as the same gallery light turned up. Warm was chosen over the relic hue deliberately: prose sits *beside* cool card renders on docs pages, and putting the text panel in the opposite temperature keeps the two from competing, which is the same interest the Neutral Night Rule protects. The exception is scoped to `.reading-*` selectors only; the gallery shell, section atmospheres, and every card surface stay chroma-zero. `website/DESIGN.md` records the exception next to the rule it bends.

   **Lightness, not just hue, carries the fix.** `--reading-surface` sits at `oklch(0.27 …)`, a 1.38:1 lift off `--blackfoil`. A shallower surface was drafted first (`oklch(0.145 …)`) and rejected during T1's design session: it renders `#080b0b` against a `#020202` page, a 1.05:1 lift, which is not a perceptible panel and would have left the reported defect in place.

   **Ink is deliberately below maximum.** The reported "too much dark black" is partly a halation complaint: `--cardstock` on `--blackfoil` is 17.5:1. `--reading-ink` on `--reading-surface` is 12.64:1 — still comfortably AAA, without the burn of near-maximum contrast on long text.
5. The blog gains a rail (`BlogRail.astro`) listing every published article newest-first plus an "All posts" entry, marking the current route with `aria-current="page"` — the same affordance the docs rail already gives.
6. Values are a design decision, not an implementation detail: T1 freezes them with the user through the `impeccable` skill before any page consumes them, and a unit test pins the token names so a later restyle cannot silently rename the contract.
7. Below `64rem` the shell collapses to one column and the rails become static and move above the prose, matching the behaviour `.chapter-summary` already has.
8. **The Lit Room Rule.** Only the prose panel and its own rails take `--reading-surface`. The site header, the catalog rail and the page gutter stay on `--blackfoil`. A reading page is one lit room inside the same dark archive, not a second site — this is what keeps the chosen lift from severing docs and blog from `/archetypes/` and the card pages.

## Consequences

- Reading pages stop being a special case: they gain the site's standard gutter and a visible surface, and the two sections stop diverging.
- The Neutral Night Rule now has one written exception rather than an undocumented drift. Any future reviewer sees the boundary — `.reading-*` and nothing else.
- Eight new tokens enter the system. Because they are asserted by name in `website/tests/unit/reading-tokens.test.ts`, renaming one breaks the build rather than silently un-styling half the site.
- The blog rail grows linearly with the archive. At the current single article this is free; past roughly fifty posts it will need grouping by year, which is a later ticket, not a blocker now.
- `.chapter-summary` and `.page-toc` keep their existing styles and are reused unchanged, so the docs right-hand column is untouched by this change.

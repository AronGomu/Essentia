# ADR 0042 — The archetype backdrop paints the content column, not the viewport

- Date: 2026-08-13
- Status: Proposed — blur clause amended by `ai_artefacts/PLAN_2026_08_13_feedback_follow_up.md` (T4)
- Scope: `website/src/styles/global.css`, `website/src/layouts/BaseLayout.astro`, `website/src/pages/archetypes/[slug].astro`
- Review: `ai-artifacts/GRILL_2026_08_12_feedback_batch_3/round-1.html` Q5-Q6; revises the backdrop half of feedback batch 2

## Context

An archetype page currently wears two stacked layers on `body::before` / `body::after`, both
`position: fixed; inset: 0`: a generated gradient (`--page-atmosphere`) and an optional
pattern (`--page-pattern`), per `html[data-theme]`. The photo backdrop introduced in feedback
batch 2 sits underneath them, also fixed and full-viewport.

The result is that the archetype's identity is painted across the whole window, including the
site header and the left rail, and the gradient competes with the photograph it sits on top
of.

## Decision

1. On `html[data-page='archetype']`, `--page-atmosphere` and `--page-pattern` are suppressed
   entirely. Other themes are untouched.
2. The photo is painted on a pseudo-element of `<main>`, absolutely positioned and clipped to
   it. The header, the rail and the footer are siblings of `<main>` and are therefore excluded
   structurally rather than by masking.
3. The backdrop scrolls with the content — it is absolute inside `<main>`, not fixed.
4. It is dimmed 60% by a flat black layer above the photo. Photo stays sharp: computed
   `filter` is `none`. Legibility comes from veil, not blur.
5. An archetype with no background file renders flat black. That is the intended result, not
   a fallback to a gradient.
6. The photo URL keeps arriving through the hashed `<style>` element `BaseLayout.astro`
   already emits. `scripts/harden-csp.mjs` rejects `'unsafe-inline'` and `'unsafe-hashes'`,
   and `dist/` carries zero `style="` attributes, so an inline style attribute is not
   available (see ADR 0028 for the same constraint on the rail tint).

## Consequences

- Site chrome keeps one constant identity across every page; the archetype identity lives
  where its cards live.
- Two archetypes have art (`burning-abyss`, `nekroz`) and both are live, so nothing renders
  black today. Shaddoll and Spellbook are registered but hold no cards and therefore have no
  page.
- Roughly 100 lines of per-theme gradient CSS stop applying to archetype pages. They are kept,
  not deleted, because the same custom properties still drive the other themes.
- `tests/e2e/archetype-background.spec.ts` asserts `main::before` stays bounded by `<main>`,
  filter computes to `none`, dim gradient remains, scale remains, no horizontal overflow appears.

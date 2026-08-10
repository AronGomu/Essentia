# ADR 0031 — The card page prints MSE text verbatim; rulings live in a Rules block

- Date: 2026-08-10
- Status: Proposed
- Scope: `website/src/pages/cards/[id].astro`, `website/src/lib/catalog.ts`, `website/src/lib/mse-markup.ts`, `website/src/styles/global.css`

## Context

A card's rule text reaches the site as MSE markup and is rendered by `renderMseMarkup`. When that function is handed a `definitions` map it appends `(ruling)` after every bold keyword phrase. The card page passes `reminderDefinitions()` — 84 keywords minus the few flagged `reminder: false` — so a card printing four keywords shows four parenthetical rulings inside its rule text.

The card image next to it shows none of that. The MSE render is the artifact players hold; the transcription beside it is supposed to be the same text, machine-readable. Today it is not: the site's copy carries interleaved explanations the card does not.

Separately, the gallery hover box already solves the "what does this keyword mean" problem, from the same source of truth (`docs/keywords/{id}.md` front matter, `preview: true`), through `previewKeywordsFor(card)` and the `#keyword-rulings` island.

## Decision

**1. On `/cards/{id}`, rule text is rendered without `definitions`.** `<RichText value={card.ruleText} class="rules-text" />`. Bold, italics, line breaks and mana symbols still render — those are in the printed card. Parentheses that the card itself prints (the numbered ability prefix, `(1 - Triggered Hard)`) are untouched, because they are part of `card.ruleText`.

**2. The rulings move into a `Rules` block on the same page**, a `<dl class="keyword-rules">` built from `previewKeywordsFor(card)` — the same function, the same `preview: true` filter and the same order the hover box uses. One source of truth, two surfaces, no third filter.

**3. `preview: true` is the filter, not "every keyword on the card".** The hover box and the card page then say exactly the same thing about the same card, which is what makes the block predictable. The 20 `preview: false` terms are unchanged Magic evergreens (`Flying`, `Trample`, `Destroy`, `Target`), whose meaning a Magic player already has.

**4. `/cards/{id}/versions/{package}` keeps inline reminders.** The version route is a historical record of one printing, read on its own, without the current card's Rules block beside it. `website/tests/unit/keyword-rulings.test.ts` previously asserted both routes resolve reminders identically — the reason being a real regression where the two routes disagreed *by accident*. That test is rewritten to assert the divergence deliberately: the version route resolves `reminderDefinitions()`, the card route resolves none.

## Rejected

**List every keyword on the card, ignoring `preview`.** Defensible — a card page is a reference surface — but it makes the card page and the hover box disagree about the same card, and it prints `Flying: this creature can only be blocked by creatures with flying or reach` on a cube whose audience is reading it to learn the *Yu-Gi-Oh!* mapping, not Magic.

**Keep the inline reminders and add the block.** Every ruling twice on one screen.

**Remove reminders site-wide.** Would take the explainers off the version route and out of any future surface that renders card text alone, for no gain here.

## Consequences

- `reminderDefinitions()` keeps exactly one caller (`/cards/{id}/versions/{package}`); it is not dead and must not be removed.
- The card page rule text becomes byte-comparable with `card.ruleTextPlain`, which makes a real assertion possible: the e2e test compares the rendered text to the catalog field.
- Any future surface that renders card text must decide explicitly whether it is quoting the card (no definitions) or teaching it (definitions).

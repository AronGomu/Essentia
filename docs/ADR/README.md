# Architecture decision records

Decision evidence lives here after rule/design review.

- [`accepted/`](accepted/) contains applied decisions. Their status must remain truthful.
- [`proposed/`](proposed/) contains unresolved decisions. Do not apply them until explicitly accepted.

## Accepted

- [0001 — Spellbook affinities and named selectors](accepted/0001-spellbook-affinities-and-named-selectors.md)
- [0002 — Synchro staples rulings](accepted/0002-synchro-staples-rulings.md)
- [0004 — Spellbook effect reconciliation](accepted/0004-spellbook-effect-reconciliation.md)
- [0005 — Keyword taxonomy and markup](accepted/0005-keyword-taxonomy-and-markup.md)
- [0006 — MSE frame mapping](accepted/0006-mse-frame-mapping.md)
- [0007 — Legend of Alpha rule reconciliation](accepted/0007-legend-of-alpha-rule-reconciliation.md)
- [0008 — Open/locked package lifecycle](accepted/0008-open-locked-lifecycle.md)
- [0009 — Reference wording](accepted/0009-reference-wording.md)
- [0010 — Compact duration, quantity card, zone article](accepted/0010-compact-duration-quantity-zone.md)
- [0011 — Shuffle action](accepted/0011-shuffle-action.md)
- [0012 — Summon bypass, event casing, zone articles, Ritual-alone](accepted/0012-summon-bypass-event-zone.md)
- [0013 — Activation condition colon and Title self-name](accepted/0013-activation-condition-self-name-title.md)
- [0014 — Deck copy limits](accepted/0014-deck-copy-limits.md)

## Proposed

- [0003 — Nekroz reconciliation](proposed/0003-nekroz-reconciliation.md)
- [0015 — Keyword ruling text lives in the website registry](proposed/0015-keyword-definitions-in-registry.md)
- [0016 — Archetype sections hold members and linked support cards only](proposed/0016-archetype-sections-hold-members-only.md)
- [0017 — Docs, blog, and local decks ship without MDX or new runtime dependencies](proposed/0017-docs-blog-decks-without-mdx.md)
- [0018 — Section hero art is committed, never build-generated](proposed/0018-committed-hd-hero-art.md)
- [0019 — Unknown routes redirect home; there is no welcome page](proposed/0019-unknown-routes-redirect-home.md)
- [0020 — Docs and blog share one reading surface, lifted off the blackfoil](proposed/0020-reading-surfaces-for-docs-and-blog.md)
- [0021 — Correct the MSE field parser, freeze the render-provenance hash input](proposed/0021-frozen-visual-source-hash.md)
- [0022 — Essentia logo and icon set](proposed/0022-essentia-logo-and-icon-set.md)
- [0023 — Keyword rulings live in one doc file per keyword](proposed/0023-keyword-rulings-in-per-keyword-docs.md)
- [0024 — Section intro prose is authored, not scraped](proposed/0024-section-intro-prose-in-content.md)
- [0025 — The catalog rail owns reading navigation; the brand belongs to the header](proposed/0025-catalog-rail-owns-reading-navigation.md)
- [0026 — Docs and blog ordering is configuration, not code](proposed/0026-reading-order-config.md)
- [0030 — Every frame renders at 750 × 1046](proposed/0030-hd-frames-at-750.md)
- [0031 — The card page prints MSE text verbatim; rulings live in a Rules block](proposed/0031-card-page-prints-mse-text.md)
- [0033 — Card-style linting stays Python; patterns compile once](proposed/0033-lint-precompiled-boundary-patterns.md)
- [0034 — Rebuild reports phases and skips unchanged packages by input hash](proposed/0034-rebuild-progress-and-stamp.md)
- [0035 — The hover preview overlays the hovered card at 75vh](proposed/0035-hover-preview-overlays-the-card.md)
- [0036 — Related lists are disjoint; the band owns the page width](proposed/0036-related-interaction-excludes-archetype.md)
- [0037 — Markdown images scale through an authored class ladder](proposed/0037-markdown-images-with-scale-ladder.md)
- [0032 — Related cards are derived at build time, in two categories](proposed/0032-derived-related-cards.md)

## Workflow

New reusable rule questions are collected in one proposed ADR. Resolve every item in that file. Accepted decisions move to `accepted/`; rejected options remain recorded as evidence. Card-specific facts remain in MSE, not ADR summaries.

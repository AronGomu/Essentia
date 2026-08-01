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

## Proposed

- [0003 — Nekroz reconciliation](proposed/0003-nekroz-reconciliation.md)

## Workflow

New reusable rule questions are collected in one proposed ADR. Resolve every item in that file. Accepted decisions move to `accepted/`; rejected options remain recorded as evidence. Card-specific facts remain in MSE, not ADR summaries.

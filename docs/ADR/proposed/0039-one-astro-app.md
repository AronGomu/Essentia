# ADR 0039 — One Astro app: blog, docs and cards are not split

- Date: 2026-08-13
- Status: Proposed
- Scope: `website/astro.config.mjs`, `website/package.json`, `website/scripts/content/**`
- Review: `ai-artifacts/GRILL_2026_08_12_feedback_batch_3/round-1.html` Q7, `round-2.html` Q3

## Context

The proposal was to bundle three applications in one — blog, docs, and the card library —
invisible to the visitor, but separately rebuildable while working, so that editing a blog
post would not rebuild the card catalog. The premise was that a shared rebuild is what makes
local iteration slow.

Measurement contradicts the premise:

- `astro build` renders all 152 pages in **1.5 s**.
- `npm run content:check` — the entire content build (MSE parse, identity checks, provenance
  verification, 38 docs, 2 posts, keyword registry, catalog write) with only the image writes
  skipped — is **0.66 s**.
- The other 107.4 s is image encoding, which belongs solely to the card pipeline and is
  addressed by ADR 0038.

So the addressable budget for a split, or for a `--scope` flag, is under one second, against
a real cost: a second code path that can leave `src/generated/catalog.ts` stale, three CSP
hardening passes, three `check-404` runs, and cross-section links that stop being verifiable
at build time. The nav rail and the find palette read the card catalog on *every* page,
including docs and blog pages, so a scoped build cannot simply omit it.

## Decision

1. The site stays one Astro application with one `dist/`.
2. No `--scope` / `--only` flag is added to the content build.
3. Iteration speed is bought by ADR 0038's derivative cache instead, which is where the cost
   actually is.
4. This decision is revisited only against a new measurement — for example if the content
   build exceeds a few seconds at a realistic corpus size.

## Consequences

- Cross-links between docs, blog and cards keep failing the build when broken, which is the
  property a split would have cost.
- One layout, one stylesheet, one test suite, one deploy artefact.
- Editing a blog post still runs the whole content build. After ADR 0038 that is under a
  second, which is below the threshold where anyone would notice.
- If the card corpus grows to the point where the warm content build is slow again, the fix
  is incremental content generation, not three applications.

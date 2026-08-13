# ADR 0038 — Image derivatives are cached by content hash; AVIF drops to effort 2

- Date: 2026-08-13
- Status: Proposed
- Scope: `website/scripts/content/images.mjs`, `website/scripts/content/orchestrator.mjs`, `website/scripts/content/packages.mjs`, `website/scripts/content/shared.mjs`, `website/scripts/check-derivatives.mjs`
- Review: `ai-artifacts/GRILL_2026_08_12_feedback_batch_3/round-1.html` Q1-Q3, `round-2.html` Q1, Q7

## Context

`npm run dev` costs 109 s before Astro starts. Measured split: `cards:rebuild` 0.3 s (already
skip-cached), `build-content` 107.4 s, `astro build` of all 152 pages 1.5 s. Astro is not the
cost. Vite is not the cost.

All 107 s is `sharp`. `orchestrator.mjs` deletes `public/generated/` at the top of every
build, then `packages.mjs` re-encodes 250 derivatives (63 MB) serially, one card at a time,
on one of 16 cores. Per card: `display.avif` 1662 ms, `thumb.avif` 299 ms, `print.png`
315 ms, `display.webp` 114 ms, `thumb.webp` 46 ms — 2.44 s, of which AVIF is 80 %.

Scaling is linear: 2.1 s per card means 17 min per `npm run dev` at 500 cards.

The cache key already exists and is thrown away. `packages.mjs` computes `renderHash`,
`visualSourceHash` and `artworkHash` per card and verifies them against
`render-provenance.json` immediately before re-encoding everything anyway.
`website/public/generated/` is git-ignored, so a cache file inside it costs nothing.

## Decision

1. Derivatives are cached by content hash, not deleted and rebuilt. A manifest at
   `website/public/generated/.derivative-manifest.json` maps each output's relative path to
   a key over `{ sourceHash, tier, format, width, rev, options }`. A derivative is re-encoded
   only when its key changes or its file is missing.
2. `ENCODER_REVISION` is a hand-bumped constant inside the key, so changing an encoder
   setting invalidates every affected derivative without a manual purge.
3. The `rm -rf` at build start is deleted. Files no longer claimed by any card are removed by
   an explicit orphan prune after discovery, so a withdrawn card cannot leave a published
   image behind.
4. AVIF drops from `effort: 4` to `effort: 2`.
5. Dev and build emit **identical** bytes. There is no reduced tier set in dev and no
   build-only format. One code path, no "works in dev" class of bug.
6. Correctness is proved, not asserted: `npm run cache:verify` rebuilds every derivative cold
   into a temp directory (`GENERATED_PUBLIC_DIR` env override) and byte-compares against the
   cached tree. It runs in `npm run ci`.

## Consequences

- Warm `npm run content` converges on 0.66 s — the measured cost of the whole content build
  with image writes skipped. Warm `npm run dev` lands near 2.5 s, from 109 s.
- The first run after this ADR re-encodes every AVIF once, at the new effort.
- AVIF files grow slightly at effort 2. Accepted: 80 % of build time is not worth the
  remaining compression.
- CI has no warm cache, so it pays a cold build, and `cache:verify` deliberately adds a
  second one. At 50 cards that is roughly two minutes. Parallelising the encode across cores
  is the next lever and is explicitly **not** taken here.
- The cache trusts the manifest plus file existence, not file contents. A derivative
  corrupted in place on disk is not detected by a normal build; `npm run cache:verify` is
  what catches it.

# T1: Content-hash cache for image derivatives

**Plan:** `./ai-artifacts/PLAN_2026_08_13_feedback_batch_3.md`
**Depends:** none
**Commit outcome:** A warm `npm run content` finishes in under 3 s instead of 107 s, and the
bytes it produces are identical to a cold run.

## Context (self-contained)

- Goal: the website build takes 109 s before Astro starts. 107.4 s of that is `sharp`
  re-encoding every image derivative from scratch on every single run.
- Measured root cause: `website/scripts/content/orchestrator.mjs` deletes
  `website/public/generated/` at the top of every build, then
  `website/scripts/content/packages.mjs` re-encodes 5 derivatives × 50 cards = 250 files
  (63 MB) serially. Per card: `display.avif` 1662 ms, `thumb.avif` 299 ms, `print.png`
  315 ms, `display.webp` 114 ms, `thumb.webp` 46 ms = 2.44 s. AVIF is 80 % of the build.
- This slice: add a content-hash manifest so unchanged derivatives are never re-encoded,
  and lower AVIF `effort` from 4 to 2.
- Out of scope here: parallelising encoding across cores; skipping tiers in dev (dev and
  build must emit identical output); the cold-vs-warm CI verification (that is T2).
- Assumptions in force: `website/public/generated/` is git-ignored, so a cache file inside
  it is free. Dev and production output must stay byte-identical.

## Requirements

- No `rm -rf` of `website/public/generated/` at build start.
- A derivative is re-encoded only when its cache key changes or its file is missing.
- Files under `website/public/generated/` that no card claims are deleted (orphan pruning).
- The cache key covers: the source file's sha256, the tier name, the format, the output
  width, the encoder options, and a manually bumped encoder revision.
- AVIF `effort` becomes 2; every other encoder option is unchanged.
- `--check` mode still writes nothing at all.

## Inputs

- `website/scripts/content/images.mjs` — owns `TIERS`, `PRINT_MASTER`, `writeDerivative`,
  `buildCardImages`, `findPrintMaster`, `assertPrintMasterDimensions`.
- `website/scripts/content/orchestrator.mjs` — `build({ checkOnly })`; the
  `await rm(GENERATED_PUBLIC, { recursive: true, force: true })` call sits directly above
  `await mkdir(GENERATED_PUBLIC, { recursive: true })` and must go.
- `website/scripts/content/packages.mjs` — calls `buildCardImages({ id, assetRoot,
  canonical, printMaster, width, height, checkOnly })` inside `discover()`; `discover` is
  declared as `discover(registry, { checkOnly, colorOverrides, keywordRegistry })`.
- `website/scripts/content/shared.mjs` — exports `GENERATED_PUBLIC`
  (`website/public/generated`), `sha(bytes)` (sha256 hex), `fail(message)`.

## TDD

1. **Red** — write `website/tests/unit/image-cache.test.ts` with the five tests below; run
   it and watch every one fail on a missing export.
2. **Green** — implement the manifest, the key, the skip path and the prune, then rerun.
3. **Refactor** — only if needed. Keep green.

## Test plan

File: `website/tests/unit/image-cache.test.ts` (vitest, node environment, matched by
`tests/unit/**/*.test.ts` in `website/vitest.config.ts`).

| Test                                                            | Input                                                              | Expect                                                                  |
| --------------------------------------------------------------- | ------------------------------------------------------------------ | ----------------------------------------------------------------------- |
| `derivativeKeyInput carries the encoder revision and options`    | `{ sourceHash: 'a', tier: 'thumb', format: 'avif', width: 240 }`    | returned object has `rev === ENCODER_REVISION` and `options.effort === 2` |
| `derivativeKey changes with the source hash`                     | same input, `sourceHash` `'a'` vs `'b'`                             | the two keys differ                                                     |
| `buildCardImages skips a derivative whose key already matches`   | build once into a temp dir, capture `mtimeMs` of every output, build again with the returned manifest as `previous` | every `mtimeMs` is unchanged |
| `buildCardImages re-encodes when the source bytes change`        | as above, but rewrite the source PNG with different pixels between runs | every output `mtimeMs` increases                                     |
| `pruneOrphans deletes unclaimed files and keeps claimed ones`    | temp dir holding `a.webp` and `b.webp`, claimed set `['a.webp']`    | `a.webp` still exists, `b.webp` is gone                                 |

Fixture: build the source image with
`await sharp({ create: { width: 60, height: 84, channels: 3, background: '#402010' } }).png().toFile(file)`
into a `mkdtemp` directory. Never write fixtures into the tracked tree.

Run: `cd website && npx vitest run tests/unit/image-cache.test.ts`

## Impl steps

- [x] 1. In `website/scripts/content/images.mjs`, add
      `export const ENCODER_REVISION = 1;` and named option constants
      `export const AVIF_OPTIONS = { quality: 60, effort: 2 };`,
      `export const WEBP_OPTIONS = { quality: 86, effort: 5 };`,
      `export const PNG_OPTIONS = { compressionLevel: 9, adaptiveFiltering: true };`.
      Verify: focused Vitest options test passes.
- [x] 2. Rewrite `writeDerivative(input, output, format, width)` to read its options from
      those three constants instead of the inline literals. Verify: `grep -n "\.avif\|\.webp\|\.png" website/scripts/content/images.mjs` shows constant-backed calls.
- [x] 3. Add `export function derivativeKeyInput({ sourceHash, tier, format, width })`
      returning `{ sourceHash, tier, format, width, rev: ENCODER_REVISION, options }`,
      where `options` is `AVIF_OPTIONS` / `WEBP_OPTIONS` / `PNG_OPTIONS` by format.
      Verify: focused Vitest key-input test passes.
- [x] 4. Add `export function derivativeKey(input)` returning
      `sha(JSON.stringify(derivativeKeyInput(input)))`, importing `sha` from `./shared.mjs`.
      Verify: focused Vitest source-hash key test passes.
- [x] 5. Add `export const MANIFEST_PATH = path.join(GENERATED_PUBLIC, '.derivative-manifest.json');`
      and `export const MANIFEST_SCHEMA_VERSION = 1;`. Verify: exports exist in `website/scripts/content/images.mjs`.
- [x] 6. Add `export async function loadDerivativeManifest()`: read `MANIFEST_PATH`, return
      `new Map(Object.entries(parsed.entries))` when `parsed.schemaVersion === MANIFEST_SCHEMA_VERSION`,
      and an empty `Map` on any error or version mismatch. Verify: warm `npm run content` loads manifest successfully.
- [x] 7. Add `export async function writeDerivativeManifest(entries)`: write
      `{ schemaVersion: MANIFEST_SCHEMA_VERSION, entries: Object.fromEntries([...entries].sort()) }`
      to `MANIFEST_PATH` with `JSON.stringify(value, null, 2)` plus a trailing newline.
      Verify: cold `npm run content` creates valid `public/generated/.derivative-manifest.json`.
- [x] 8. Add `export async function pruneOrphans(claimed)`: walk `GENERATED_PUBLIC`
      recursively, delete every file whose `GENERATED_PUBLIC`-relative POSIX path is absent
      from the `claimed` set, ignoring `.derivative-manifest.json`; then remove directories
      left empty. Verify: focused Vitest orphan-prune test passes.
- [x] 9. Change the signature to
      `buildCardImages({ id, assetRoot, canonical, printMaster, width, height, checkOnly, cache })`
      where `cache` is `{ previous: Map<string,string>, next: Map<string,string> }` or
      `null` when `checkOnly` is true. Verify: focused Vitest builds with cache object.
- [x] 10. Inside `buildCardImages`, compute `const sourceHash = sha(await readFile(source));`
      once, before the tier loop (`source` is already `printMaster ?? canonical`).
      Verify: focused Vitest source-change test passes.
- [x] 11. For each derivative, compute `relative = \`${assetRoot}/${id}-${tier}.${format}\``
      and `key = derivativeKey({ sourceHash, tier, format, width: outputWidth })`. Set
      `cache.next.set(relative, key)`. Encode only when
      `cache.previous.get(relative) !== key || !existsSync(absoluteTarget)`.
      Verify: focused Vitest skip + source-change tests pass.
- [x] 12. Apply the same three lines to the `print.png` derivative
      (`tier: 'print'`, `format: 'png'`). Verify: focused Vitest confirms every output mtime is stable then increases.
- [x] 13. In `website/scripts/content/orchestrator.mjs`, delete the
      `await rm(GENERATED_PUBLIC, { recursive: true, force: true });` call and the now-unused
      `rm` import; keep the `mkdir`. Verify: `grep -n "rm(GENERATED_PUBLIC" website/scripts/content/orchestrator.mjs` returns no match.
- [x] 14. In the same file, before `discover(...)`, add
      `const cache = checkOnly ? null : { previous: await loadDerivativeManifest(), next: new Map() };`
      and pass `cache` through the `discover` options object. Verify: warm `npm run content` completes under 3 s.
- [x] 15. After `discover(...)` returns and before the catalog is written, add
      `if (cache) { await pruneOrphans(new Set(cache.next.keys())); await writeDerivativeManifest(cache.next); }`.
      Verify: cold content run writes manifest; focused orphan test passes.
- [x] 16. In `website/scripts/content/packages.mjs`, accept `cache` in the `discover`
      options object and forward it into every `buildCardImages({ … , cache })` call.
      Verify: `npm run content` exits 0 with 50 cards.
- [x] 17. Write `website/tests/unit/image-cache.test.ts` per the test plan.
      Verify: initial focused run fails on missing exports; post-impl focused run reports 5 passed.
- [x] 18. `grep -rn "effort" docs/render-resolution-pipeline.html` and, if it states AVIF
      effort 4, update it to 2 in the same commit. Verify: grep contains no stale AVIF effort 4 claim.

## Outputs

- Touched: `website/scripts/content/images.mjs`, `website/scripts/content/orchestrator.mjs`,
  `website/scripts/content/packages.mjs`, `website/tests/unit/image-cache.test.ts` (new),
  `docs/render-resolution-pipeline.html` (only if it quotes the old effort).
- New build artefact: `website/public/generated/.derivative-manifest.json` (git-ignored).
- Behaviour change: derivatives persist between runs; AVIF files are re-encoded once at
  effort 2 on the first run after this commit.

## Validation

- [x] `cd website && npx vitest run tests/unit/image-cache.test.ts` — criterion: exactly 5 tests passed
- [x] `cd website && rm -rf public/generated && time npm run content` — criterion: prints
      `content: 1 releases, 3 sections, 50 current cards, …`; cold real time recorded
- [x] `cd website && time npm run content` — criterion: same summary line, real under 3 s
- [x] `cd website && npm run content && npm run build` — criterion: exits 0
- [x] `cd website && npx vitest run` — criterion: no new failures vs 776-pass + 1 owner-gated baseline
- [x] `ls website/public/generated/releases/alpha-LOTA-0001-Alpha-0-1 | wc -l` — criterion: stdout is `250`
- [x] app functional — criterion: `npm run preview` serves `/`, one archetype page, one card page with HTTP 200
- [x] commit msg draft: `perf(website): cache image derivatives by content hash` — criterion: `git log -1 --format=%s` matches exactly

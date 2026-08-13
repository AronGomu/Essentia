# T2: Cold-vs-warm derivative verification

**Plan:** `./ai-artifacts/PLAN_2026_08_13_feedback_batch_3.md`
**Depends:** T1
**Commit outcome:** `npm run cache:verify` rebuilds every image derivative from scratch into
a temp directory and fails if a single byte differs from the cached output; `npm run ci`
runs it.

## Context (self-contained)

- Goal: T1 made the content build reuse image derivatives between runs instead of
  re-encoding 250 files every time. A caching bug does not crash — it silently publishes a
  stale card image. This slice is the proof that it cannot.
- This slice: a verification script plus its unit-tested comparison function, wired into CI.
- Out of scope here: changing any encoder setting, parallelising encoding, verifying
  anything other than the files under `website/public/generated/`.
- Assumptions in force: CI has no warm cache, so this adds roughly one cold content build
  (~60-70 s at 50 cards) to `npm run ci`. That cost is accepted deliberately.

**From Depends (T1) — spell out, do not go looking:**

- `website/scripts/content/images.mjs` now exports `ENCODER_REVISION`, `AVIF_OPTIONS`,
  `WEBP_OPTIONS`, `PNG_OPTIONS`, `derivativeKeyInput(input)`, `derivativeKey(input)`,
  `MANIFEST_PATH`, `MANIFEST_SCHEMA_VERSION`, `loadDerivativeManifest()`,
  `writeDerivativeManifest(entries)`, `pruneOrphans(claimed)`.
- `buildCardImages` takes a `cache` option shaped `{ previous: Map, next: Map }` and skips a
  derivative when `previous.get(relative) === key` and the file exists.
- `website/scripts/content/orchestrator.mjs` no longer deletes `public/generated`; it loads
  the manifest, passes the cache into `discover`, then prunes orphans and writes the
  manifest.
- The manifest lives at `website/public/generated/.derivative-manifest.json` and is
  git-ignored along with the rest of `website/public/generated/`.
- `website/scripts/content/shared.mjs` exports `GENERATED_PUBLIC`
  (`website/public/generated`) as a module-level constant and `sha(bytes)` returning a
  sha256 hex digest.

## Requirements

- `website/scripts/content/shared.mjs` accepts `process.env.GENERATED_PUBLIC_DIR` only for
  the verifier-owned path returned by
  `mkdtemp(path.join(await realpath(tmpdir()), 'essentia-derivatives-'))`. The override must
  be absolute and canonical, its canonical parent must equal the canonical system temp root
  (one direct child only), its basename must start with the exact
  `essentia-derivatives-` prefix, and it must be an existing empty directory. At module
  initialization, reject every other override — including relative/non-canonical paths,
  paths outside or nested below the temp root, wrong-prefix paths, non-existent or non-empty
  directories, and paths with any symlink component — before any `mkdir`, prune, or write
  can run. `check-derivatives.mjs` alone creates, supplies, and removes this directory; no
  unrestricted caller output path exists. Normal builds with no override still use
  `website/public/generated/`.
- `npm run cache:verify` spawns a cold content build into a temp directory and compares it
  file-for-file against `website/public/generated/`.
- The comparison ignores `.derivative-manifest.json` and reports, in one message: files
  missing from the cached tree, files present only in the cached tree, and files whose
  sha256 differs.
- Exit code 1 on any difference, 0 when identical.
- The comparison logic is a pure exported function with its own unit tests.

## Inputs

- `website/scripts/content/shared.mjs` — `export const GENERATED_PUBLIC = path.join(WEBSITE, 'public', 'generated');`
- `website/scripts/build-content.mjs` — three lines:
  `import { build } from './content/orchestrator.mjs';` then
  `await build({ checkOnly: process.argv.includes('--check') });`
- `website/package.json` — `"ci": "npm run format:check && npm run lint && npm run check && npm run test && npm run build"`
- Existing sibling scripts to match in style: `website/scripts/scan-dist.mjs`,
  `website/scripts/check-links.mjs`.

## TDD

1. **Red** — write `website/tests/unit/derivative-verify.test.ts` against
   `compareDerivativeTrees`, which does not exist yet. Four failing tests.
2. **Green** — implement `compareDerivativeTrees` and the script around it.
3. **Refactor** — only if needed. Keep green.

## Test plan

File: `website/tests/unit/derivative-verify.test.ts`

| Test                                              | Input                                                                             | Expect                                             |
| ------------------------------------------------- | --------------------------------------------------------------------------------- | -------------------------------------------------- |
| `identical trees report no differences`           | two maps `{ 'a.webp': 'h1', 'b.avif': 'h2' }`                                      | `{ missing: [], extra: [], changed: [] }`           |
| `a file only in the cold tree is reported missing` | cold `{ 'a.webp': 'h1' }`, cached `{}`                                             | `missing` is `['a.webp']`                           |
| `a file only in the cached tree is reported extra` | cold `{}`, cached `{ 'stale.webp': 'h1' }`                                         | `extra` is `['stale.webp']`                         |
| `a differing hash is reported changed`             | cold `{ 'a.webp': 'h1' }`, cached `{ 'a.webp': 'h2' }`                             | `changed` is `['a.webp']`                           |

File: `website/tests/unit/generated-public-override.test.ts`

| Test | Input | Expect |
| --- | --- | --- |
| `accepts a verifier-created temp root` | existing empty root returned by `mkdtemp(path.join(await realpath(tmpdir()), 'essentia-derivatives-'))` | module import resolves `GENERATED_PUBLIC` to that absolute canonical root |
| `rejects an override outside tmpdir before writes` | repo-local or other non-temp path | module import rejects; sentinel/path remains unchanged |
| `rejects a temp override with the wrong prefix before writes` | existing `mkdtemp(path.join(await realpath(tmpdir()), 'other-'))` root | module import rejects; sentinel remains unchanged |
| `rejects a non-existent matching override before writes` | absent direct child of canonical temp root with exact prefix | module import rejects; path is not created |
| `rejects a non-empty matching override before writes` | matching temp directory containing a sentinel | module import rejects; sentinel remains unchanged |
| `rejects a non-canonical or nested override before writes` | relative path, `..` spelling, or matching directory below another temp child | module import rejects; path remains unchanged |
| `rejects any symlink component before writes` | override reached through a symlinked temp child or symlink final component | module import rejects; external sentinel remains unchanged |

Run: `cd website && npx vitest run tests/unit/derivative-verify.test.ts tests/unit/generated-public-override.test.ts`

## Impl steps

- [ ] 1. In `website/scripts/content/shared.mjs`, add a startup validator for
      `GENERATED_PUBLIC_DIR`. Accept only an absolute canonical path returned from an
      existing empty `mkdtemp(path.join(await realpath(tmpdir()),
      'essentia-derivatives-'))` directory: its canonical parent must equal
      `realpath(tmpdir())`, its basename must start with the exact
      `essentia-derivatives-` prefix, and `lstat` of every existing component must reject
      symlinks. Reject relative/non-canonical, nested, non-existent, non-directory,
      non-empty, wrong-prefix, and symlinked overrides during module initialization. Then
      resolve `GENERATED_PUBLIC` to that validated path or, when unset, to
      `path.join(WEBSITE, 'public', 'generated')`. Validation must complete before any
      content-build `mkdir`, prune, or write is reachable.
- [ ] 2. Create `website/scripts/check-derivatives.mjs`.
- [ ] 3. In it, export
      `export function compareDerivativeTrees(cold, cached)` taking two
      `Map<string,string>` of relative path → sha256 and returning
      `{ missing: string[], extra: string[], changed: string[] }`, each sorted.
- [ ] 4. Add `async function hashTree(root)`: walk `root` recursively, skip
      `.derivative-manifest.json`, return a `Map` of POSIX-relative path → `sha(bytes)`.
- [ ] 5. Add the main block guarded by
      `if (import.meta.url === \`file://${process.argv[1]}\`)`, matching
      `scripts/make-archetype-backgrounds.mjs`.
- [ ] 6. In the verifier main block only, canonicalize the system temp root, create the
      override root with
      `const temporary = await mkdtemp(path.join(canonicalTmp, 'essentia-derivatives-'));`,
      and confirm it is still empty immediately before spawning. Pass exactly that returned
      path as `GENERATED_PUBLIC_DIR`; no CLI arg, inherited override, or other
      caller-supplied output path is allowed. `check-derivatives.mjs` owns cleanup in a
      `finally` block.
- [ ] 7. Spawn the cold build with
      `execFileSync(process.execPath, ['scripts/build-content.mjs'], { cwd: WEBSITE_ROOT, stdio: 'inherit', env: { ...process.env, GENERATED_PUBLIC_DIR: temporary } })`.
- [ ] 8. Hash both trees, run `compareDerivativeTrees`, print
      `derivatives: N files verified identical` on success.
- [ ] 9. On any difference, print each list with its heading and
      `process.exitCode = 1`; always `await rm(temporary, { recursive: true, force: true })`.
- [ ] 10. In `website/package.json`, add
      `"cache:verify": "node scripts/check-derivatives.mjs"` and append
      `&& npm run cache:verify` to the end of the `ci` script.
- [ ] 11. Write `website/tests/unit/derivative-verify.test.ts` per the comparison test plan.
- [ ] 12. Write `website/tests/unit/generated-public-override.test.ts` per the override
      test plan. Each rejection test must import the runtime with the hostile override and
      prove no directory/file/sentinel was created, removed, or changed.

## Outputs

- Touched: `website/scripts/content/shared.mjs`, `website/package.json`,
  `website/scripts/check-derivatives.mjs` (new),
  `website/tests/unit/derivative-verify.test.ts` (new).
- New env var: `GENERATED_PUBLIC_DIR` — verifier-only override. Runtime accepts only the
  absolute canonical, empty direct child returned by verifier-owned
  `mkdtemp(path.join(await realpath(tmpdir()), 'essentia-derivatives-'))`, with exact prefix
  and no symlink component, and rejects every other value before writes; never set it for a
  normal build.
- New npm script: `cache:verify`, also run by `ci`.

## Validation

- [ ] `cd website && npx vitest run tests/unit/derivative-verify.test.ts tests/unit/generated-public-override.test.ts` — comparison tests plus override-contract tests for accepted canonical empty root and rejected outside, wrong-prefix, absent, non-empty, non-canonical/nested, and symlinked roots pass
- [ ] `cd website && npm run content && npm run cache:verify` — prints
      `derivatives: 250 files verified identical`, exit 0
- [ ] Negative check: `printf 'x' >> website/public/generated/releases/alpha-LOTA-0001-Alpha-0-1/bagooska-thumb.webp && npm run cache:verify` — exits 1 and names that file under `changed`; then `npm run content` does **not** repair it (the key still matches), so restore it with `rm website/public/generated/.derivative-manifest.json && npm run content` and re-verify clean
- [ ] `cd website && npm run ci` — green end to end
- [ ] app functional — no runtime code changed; `npm run build` still exits 0
- [ ] commit msg draft: `test(website): verify cached derivatives against a cold rebuild`

# T1: Exact install-script trust + CI pre-rebuild gate

## Context

Current license script trusts install scripts by package name only. CI executes native rebuilds before trust audit. Current lockfile has install scripts at exact locations for `esbuild@0.28.1`, `fsevents@2.3.2`, and nested `fsevents@2.3.3`; `sharp@0.35.3` has none.

## Requirements

- Trust ledger schema v2: `reviewedBy`; location-keyed records with exact `version`, `integrity`, non-empty `reason`.
- Export `installScriptTrustIssues(lock, trust)` returning sorted deterministic issues.
- Detect invalid schema/record shape, missing/stale records, version/integrity drift, and trust for non-script packages.
- CLI emits specified failure header or `install scripts: 3 exact lockfile entries reviewed`.
- License checker becomes license-only.
- Add `install-scripts:check`; retain trust gate in `audit:deps`.
- CI order: `npm ci --ignore-scripts` → trust check → `npm rebuild esbuild` → audits/build.
- No dependency/lockfile changes or `sharp` rebuild.

## Inputs

- `website/package-lock.json` current `packages` data.
- `website/trusted-install-scripts.json`
- `website/scripts/check-licenses.mjs`
- `website/package.json`
- `.github/workflows/verify-website.yml`

## From Depends

None.

## TDD / Implementation

- [x] T1.1 red: add focused trust tests covering exact acceptance, missing/stale, version/integrity drift, non-script trust, schema shape — evidence: Vitest failed with missing `check-install-scripts.mjs` before impl.
- [x] T1.2 green: implement schema-v2 exact location comparison + CLI separation — evidence: focused Vitest 10/10 passed after schema-shape review cases.
- [x] T1.3 update ledger with exact current lock values; remove stale `sharp` — evidence: `npm run install-scripts:check` printed 3 reviewed entries.
- [x] T1.4 remove install trust from license audit; wire package script — evidence: `npm run licenses:check` passed for 169 production packages after current dependency refresh; package script contains all gates.
- [x] T1.5 reorder CI trust before rebuild; rebuild only `esbuild` — evidence: workflow lines 51–59 show order; sharp rebuild grep had no match.
- [x] T1.6 mutation checks for changed esbuild integrity + stale sharp trust — evidence: in-memory mutations both produced expected rejection issues.

## Outputs

- `website/scripts/check-install-scripts.mjs`
- `website/tests/unit/install-script-trust.test.ts`
- Modified ledger, license script, package script, workflow.

## Validation

- [x] `cd website && npx vitest run tests/unit/install-script-trust.test.ts` — 1 file, 10 tests passed.
- [x] `cd website && npm run install-scripts:check` — `install scripts: 3 exact lockfile entries reviewed`.
- [x] `cd website && npm run licenses:check` — 169 production packages allowed.
- [x] `grep -n -A8 "npm ci --ignore-scripts" .github/workflows/verify-website.yml` — trust gate precedes rebuild.
- [x] `grep -R "npm rebuild.*sharp" .github website/package.json` — no match.

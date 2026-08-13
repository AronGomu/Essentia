# T9: Close batch 3 review blockers

**Depends:** T1, T3, T4, T5, T6, T7
**Commit outcome:** T1 cache is type-clean, mutation-covered, and refuses symlink escape paths; blocked T2 plan constrains its temp output override.

## Context

Deep correctness/security/tests review of `main...HEAD` found four in-scope blockers. Fix only these blockers. Reviewer should-fix notes remain residual risks.

## Requirements

1. Fix three TypeScript errors in `website/tests/unit/image-cache.test.ts` without weakening assertions.
2. Add cache-key tests proving key changes independently for source hash, tier, format, width, encoder options/revision input behavior. Tests must fail if key becomes `sha(sourceHash)`.
3. Add test proving a missing derivative is re-encoded even when manifest key matches.
4. Harden `website/scripts/content/images.mjs`:
   - refuse a symlinked `GENERATED_PUBLIC` root before recursive prune/write;
   - refuse symlinked `.derivative-manifest.json` before writing;
   - never follow a symlink to delete/write outside generated root;
   - add focused tests using temp dirs/symlinks.
5. Correct blocked T2 ticket plan at `ai-artifacts/PLAN_2026_08_13_feedback_batch_3/T2_cache-verification.md`: `GENERATED_PUBLIC_DIR` cannot be unrestricted. Require verifier-only temp roots created by `mkdtemp(path.join(tmpdir(), 'essentia-derivatives-'))`; runtime validation rejects other override paths before any mkdir/prune/write. Update T2 tests/impl steps accordingly. Do not implement/stage stashed T2 code.
6. Preserve T1 warm content under 3 s and byte stability.
7. No changes for reviewer should-fix notes; log as residual risks.

## Inputs

- `website/scripts/content/images.mjs`
- `website/tests/unit/image-cache.test.ts`
- `website/scripts/content/shared.mjs`
- `website/scripts/content/orchestrator.mjs`
- `ai-artifacts/PLAN_2026_08_13_feedback_batch_3/T2_cache-verification.md`
- `ai-artifacts/manual_test_checklist.md` (own section only)

## TDD / Impl

- [x] T9.1 Add red tests for every cache-key dimension — validate: each relevant mutation fails focused suite.
- [x] T9.2 Add red missing-output test — validate: deleting one output causes rewrite with matching manifest key.
- [x] T9.3 Add red symlink-root + manifest-symlink tests — validate: both reject before external content changes.
- [x] T9.4 Fix TypeScript tuple inference surgically — validate: `cd website && npm run check` has no T1 test errors.
- [x] T9.5 Implement generated-root/manifest symlink guards — validate: focused tests pass; normal content build works.
- [x] T9.6 Constrain T2 plan override contract — validate: ticket explicitly rejects non-verifier/non-temp override before writes.
- [x] T9.7 Update manual checklist section `## T9 review fixes` — validate: plain unchecked human steps exist.

## Validation

- [x] `cd website && npx vitest run tests/unit/image-cache.test.ts` — all pass.
- [x] `cd website && npm run check` — no errors.
- [x] `cd website && npm run content && time npm run content` — second run real under 3 s.
- [x] `cd website && npm run build` — exits 0.
- [x] `cd website && npx vitest run` — no new failure beyond owner-gated asset-rights baseline.
- [x] `git diff --check` — clean.
- [x] Commit `fix(website): harden derivative cache after review`; push feature branch.

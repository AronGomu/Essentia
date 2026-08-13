# T10: Close derivative-cache security re-review

**Depends:** T9
**Commit outcome:** Cache rejects symlinks in generated-path ancestry, uses no-follow file writes, covers print recovery, and T2 accepts only a fresh empty canonical temp dir.

## Context

T9 re-review found static parent-component escape plus insufficient T2 temp ownership validation. Same-user concurrent filesystem mutation can race any Node path check; local build runs inside trusted user workspace, so concurrent malicious same-user mutation is explicitly outside threat model. Still use no-follow final-file writes plus immediate containment checks to narrow race surface.

## Requirements

- Reject any symlink component from `website/public` through `GENERATED_PUBLIC` and derivative parent dirs before mkdir/prune/write.
- Before recursive prune, canonicalize each real directory and prove containment inside canonical generated root; symlink entries are unlinked, never traversed.
- Write derivative files and manifest through file descriptors opened with `O_NOFOLLOW | O_CREAT | O_TRUNC | O_WRONLY`; encode derivatives to buffers when needed. Preserve exact output bytes/options.
- Add tests proving symlinked parent (`public`) cannot cause prune or write outside tree; external sentinel unchanged.
- Add test proving missing `print.png` re-encodes with matching cache key.
- Update T2 plan: override must be absolute, canonical, directly below canonical system temp root, basename prefix exact, existing empty dir from `mkdtemp`; reject non-empty dirs and any symlink component before writes. `check-derivatives.mjs` owns creation and cleanup. No unrestricted caller path.
- Document trusted same-user build-process assumption under T9/T10 ticket or code comment; do not claim race-free sandboxing.
- Fix blockers only. Do not apply T2 stash.

## Inputs

- `website/scripts/content/images.mjs`
- `website/scripts/content/shared.mjs`
- `website/scripts/content/orchestrator.mjs`
- `website/tests/unit/image-cache.test.ts`
- `ai-artifacts/PLAN_2026_08_13_feedback_batch_3/T2_cache-verification.md`
- `ai-artifacts/manual_test_checklist.md` own section

## Impl / Validation

- [x] T10.1 Add red parent-symlink prune/write tests — validate: external sentinel unchanged; operation rejects.
- [x] T10.2 Add red missing-print recovery test — validate: removed print output is recreated.
- [x] T10.3 Implement ancestry/containment guards — validate: static symlink escapes reject; normal temp roots work.
- [x] T10.4 Implement `O_NOFOLLOW` final-file writes — validate: manifest/derivative symlink tests reject; normal hashes stable.
- [x] T10.5 Tighten T2 fresh-empty-temp contract — validate: ticket includes canonical temp parent, exact prefix, empty-dir, no-symlink checks before writes.
- [x] T10.6 Update checklist `## T10 security review fixes` — validate: human checks appended without changing other sections.
- [x] `cd website && npx vitest run tests/unit/image-cache.test.ts` — green.
- [x] `cd website && npm run check` — 0 errors.
- [x] `cd website && npm run content && time npm run content` — warm under 3 s.
- [x] `cd website && npm run build` — green.
- [x] `git diff --check` — clean.
- [x] Commit `fix(website): close derivative cache escape paths`; push.

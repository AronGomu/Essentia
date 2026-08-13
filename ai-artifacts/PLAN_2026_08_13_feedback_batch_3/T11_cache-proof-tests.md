# T11: Make cache security/byte guarantees mutation-sensitive

**Depends:** T10
**Commit outcome:** Tests fail if manifest writes stop using `O_NOFOLLOW` or derivative bytes diverge from direct Sharp encoding.

## Context

Final T10 test review mutated manifest write to direct `writeFile`; current preflight still rejected static symlink, so suite stayed green. It also appended bytes to outputs; no test compared encoded bytes against direct Sharp output.

## Requirements

- Refactor manifest final-component handling so parent ancestry is checked, then final manifest symlink rejection is provided by `O_NOFOLLOW` open itself. Static manifest symlink test must fail if `writeNoFollow` becomes direct `writeFile`.
- Keep parent ancestry/containment checks. Do not weaken root safety.
- Add deterministic byte assertions for fixture derivatives: compare each emitted AVIF/WebP/PNG output byte-for-byte (or sha256) against direct Sharp encoding using exported encoder option constants and expected width. Test must fail if one byte is appended.
- Preserve warm performance and all 16 prior tests.

## Inputs

- `website/scripts/content/images.mjs`
- `website/tests/unit/image-cache.test.ts`
- `ai-artifacts/manual_test_checklist.md` own section

## Impl / Validation

- [x] T11.1 Make manifest symlink test depend on no-follow final open — validate: direct-write mutation fails external sentinel/rejection assertion.
- [x] T11.2 Add byte-equivalence test for generated derivatives — validate: appended-byte mutation fails.
- [x] T11.3 Preserve ancestry guards + prior tests — validate: full focused suite green.
- [x] T11.4 Update checklist `## T11 cache proof tests` — validate: human checks appended only.
- [x] `cd website && npx vitest run tests/unit/image-cache.test.ts` — green.
- [x] `cd website && npm run check` — 0 errors.
- [x] `cd website && npm run content && time npm run content` — warm under 3 s.
- [x] `cd website && npm run build` — green.
- [x] `git diff --check` — clean.
- [x] Commit `test(website): prove cache no-follow and byte guarantees`; push.

## Review

### High

- **Legacy Markdown auto-resume broken** — `.agents/skills/update-rules/SKILL.md:20` promises pending `docs/ADR/proposed/*.md` compatibility, but fallback discovery at `.agents/skills/update-rules/SKILL.md:90` scans only HTML. Bare `continue` after lost conversation context cannot discover existing legacy reviews. Include pending legacy Markdown in candidate scan.

- **`ADD_PERMISSION` decision never applied** — `.agents/skills/fix-mse-cards/SKILL.md:108` permits `ADD_PERMISSION`, but reconciliation at `.agents/skills/fix-mse-cards/SKILL.md:120` applies only `RESTORE`/`REVISE`. Review can complete while illegal Summon remains unchanged. Add explicit application step.

### Medium

- **Decision validation accepts invalid tokens** — `.agents/skills/fix-mse-cards/SKILL.md:114` checks only `READY`, absent `TODO`, revised text. `.agents/skills/update-rules/SKILL.md:92` similarly requires items be “decided” without exact enum validation. Typos/wrong decision vocabulary can reach apply phase, while `.agents/skills/update-rules/SKILL.md:98-100` defines no fallback. Validate exact per-item allowlists.

- **Tests permit known workflow regressions** — `tests/test_update_rules_skill.py:21-41` and `tests/test_update_rules_skill.py:64-72` use loose substring checks. No coverage for legacy Markdown fallback, exact decision enums, `ADD_PERMISSION` application, dark/readable/self-contained HTML contract. Current suite passes despite findings above.

### Correct

- HTML-only new decision docs explicitly required, including dark accessible style: `.agents/skills/fix-mse-cards/SKILL.md:24-49`, `.agents/skills/update-rules/SKILL.md:53-86`.
- Final ADR records accepted/revised/rejected outcomes: `.agents/skills/update-rules/SKILL.md:106-124`.
- Updated unit suite passes: 7 tests.
- Diff whitespace validation passes.
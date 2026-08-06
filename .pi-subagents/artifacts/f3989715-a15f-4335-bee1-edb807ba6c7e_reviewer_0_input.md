# Task for reviewer

[Read from: /home/aron/projects/YGO-x-MTG/plan.md, /home/aron/projects/YGO-x-MTG/progress.md]

Review Essentia branding rename for correctness, coverage, unintended scope. User contract: canonical full name `YGO × MTG: Essentia`; short name `Essentia`; prefer short name; website header must display only `Essentia`; rationale = preserves Yu-Gi-Oh! essence inside Magic card-game rules; repo dir/internal IDs stay unchanged. Inspect current worktree directly, but limit findings to branding-related changes/files. Existing worktree contains many unrelated user changes; do not review or modify them. Check stale display-brand refs, full-vs-short placement, MSE title-generation/test consistency, docs/content consistency. Return severity + file:line + smallest fix. Do not edit files.

## Acceptance Contract
Acceptance level: attested
Completion is not accepted from prose alone. End with a structured acceptance report.

Criteria:
- criterion-1: Return concrete findings with file paths and severity when applicable

Required evidence: review-findings, residual-risks

Finish with a fenced JSON block tagged `acceptance-report` in this shape:
Use empty arrays when no items apply; array fields contain strings unless object entries are shown.
`criteriaSatisfied[].status` must be exactly one of: satisfied, not-satisfied, not-applicable.
`commandsRun[].result` must be exactly one of: passed, failed, not-run.
`manualNotes` and `notes` are optional strings; an empty string means no note and does not satisfy `manual-notes` evidence.
```acceptance-report
{
  "criteriaSatisfied": [
    {
      "id": "criterion-1",
      "status": "satisfied",
      "evidence": "specific proof"
    }
  ],
  "changedFiles": [
    "src/file.ts"
  ],
  "testsAddedOrUpdated": [
    "test/file.test.ts"
  ],
  "commandsRun": [
    {
      "command": "command",
      "result": "passed",
      "summary": "short result"
    }
  ],
  "validationOutput": [
    "validation output or concise summary"
  ],
  "residualRisks": [
    "none"
  ],
  "noStagedFiles": true,
  "diffSummary": "short description of the diff",
  "reviewFindings": [
    "blocker: file.ts:12 - issue found, or no blockers"
  ],
  "manualNotes": "anything else the parent should know"
}
```
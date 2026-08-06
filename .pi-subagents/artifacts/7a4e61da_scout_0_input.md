# Task for scout

Analyze direct MSE edits for Legend of Alpha per supplied fix-mse-cards workflow, Phases 0-2 only. Scope cards_mse/01_pre_alpha/01_legend_of_alpha/01_YGO_Legend_of_Alpha.mse-set plus related cards_mse/01_pre_alpha/stage.json. Read all changed MSE files completely with utf-8-sig semantics; read docs/rules/TEMPLATING.md, docs/RULES.md, corresponding numbered docs (esp 10_burning_abyss, 12_nekroz), 2-3 relevant siblings, scripts naming project/cards, tests. Check includes/images/orphans/counts. Produce concise fact inventory + semantic difference ledger IDs with exact path:line, conflicting rule path:line, interpretation options. Flag illegal Summons needing explicit permission. Do not edit.

---
**Output:**
Write your findings to exactly this path: /home/aron/projects/YGO-x-MTG/.pi-subagents/artifacts/outputs/7a4e61da/ /tmp/legend-alpha-analysis.md
This path is authoritative for this run.
Ignore any other output filename or output path mentioned elsewhere, including output destinations in the base agent prompt, system prompt, or task instructions.
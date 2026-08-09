from hashlib import sha256
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
UPDATE_RULES = ROOT / ".agents/skills/update-rules/SKILL.md"
VALIDATE_MSE = ROOT / ".agents/skills/fix-mse-cards/SKILL.md"
PROPOSITION_TEMPLATE = ROOT / ".agents/skills/_shared/proposition-round.html"
CONTEXT = ROOT / "docs/CONTEXT.md"
RULES = ROOT / "docs/rules/TEMPLATING.md"
EVENTS = ROOT / "docs/keywords/EVENTS.md"
ZONES = ROOT / "docs/rules/ZONES.md"
SUMMONING = ROOT / "docs/rules/SUMMONING.md"
NEKROZ_KEYWORDS = ROOT / "docs/03_nekroz/KEYWORDS.md"
LEGEND_ADR = ROOT / "docs/ADR/accepted/0007-legend-of-alpha-rule-reconciliation.md"
SHADDOLL = ROOT / "docs/02_shaddoll/RULES.md"


class UpdateRulesSkillTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.skill = UPDATE_RULES.read_text(encoding="utf-8-sig")
        cls.validate_skill = VALIDATE_MSE.read_text(encoding="utf-8-sig")
        cls.template = PROPOSITION_TEMPLATE.read_text(encoding="utf-8-sig")
        cls.context = CONTEXT.read_text(encoding="utf-8-sig")
        cls.rules = RULES.read_text(encoding="utf-8-sig")
        cls.events = EVENTS.read_text(encoding="utf-8-sig")
        cls.zones = ZONES.read_text(encoding="utf-8-sig")
        cls.summoning = SUMMONING.read_text(encoding="utf-8-sig")
        cls.nekroz_keywords = NEKROZ_KEYWORDS.read_text(encoding="utf-8-sig")
        cls.legend_adr = LEGEND_ADR.read_text(encoding="utf-8-sig")
        cls.shaddoll = SHADDOLL.read_text(encoding="utf-8-sig")

    def test_shared_template_preserves_grill_me_clipboard_ui(self) -> None:
        self.assertEqual(
            sha256(PROPOSITION_TEMPLATE.read_bytes()).hexdigest(),
            "6ef6ba1f669072a700939225fcd9c5e2d8ea38a024be7ebb3770b30860176ac3",
        )
        for placeholder in (
            "{{ROUND_LABEL}}",
            "{{ROUND_TITLE}}",
            "{{ROUND_INTRO}}",
            "{{TREE_NODES}}",
            "{{TECHNICAL_VISUALS}}",
            "{{QUESTION_FIELDSETS}}",
        ):
            self.assertIn(placeholder, self.template)
        self.assertIn('input[type="checkbox"]:checked', self.template)
        self.assertIn("Copy answer summary", self.template)
        self.assertIn("navigator.clipboard.writeText", self.template)
        self.assertIn("Precision:", self.template)
        self.assertIn("color-scheme: dark", self.template)

    def test_both_skills_use_shared_html_template(self) -> None:
        shared = ".agents/skills/_shared/proposition-round.html"
        self.assertIn(shared, self.skill)
        self.assertIn(shared, self.validate_skill)
        self.assertIn("Never use `AskUserQuestion`", self.skill)
        self.assertIn("No `AskUserQuestion`", self.validate_skill)
        self.assertIn("Never generate new Markdown question/proposal docs", self.skill)
        self.assertIn("clipboard-summary JS", self.skill)
        self.assertIn("clipboard-summary JS", self.validate_skill)
        for skill in (self.skill, self.validate_skill):
            self.assertIn('data-question="<ID> | <question>"', skill)
            self.assertIn("Escape all dynamic evidence/labels/attrs", skill)
            self.assertIn("exact review header", skill)

    def test_pasted_summary_resumes_html_review_without_interview(self) -> None:
        self.assertIn("## Phase 3 — Resume/validate", self.skill)
        self.assertIn("summary label", self.skill)
        self.assertIn("one selection/item", self.skill)
        self.assertIn("token exactly `ACCEPT|REJECT|REVISE`", self.skill)
        self.assertIn("No selection + precision", self.skill)
        self.assertIn("Pasted summary = authority", self.skill)
        self.assertIn("skip generation/open/stop, enter Phase 3 immediately", self.skill)
        self.assertIn("No polling", self.skill)
        self.assertIn("Legacy Markdown", self.skill)

    def test_completed_rule_set_becomes_accepted_adr(self) -> None:
        self.assertIn("docs/ADR/accepted/NNNN-<scope-slug>.md", self.skill)
        self.assertIn("Rejected rules must remain in ADR", self.skill)
        self.assertIn("Update `docs/ADR/README.md` Accepted index", self.skill)
        self.assertIn("Never create new `docs/ADR/proposed/*` review", self.skill)
        self.assertIn("delete legacy review + remove Proposed-index link", self.skill)

    def test_only_pattern_destroyers_and_makers_create_rule_items(self) -> None:
        self.assertIn("`D*` pattern destroyer", self.skill)
        self.assertIn("`R*` pattern maker", self.skill)
        self.assertIn("one-card mechanic", self.skill)
        self.assertIn("already-documented rule", self.skill)
        self.assertIn("Reusable frame mappings remain eligible design rules", self.skill)
        self.assertIn("affected `docs/design/*`", self.skill)

    def test_general_and_archetype_rules_have_separate_owners(self) -> None:
        self.assertIn("Change ownership", self.context)
        self.assertIn("Archetype documentation", self.context)
        self.assertNotIn("Shaddoll creatures retain", self.context)
        self.assertIn("## Naming", self.shaddoll)
        self.assertIn("Do not standardize race as Puppet", self.shaddoll)
        self.assertIn("Card-specific value", self.context)
        self.assertIn("MSE only", self.context)

    def test_psct_order_is_documented(self) -> None:
        self.assertIn("PSCT", self.rules)
        self.assertIn("**condition keyword** —", self.rules)
        self.assertIn("costs and targets;", self.rules)
        self.assertIn("Targeting is activation action, never cost", self.rules)

    def test_legend_rule_decisions_are_documented(self) -> None:
        self.assertIn("Ability loss and power/toughness setting are independent", self.rules)
        self.assertIn("temporary-negation effect not intended as removal", self.rules)
        self.assertIn("custom keyword when that keyword defines the complete effect", self.rules)
        self.assertIn("next matching event this turn", self.events)
        self.assertIn("**After Attack**", self.events)
        self.assertIn("**After Block**", self.events)
        self.assertIn("next time you gain priority after combat damage resolves", self.events)
        self.assertIn("its owner may return it to Sideboard instead", self.zones)
        self.assertIn("If declined, it moves to the original destination", self.zones)
        self.assertIn("optional owner replacement", self.summoning)
        self.assertIn("**Nekroz Recovery**", self.nekroz_keywords)
        for decision in ("D1", "D4", "D5", "D8", "D9"):
            self.assertIn(f"### {decision} —", self.legend_adr)
        self.assertEqual(self.legend_adr.count("Outcome: **REVISE**"), 4)
        self.assertEqual(self.legend_adr.count("Outcome: **ACCEPT**"), 1)

    def test_validate_mse_uses_clipboard_html_gates(self) -> None:
        self.assertIn("card-conflicts.html", self.validate_skill)
        self.assertIn("rule-proposals.html", self.validate_skill)
        self.assertIn("Copy answer summary", self.validate_skill)
        self.assertIn("Pasted summary = authority", self.validate_skill)
        self.assertIn("preserve MSE card/archetype change", self.validate_skill)
        self.assertIn("No `AskUserQuestion`", self.validate_skill)
        self.assertIn("final ADR", self.validate_skill)
        self.assertIn("`ADD_PERMISSION` clause", self.validate_skill)
        self.assertIn("`ADD_PERMISSION|KEEP_RESTRICTIONS|REVISE`", self.validate_skill)
        self.assertIn("valid token", self.validate_skill)
        self.assertIn("answer_summary=<exact-pasted-summary>", self.validate_skill)
        self.assertIn("Reclassify every `REVISE` final wording", self.validate_skill)
        self.assertIn("`docs/design/*`", self.validate_skill)


if __name__ == "__main__":
    unittest.main()

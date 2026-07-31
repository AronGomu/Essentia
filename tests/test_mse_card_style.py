from __future__ import annotations

import contextlib
import importlib.util
import io
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / ".script" / "lint_mse_card_style.py"
SPEC = importlib.util.spec_from_file_location("lint_mse_card_style", SCRIPT)
assert SPEC and SPEC.loader
LINTER = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = LINTER
SPEC.loader.exec_module(LINTER)

INVENTORY_SCRIPT = ROOT / ".script" / "_kw_inventory.py"
INVENTORY_SPEC = importlib.util.spec_from_file_location("kw_inventory", INVENTORY_SCRIPT)
assert INVENTORY_SPEC and INVENTORY_SPEC.loader
INVENTORY = importlib.util.module_from_spec(INVENTORY_SPEC)
sys.path.insert(0, str(ROOT / ".script"))
INVENTORY_SPEC.loader.exec_module(INVENTORY)


def write_project(root: Path, rule_text: str, *, name: str = "Test Card") -> Path:
    project = root / "01_Test.mse-set"
    project.mkdir(parents=True, exist_ok=True)
    (project / "set").write_text("include_file: card test\n", encoding="utf-8")
    if "\n" in rule_text:
        rendered_rules = "\trule_text:\n" + "\n".join(f"\t\t{line}" for line in rule_text.splitlines()) + "\n"
    else:
        rendered_rules = f"\trule_text: {rule_text}\n"
    (project / "card test").write_text(
        "mse_version: 2.5.8\n"
        "card:\n"
        f"\tname: {name}\n"
        f"{rendered_rules}"
        "\tflavor_text: <i-flavor></i-flavor>\n",
        encoding="utf-8",
    )
    return project


class MseCardStyleTests(unittest.TestCase):
    def test_checked_in_canonical_cards_pass(self) -> None:
        self.assertEqual(LINTER.lint(), [])

    def test_valid_keyword_zone_and_name_markup_passes(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            write_project(
                root,
                "<b>Discard</b> <i-auto>Test Card</i-auto> from Hand; "
                "<b>Draw</b> 1 card. The target skips its draw step if it was cast.",
            )
            self.assertEqual(LINTER.lint(root), [])

    def test_invalid_style_reports_exact_rule_ids(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            write_project(root, "Discard Test Card from hand and <b>Target</b> 1 <b>Grave</b> card named “Other”.")
            self.assertEqual(
                {finding.rule for finding in LINTER.lint(root)},
                {"MSE002", "MSE005", "MSE006", "MSE007", "MSE008"},
            )

    def test_markup_metadata_and_unknown_keyword_rules(self) -> None:
        cases = {
            "<b>Discard</b> 1 card.</b>": "MSE001",
            "<b>Discard 1 card.": "MSE001",
            "<kw-a><key>Flash</key>": "MSE001",
            "<param-cost><sym-auto>2</param-cost>": "MSE001",
            "<b>Static</b>": "MSE003",
            "<b>Invented Action</b>": "MSE004",
        }
        for rule_text, expected in cases.items():
            with self.subTest(expected=expected), tempfile.TemporaryDirectory() as directory:
                findings = LINTER.lint(Path(directory))
                self.assertEqual(findings, [])
                write_project(Path(directory), rule_text)
                self.assertIn(expected, {finding.rule for finding in LINTER.lint(Path(directory))})

    def test_multiline_rule_reports_physical_line(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            write_project(root, "First line.\nDiscard 1 card.")
            finding = next(item for item in LINTER.lint(root) if item.rule == "MSE006")
            self.assertEqual(finding.line, 6)
            self.assertIn("Discard", finding.message)

    def test_bold_homonyms_must_remain_plain(self) -> None:
        cases = (
            "the <b>Target</b>",
            "Predator <b>Counter</b>",
            "<b>Draw</b> step",
            "was <b>Cast</b>",
            "restrictions of <b>Summon</b>",
            "<b>Sacrifice</b> cost",
        )
        for rule_text in cases:
            with self.subTest(rule_text=rule_text), tempfile.TemporaryDirectory() as directory:
                findings = LINTER.lint(Path(directory))
                self.assertEqual(findings, [])
                write_project(Path(directory), rule_text)
                self.assertIn("MSE009", {finding.rule for finding in LINTER.lint(Path(directory))})

    def test_plain_non_action_keywords_and_prefix_are_rejected(self) -> None:
        cases = {
            "Flying": "MSE014",
            "Alternative Cost — W": "MSE014",
            "On Enter — <b>Draw</b> 1 card.": "MSE014",
            "(1 - Static) <b>Flying</b>": "MSE015",
        }
        for rule_text, expected in cases.items():
            with self.subTest(expected=expected), tempfile.TemporaryDirectory() as directory:
                root = Path(directory)
                write_project(root, rule_text)
                self.assertIn(expected, {finding.rule for finding in LINTER.lint(root)})

    def test_keyword_families_are_case_aware_and_bold(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            write_project(root, "Creatures have ward 3.")
            self.assertIn("MSE014", {finding.rule for finding in LINTER.lint(root)})
            write_project(
                root,
                "<b>Ward 3</b>, <b>Protection from red</b>. "
                "<b>On Cast <i-auto>“Nekroz”</i-auto> Ritual</b> — <b>Exile 2 Plants from Grave</b>.",
            )
            self.assertEqual(LINTER.lint(root), [])

    def test_protection_type_keyword_uses_canonical_case(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            write_project(root, "Protection from Creatures")
            finding = next(item for item in LINTER.lint(root) if item.rule == "MSE014")
            self.assertEqual(finding.suggestion, "use <b>Protection from Creatures</b>")

    def test_standalone_flash_is_allowed_but_bold_prefix_flash_is_not(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            write_project(root, "<b>Flash</b>")
            self.assertEqual(LINTER.lint(root), [])
            write_project(root, "<i-auto>(1 - Activated <b>Flash</b>)</i-auto>")
            self.assertIn("MSE003", {finding.rule for finding in LINTER.lint(root)})

    def test_standalone_bold_exile_zone_is_rejected(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            write_project(root, "Put it into <b>Exile</b>.")
            finding = next(item for item in LINTER.lint(root) if item.rule == "MSE002")
            self.assertEqual(finding.suggestion, "use plain Exile")

    def test_documented_event_and_generic_type_pass(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            write_project(
                root,
                "<b>On Attack</b> or <b>On Opponent Upkeep</b> or <b>On Opponent End Step</b> — "
                "<b>Draw</b> 1 card for each Angel Creature.",
                name="Chaos Angel",
            )
            self.assertEqual(LINTER.lint(root), [])

    def test_legacy_grave_terms_are_rejected(self) -> None:
        for term in ("graveyard", "graveyards", "GY", "GYD", "G.Y."):
            with self.subTest(term=term), tempfile.TemporaryDirectory() as directory:
                root = Path(directory)
                write_project(root, f"Put it into {term}.")
                self.assertIn("MSE019", {finding.rule for finding in LINTER.lint(root)})

    def test_counter_noun_and_exile_zone_context(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            write_project(root, "Put 1 charge counter on this card. Exile is empty.")
            self.assertEqual(LINTER.lint(root), [])
            write_project(root, "Move cards between exiles.")
            finding = next(item for item in LINTER.lint(root) if item.rule == "MSE005")
            self.assertEqual(finding.suggestion, "use Exiles")

    def test_conjugated_action_uses_sentence_case(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            write_project(root, "If this was Summoned, <b>Draw</b> 1 card.")
            finding = next(item for item in LINTER.lint(root) if item.rule == "MSE011")
            self.assertEqual(finding.suggestion, "use summoned")
        for rule_text in ("Summoned creatures have Flying.", "Text. Summoned creatures have Flying."):
            with self.subTest(rule_text=rule_text), tempfile.TemporaryDirectory() as directory:
                root = Path(directory)
                write_project(root, rule_text.replace("Flying", "<b>Flying</b>"))
                self.assertNotIn("MSE011", {finding.rule for finding in LINTER.lint(root)})

    def test_action_homonyms_and_third_person_forms(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            write_project(root, "After the Search, this effect exiles it. <b>Counter</b> target Spell.")
            self.assertEqual(LINTER.lint(root), [])

    def test_plain_name_fragment_is_rejected(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            write_project(root, "Spellbook Creatures get +1/+1.")
            self.assertIn("MSE012", {finding.rule for finding in LINTER.lint(root)})

    def test_card_types_require_canonical_case_and_plain_style(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            write_project(root, "Target 1 creature. Counter target spell or noncreature permanent.")
            findings = {finding.rule for finding in LINTER.lint(root)}
            self.assertIn("MSE017", findings)
            write_project(root, "Target 1 <b>Creature</b>. Counter target Spell.")
            self.assertIn("MSE018", {finding.rule for finding in LINTER.lint(root)})
            write_project(root, "Target 1 Creature. Counter target Spell. Send it to Grave.")
            self.assertNotIn("MSE017", {finding.rule for finding in LINTER.lint(root)})

    def test_effect_veiler_self_name_cost_requires_italics(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            write_project(root, "<b>Discard</b> Effect Veiler; <b>Target</b> 1 Creature.", name="Effect Veiler")
            self.assertIn("MSE008", {finding.rule for finding in LINTER.lint(root)})
            write_project(root, "<b>Discard</b> <i-auto>Effect Veiler</i-auto>; <b>Target</b> 1 Creature.", name="Effect Veiler")
            self.assertNotIn("MSE008", {finding.rule for finding in LINTER.lint(root)})

    def test_non_self_italic_name_still_requires_quotes(self) -> None:
        for tag in ("i", "i-auto"):
            with self.subTest(tag=tag), tempfile.TemporaryDirectory() as directory:
                root = Path(directory)
                project = write_project(root, f"<b>Return</b> <{tag}>Other Card</{tag}> to Hand.")
                (project / "set").write_text("include_file: card test\ninclude_file: card other\n", encoding="utf-8")
                (project / "card other").write_text(
                    "card:\n\tname: Other Card\n\trule_text:\n\tflavor_text:\n",
                    encoding="utf-8",
                )
                self.assertIn("MSE013", {finding.rule for finding in LINTER.lint(root)})

    def test_full_self_name_must_not_be_quoted(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            write_project(root, "<i-auto>“Test Card”</i-auto>")
            self.assertIn("MSE016", {finding.rule for finding in LINTER.lint(root)})

    def test_exact_other_card_name_requires_italics(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            project = write_project(root, "<b>Return</b> Other Card to Hand.")
            (project / "set").write_text("include_file: card test\ninclude_file: card other\n", encoding="utf-8")
            (project / "card other").write_text(
                "card:\n\tname: Other Card\n\trule_text:\n\tflavor_text:\n",
                encoding="utf-8",
            )
            self.assertIn("MSE010", {finding.rule for finding in LINTER.lint(root)})

    def test_short_partial_card_names_require_italics(self) -> None:
        for other_name, reference in (("Number 11: Big Eye", "Big"), ("T.G. Hyper Librarian", "T.G.")):
            with self.subTest(reference=reference), tempfile.TemporaryDirectory() as directory:
                root = Path(directory)
                project = write_project(root, f"<b>Return</b> {reference} to Hand.")
                (project / "set").write_text("include_file: card test\ninclude_file: card other\n", encoding="utf-8")
                (project / "card other").write_text(
                    f"card:\n\tname: {other_name}\n\trule_text:\n\tflavor_text:\n",
                    encoding="utf-8",
                )
                self.assertIn("MSE010", {finding.rule for finding in LINTER.lint(root)})

    def test_other_card_partial_alias_requires_italics_and_quotes(self) -> None:
        for reference, expected in (("Dante", "MSE010"), ("<i-auto>Dante</i-auto>", "MSE013")):
            with self.subTest(reference=reference), tempfile.TemporaryDirectory() as directory:
                root = Path(directory)
                project = write_project(root, f"<b>Return</b> {reference} to Hand.")
                (project / "set").write_text("include_file: card test\ninclude_file: card dante\n", encoding="utf-8")
                (project / "card dante").write_text(
                    "card:\n\tname: Burning Abyss - Dante\n\trule_text:\n\tflavor_text:\n",
                    encoding="utf-8",
                )
                self.assertIn(expected, {finding.rule for finding in LINTER.lint(root)})

    def test_cli_returns_diagnostics_and_exit_codes(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            write_project(root, "Discard 1 card.")
            invalid = subprocess.run(
                [sys.executable, str(SCRIPT), "--projects-root", str(root)],
                capture_output=True,
                text=True,
                encoding="utf-8",
                check=False,
            )
            self.assertEqual(invalid.returncode, 1)
            self.assertIn(":4: MSE006:", invalid.stdout)
            self.assertIn("Fix: use <b>Discard</b>", invalid.stdout)
            write_project(root, "<b>Discard</b> 1 card.")
            valid = subprocess.run(
                [sys.executable, str(SCRIPT), "--projects-root", str(root)],
                capture_output=True,
                text=True,
                encoding="utf-8",
                check=False,
            )
            self.assertEqual(valid.returncode, 0)
            self.assertIn("MSE card style OK", valid.stdout)

    def test_inventory_generation_refuses_invalid_corpus(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            output = root / "inventory.md"
            write_project(root, "Discard 1 card.")
            with contextlib.redirect_stdout(io.StringIO()):
                result = INVENTORY.generate(root, output)
            self.assertEqual(result, 1)
            self.assertFalse(output.exists())

    def test_linter_scans_nested_lifecycle_projects(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            project = root / "00_drafts" / "01_test" / "01_Test.mse-set"
            project.mkdir(parents=True)
            (project / "set").write_text("include_file: card test\n", encoding="utf-8")
            (project / "card test").write_text(
                "card:\n\tname: Test Card\n\trule_text: discard from hand\n\tflavor_text:\n",
                encoding="utf-8",
            )
            findings = LINTER.lint(root)
            self.assertEqual(len(findings), 1)
            self.assertEqual(findings[0].rule, "MSE005")


if __name__ == "__main__":
    unittest.main()

from __future__ import annotations

import importlib.util
import os
import re
import sys
import time
import unittest
import unittest.mock
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / ".script" / "lint_mse_card_style.py"
SPEC = importlib.util.spec_from_file_location("lint_mse_card_style", SCRIPT)
assert SPEC and SPEC.loader
LINTER = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = LINTER
SPEC.loader.exec_module(LINTER)


def write_project(root: Path, name: str, rule_text: str, *, folder: str) -> Path:
    project = root / folder
    project.mkdir(parents=True, exist_ok=True)
    (project / "set").write_text("include_file: card test\n", encoding="utf-8")
    (project / "card test").write_text(
        "mse_version: 2.5.8\n"
        "card:\n"
        f"\tname: {name}\n"
        f"\trule_text: {rule_text}\n"
        "\tflavor_text: <i-flavor></i-flavor>\n",
        encoding="utf-8",
    )
    return project


class BoundarySearchTests(unittest.TestCase):
    def test_boundary_search_respects_word_boundaries(self) -> None:
        self.assertIsNotNone(LINTER.boundary_search("Nekroz", "Nekroz of Trishula"))
        self.assertIsNone(LINTER.boundary_search("Nekroz", "XNekrozY"))
        self.assertIsNone(LINTER.boundary_search("Nekroz", "nekroz"))

    def test_boundary_search_matches_reference_regex(self) -> None:
        pairs = [
            ("Dante", "Burning Abyss - Dante"),
            ("ARK", "Silent Honor ARK"),
            ("Set", "Setup"),
            ("Set", "You may Set this card."),
            ("Nekroz", "Nekroz of Trishula"),
            ("Shaddoll", "The Shaddollx"),
        ]
        for needle, text in pairs:
            with self.subTest(needle=needle, text=text):
                reference = re.search(rf"(?<![\w]){re.escape(needle)}(?![\w])", text)
                actual = LINTER.boundary_search(needle, text)
                self.assertEqual(bool(actual), bool(reference))


class LintPerformanceTests(unittest.TestCase):
    def test_lint_compiles_a_bounded_number_of_patterns(self) -> None:
        LINTER._boundary_pattern.cache_clear()
        import tempfile

        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            write_project(root, "Nekroz of Trishula", "<b>Discard</b> 1 card from Hand.", folder="01_A.mse-set")
            write_project(root, "Shaddoll Falco", "<b>Search</b> your Deck for a card.", folder="02_B.mse-set")
            write_project(root, "Burning Abyss - Dante", "<b>Summon</b> a Creature from Grave.", folder="03_C.mse-set")
            with unittest.mock.patch("re.compile", wraps=re.compile) as spy:
                LINTER.lint(root)
            self.assertLessEqual(spy.call_count, 400)

    def test_full_corpus_lint_under_two_seconds(self) -> None:
        start = time.perf_counter()
        LINTER.lint()
        elapsed = time.perf_counter() - start
        self.assertLessEqual(elapsed, 2.0)

    def test_findings_are_hash_seed_stable(self) -> None:
        env0 = {**os.environ, "PYTHONHASHSEED": "0"}
        env1 = {**os.environ, "PYTHONHASHSEED": "1"}
        result0 = subprocess.run([sys.executable, str(SCRIPT)], env=env0, capture_output=True, text=True)
        result1 = subprocess.run([sys.executable, str(SCRIPT)], env=env1, capture_output=True, text=True)
        self.assertEqual(result0.stdout, result1.stdout)


if __name__ == "__main__":
    unittest.main()

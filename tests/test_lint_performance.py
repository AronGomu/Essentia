from __future__ import annotations

import importlib.util
import os
import re
import sys
import time
import unittest
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


def write_scanned_project(root: Path, name: str, lines: list[str], *, folder: str) -> Path:
    """A project whose rule text really reaches the keyword and alias scans, so the
    boundary-pattern cache is exercised instead of short-circuited by the prefilter."""
    project = root / folder
    project.mkdir(parents=True, exist_ok=True)
    (project / "set").write_text("include_file: card test\n", encoding="utf-8")
    body = "".join(f"\t\t{line}\n" for line in lines)
    (project / "card test").write_text(
        "mse_version: 2.5.8\n"
        "card:\n"
        f"\tname: {name}\n"
        f"\trule_text:\n{body}"
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

    def test_prefilter_keeps_matches_a_non_length_preserving_fold_hides(self) -> None:
        # 'İ'.casefold() is two codepoints, so the casefolded copy no longer
        # contains 'discard' even though the reference regex still matches.
        for needle, text in [("Discard", "DİSCARD"), ("Discard", "Discard 1 card"), ("Set", "SET this card")]:
            with self.subTest(needle=needle, text=text):
                reference = list(re.finditer(rf"(?<![\w]){re.escape(needle)}(?![\w])", text, re.IGNORECASE))
                actual = LINTER.boundary_finditer(needle, text, text.casefold())
                self.assertEqual(
                    [(match.start(), match.end()) for match in actual],
                    [(match.start(), match.end()) for match in reference],
                )


class LintPerformanceTests(unittest.TestCase):
    def test_each_boundary_pattern_compiles_once_and_is_reused(self) -> None:
        """The bug was one compile per needle per line. Reuse has to show up as cache
        hits: without the `lru_cache` every call is a miss and this goes red."""
        LINTER._boundary_pattern.cache_clear()
        import tempfile

        lines = ["Discard 1 card, then Summon Nekroz of Trishula from your Grave."] * 8
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            write_scanned_project(root, "Nekroz of Trishula", lines, folder="01_A.mse-set")
            write_scanned_project(root, "Shaddoll Falco", lines, folder="02_B.mse-set")
            write_scanned_project(root, "Burning Abyss - Dante", lines, folder="03_C.mse-set")
            findings = LINTER.lint(root)

        self.assertTrue(findings, "fixture must reach the keyword and alias scans")
        info = LINTER._boundary_pattern.cache_info()
        self.assertGreater(info.misses, 0, "no boundary pattern was compiled at all")
        # One compile per distinct needle, not per needle per line.
        self.assertLessEqual(info.misses, 10)
        self.assertGreater(info.hits, info.misses * 5)

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
        # A crashed run prints nothing and would compare equal to another crash.
        # Exit 1 means findings, exit 0 means a clean corpus; anything else is a crash.
        for result in (result0, result1):
            self.assertIn(result.returncode, (0, 1), result.stderr[-2000:])
            self.assertTrue(result.stdout.strip(), "lint printed nothing at all")
            first = result.stdout.splitlines()[0]
            self.assertTrue(
                ": MSE" in first or first == "MSE card style OK",
                f"unrecognised lint output: {first!r}",
            )
        self.assertEqual(result0.stdout, result1.stdout)


if __name__ == "__main__":
    unittest.main()

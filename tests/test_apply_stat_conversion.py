from __future__ import annotations

import importlib.util
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / ".script" / "apply_stat_conversion.py"


def _load():
    import sys

    spec = importlib.util.spec_from_file_location("apply_stat_conversion", SCRIPT)
    assert spec and spec.loader
    mod = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = mod
    spec.loader.exec_module(mod)
    return mod


class StatConversionMathTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.mod = _load()

    def test_ratio_examples_from_spec(self) -> None:
        c = self.mod.convert_stat
        self.assertEqual(c(2000), 5)  # 2000/8000 * 20
        self.assertEqual(c(1900), 4)  # 4.75 truncated
        self.assertEqual(c(1600), 4)  # Cir ATK
        self.assertEqual(c(1200), 3)  # Cir DEF
        self.assertEqual(c(0), 0)
        self.assertEqual(c(100), 0)
        self.assertEqual(c(400), 1)
        self.assertEqual(c(399), 0)

    def test_convert_pair_skips_non_numeric(self) -> None:
        r = self.mod.convert_pair(2300, None)
        self.assertEqual(r.power, 5)
        self.assertIsNone(r.toughness)
        r2 = self.mod.convert_pair(None, 1800)
        self.assertIsNone(r2.power)
        self.assertEqual(r2.toughness, 4)

    def test_zero_def_min_toughness_one(self) -> None:
        r = self.mod.convert_pair(1200, 0)
        self.assertEqual(r.power, 3)
        self.assertEqual(r.toughness, 1)
        r2 = self.mod.convert_pair(0, 0)
        self.assertEqual(r2.power, 0)
        self.assertEqual(r2.toughness, 1)
        # low DEF that floors to 0 also clamped
        r3 = self.mod.convert_pair(100, 100)
        self.assertEqual(r3.toughness, 1)

    def test_parse_stat_token(self) -> None:
        p = self.mod.parse_stat_token
        self.assertEqual(p("1600"), 1600)
        self.assertIsNone(p("—"))
        self.assertIsNone(p("?"))
        self.assertIsNone(p("-"))


class StatConversionMatchTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.mod = _load()
        cls.index = cls.mod.load_original_stats()

    def test_cir_name_map(self) -> None:
        stats = self.mod.resolve_original("Burning Abyss - Cir", self.index)
        self.assertIsNotNone(stats)
        assert stats is not None
        self.assertEqual(stats.atk, 1600)
        self.assertEqual(stats.defense, 1200)
        pair = self.mod.convert_pair(stats.atk, stats.defense)
        self.assertEqual(pair.power, 4)
        self.assertEqual(pair.toughness, 3)

    def test_nekroz_short_title(self) -> None:
        stats = self.mod.resolve_original("Nekroz - Brionac", self.index)
        self.assertIsNotNone(stats)
        assert stats is not None
        self.assertEqual(stats.name, "Nekroz of Brionac")
        self.assertEqual(stats.atk, 2300)

    def test_shaddoll_core_has_no_monster_stats(self) -> None:
        # Trap with leftover P/T frame fields — must not fuzzy-match Unicore.
        self.assertIsNone(self.mod.resolve_original("Shaddoll - Core", self.index))

    def test_exact_official_name(self) -> None:
        stats = self.mod.resolve_original("Mathematician", self.index)
        self.assertIsNotNone(stats)
        assert stats is not None
        self.assertEqual(stats.atk, 1500)

    def test_apply_to_card_text_rewrites_power_toughness(self) -> None:
        sample = (
            "mse_version: 2.5.8\n"
            "card:\n"
            "\tname: Burning Abyss - Cir\n"
            "\tpower: 3\n"
            "\ttoughness: 2\n"
        )
        new, notes = self.mod.apply_to_card_text(sample, power=4, toughness=3)
        self.assertIn("power: 4", new)
        self.assertIn("toughness: 3", new)
        self.assertTrue(any("power" in n for n in notes))


if __name__ == "__main__":
    unittest.main()

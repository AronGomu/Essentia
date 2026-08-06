from __future__ import annotations

import argparse
import importlib.util
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location(
    "generate_print_pdfs", ROOT / ".script" / "generate_print_pdfs.py"
)
assert SPEC and SPEC.loader
PDF = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(PDF)


class PrintPdfTests(unittest.TestCase):
    def renders(self, directory: str, *names: str) -> list[Path]:
        folder = Path(directory) / "Test_Set_0.1" / "renders"
        folder.mkdir(parents=True)
        images = []
        for name in names:
            image = folder / f"{name}.png"
            image.write_bytes(name.encode())
            images.append(image)
        return images

    def test_every_card_defaults_to_two_copies(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            images = self.renders(directory, "Card One", "Card Two")
            plan, matched = PDF.copy_plan(images, PDF.DEFAULT_COPIES, {})
            self.assertEqual(PDF.DEFAULT_COPIES, 2)
            self.assertEqual([item["copies"] for item in plan], [2, 2])
            self.assertEqual([item["card"] for item in plan], ["Card One", "Card Two"])
            self.assertEqual(matched, set())

    def test_override_applies_to_one_card_only(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            images = self.renders(directory, "Silent Honor ARK", "Card Two")
            overrides = {PDF.card_key("silent honor ark"): 1}
            plan, matched = PDF.copy_plan(images, 2, overrides)
            self.assertEqual(
                {item["card"]: item["copies"] for item in plan},
                {"Silent Honor ARK": 1, "Card Two": 2},
            )
            self.assertEqual(matched, set(overrides))

    def test_zero_copies_drops_card_from_plan(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            images = self.renders(directory, "Card One", "Card Two")
            plan, matched = PDF.copy_plan(images, 2, {PDF.card_key("Card One"): 0})
            self.assertEqual([item["card"] for item in plan], ["Card Two"])
            self.assertEqual(matched, {PDF.card_key("Card One")})

    def test_copy_override_parsing_rejects_bad_input(self) -> None:
        self.assertEqual(PDF.parse_copy_override("Maxx “C”=3"), ("Maxx “C”", 3))
        for value in ("Card One", "Card One=x", "=2", "Card One=-1"):
            with self.assertRaises(argparse.ArgumentTypeError):
                PDF.parse_copy_override(value)

    def test_card_key_ignores_case_and_punctuation(self) -> None:
        self.assertEqual(PDF.card_key("Silent Honor ARK"), PDF.card_key("silent-honor-ark"))
        self.assertNotEqual(PDF.card_key("Nekroz - Exa"), PDF.card_key("Nekroz - Cycle"))


if __name__ == "__main__":
    unittest.main()

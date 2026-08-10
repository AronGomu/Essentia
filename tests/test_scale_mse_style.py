from __future__ import annotations

import importlib.util
import json
import unittest
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]
SCRIPT_PATH = REPO_ROOT / ".script" / "scale_mse_style.py"

spec = importlib.util.spec_from_file_location("scale_mse_style", SCRIPT_PATH)
if spec is None or spec.loader is None:
    raise RuntimeError(f"Unable to load {SCRIPT_PATH}")
scale_mse_style = importlib.util.module_from_spec(spec)
spec.loader.exec_module(scale_mse_style)


class ScaleMseStyleTests(unittest.TestCase):
    def test_card_dimensions_scale(self) -> None:
        text = "card width: 375\ncard height: 523\n"

        self.assertEqual(
            scale_mse_style.scale_style_text(text, 2),
            "card width: 750\ncard height: 1046\n",
        )

    def test_positional_keys_scale(self) -> None:
        text = "\tleft: 30\n\ttop: 12.5\n"

        self.assertEqual(
            scale_mse_style.scale_style_text(text, 2),
            "\tleft: 60\n\ttop: 25.00\n",
        )

    def test_non_geometric_keys_untouched(self) -> None:
        text = (
            "version: 2024-05-30\n"
            "depends on: magic.mse-game 2008-06-02\n"
            "card dpi: 150\n"
        )

        self.assertEqual(scale_mse_style.scale_style_text(text, 2), text)

    def test_script_bodies_untouched(self) -> None:
        text = (
            "init script:\n"
            "\twidth: 375\n"
            "stylesheet:\n"
            "\tscript:\n"
            "\t\theight: 523\n"
            "\tleft: 30\n"
        )

        self.assertEqual(
            scale_mse_style.scale_style_text(text, 2),
            (
                "init script:\n"
                "\twidth: 375\n"
                "stylesheet:\n"
                "\tscript:\n"
                "\t\theight: 523\n"
                "\tleft: 60\n"
            ),
        )

    def test_fractional_factor_rounds_integers(self) -> None:
        self.assertEqual(
            scale_mse_style.scale_style_text("\tleft: 100\n", 750 / 744),
            "\tleft: 101\n",
        )

    def test_manifest_covers_every_vendored_file(self) -> None:
        mse_root = REPO_ROOT / "MSE"
        manifest = json.loads((mse_root / "manifest.json").read_text(encoding="utf-8"))
        entries = set(manifest["files"])
        vendored = {
            path.relative_to(mse_root).as_posix()
            for directory in (
                mse_root / "bin",
                mse_root / "data",
                mse_root / "fonts",
                mse_root / "resource",
            )
            if directory.exists()
            for path in directory.rglob("*")
            if path.is_file()
            and "data/essentia-print.mse-export-template/"
            not in path.relative_to(mse_root).as_posix()
        }

        self.assertEqual(vendored - entries, set())
        self.assertEqual(
            [relative for relative in entries if not (mse_root / relative).is_file()],
            [],
        )


if __name__ == "__main__":
    unittest.main()

from __future__ import annotations

import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location(
    "create_proxy_pdf", ROOT / ".script" / "create_proxy_pdf.py"
)
assert SPEC and SPEC.loader
PDF = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(PDF)


class ProxyPdfTests(unittest.TestCase):
    def test_release_decks_print_three_copies_per_card_per_deck(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            package = Path(directory) / "Test_Set_0.1"
            renders = package / "renders"
            renders.mkdir(parents=True)
            images = []
            for name in ("Shared Card", "First Only"):
                image = renders / PDF.render_filename(name)
                image.write_bytes(name.encode())
                images.append(image)
            (package / "aggregate-manifest.json").write_text(
                json.dumps(
                    {
                        "cards": [
                            {"stableId": "shared", "name": "Shared Card"},
                            {"stableId": "first", "name": "First Only"},
                        ]
                    }
                ),
                encoding="utf-8",
            )
            (package / "release.json").write_text(
                json.dumps(
                    {
                        "decks": [
                            {"id": "one", "cards": ["shared", "first"]},
                            {"id": "two", "cards": ["shared"]},
                        ]
                    }
                ),
                encoding="utf-8",
            )
            plan = {
                item["stableId"]: item["copies"]
                for item in PDF.copy_plan(images, default_copies=1)
            }
            self.assertEqual(plan, {"shared": 6, "first": 3})

    def test_package_without_decks_prints_three_copies_of_every_card(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            package = Path(directory) / "Test_Set_0.1"
            renders = package / "renders"
            renders.mkdir(parents=True)
            image = renders / PDF.render_filename("Card One")
            image.write_bytes(b"card")
            (package / "aggregate-manifest.json").write_text(
                json.dumps({"cards": [{"stableId": "one", "name": "Card One"}]}),
                encoding="utf-8",
            )
            (package / "release.json").write_text(
                json.dumps({"decks": []}), encoding="utf-8"
            )
            plan = PDF.copy_plan([image], default_copies=1)
            self.assertEqual(plan[0]["copies"], 3)
            self.assertEqual(plan[0]["stableId"], "one")


if __name__ == "__main__":
    unittest.main()

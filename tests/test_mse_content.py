from __future__ import annotations

import importlib.util
import json
import sys
import tempfile
import unittest
from datetime import datetime
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / ".script"
sys.path.insert(0, str(SCRIPT))

import mse_content


class MSEContentTests(unittest.TestCase):
    def make_project(
        self,
        root: Path,
        *,
        duplicate: bool = False,
        missing_art: bool = False,
        two: bool = False,
    ) -> Path:
        project = root / "demo.mse-set"
        project.mkdir()
        includes = ["card one", "card two"] if duplicate or two else ["card one"]
        (project / "set").write_text(
            "mse_version: 2.0.2\ngame: magic\nstylesheet: sevenhalf\n"
            + "".join(f"include_file: {item}\n" for item in includes),
            encoding="utf-8",
        )
        Image.new("RGB", (2, 2), "white").save(project / "image.png")
        for index, include in enumerate(includes):
            name = "One" if duplicate else f"Card {'One' if index == 0 else 'Two'}"
            (project / include).write_text(
                "card:\n\ttime_created: 2026-01-01 10:00:00\n"
                "\ttime_modified: 2026-01-02 10:00:00\n"
                f"\tname: {name}\n"
                f"\timage: {'missing.png' if missing_art else 'image.png'}\n"
                f"\trule_text:\n\t\tRule {index}.\n\tcard_code_text: 001/001 R\n",
                encoding="utf-8",
            )
        return project

    def test_manifest_loads_exact_order_and_fields(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            cards = mse_content.load_manifest(
                self.make_project(Path(directory), two=True)
            )
            self.assertEqual([card.name for card in cards], ["Card One", "Card Two"])
            self.assertEqual([card.index for card in cards], [0, 1])
            self.assertEqual(cards[0].modified, "2026-01-02 10:00:00")

    def test_missing_art_fails_closed(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            with self.assertRaisesRegex(mse_content.MSESourceError, "missing"):
                mse_content.load_manifest(self.make_project(Path(directory), missing_art=True))

    def test_invalid_art_fails_closed(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            project = self.make_project(Path(directory))
            (project / "image.png").write_bytes(b"not an image")
            with self.assertRaisesRegex(mse_content.MSESourceError, "invalid image"):
                mse_content.load_manifest(project)

    def test_duplicate_included_display_names_fail(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            with self.assertRaisesRegex(mse_content.MSESourceError, "duplicate included display name"):
                mse_content.load_manifest(self.make_project(Path(directory), duplicate=True))

    def test_path_escape_and_absolute_path_fail(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory) / "source"
            root.mkdir()
            (root / "ok").write_text("x", encoding="utf-8")
            (root.parent / "outside").write_text("private", encoding="utf-8")
            for raw in (
                "../outside",
                "C:\\outside",
                "C:outside",
                "\\\\server\\share",
            ):
                with self.subTest(raw=raw), self.assertRaises(mse_content.MSESourceError):
                    mse_content.contained_path(root, raw)

    def test_semantic_hash_ignores_notes_numbering_and_timestamps(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            project = self.make_project(Path(directory))
            card = project / "card one"
            before = mse_content.semantic_fingerprint(card)
            text = card.read_text(encoding="utf-8")
            text = text.replace("2026-01-02 10:00:00", "2026-02-02 10:00:00")
            text = text.replace("001/001 R", "099/099 R")
            text = text.replace("card:\n", "card:\n\tnotes: maintenance\n")
            card.write_text(text, encoding="utf-8")
            self.assertEqual(before, mse_content.semantic_fingerprint(card))

    def test_visual_source_hash_changes_for_artwork(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            project = self.make_project(Path(directory))
            card = mse_content.load_manifest(project)[0]
            before = mse_content.visual_source_hash(project, card)
            Image.new("RGB", (2, 2), "black").save(project / "image.png")
            self.assertNotEqual(before, mse_content.visual_source_hash(project, card))

    def test_semantic_hash_changes_for_rules(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            project = self.make_project(Path(directory))
            card = project / "card one"
            before = mse_content.semantic_fingerprint(card)
            card.write_text(card.read_text().replace("Rule 0.", "Rule changed."), encoding="utf-8")
            self.assertNotEqual(before, mse_content.semantic_fingerprint(card))

    def test_timestamp_helper_is_idempotent_for_maintenance(self) -> None:
        before = "card:\n\ttime_modified: 2026-01-02 10:00:00\n\tname: One\n\trule_text: Rule\n\tcard_code_text: 1\n"
        after = before.replace("2026-01-02 10:00:00", "2026-04-01 10:00:00").replace("card_code_text: 1", "card_code_text: 2")
        self.assertEqual(mse_content.update_time_modified_if_semantic_changed(before, after), before.replace("card_code_text: 1", "card_code_text: 2"))

    def test_timestamp_helper_advances_for_semantic_change(self) -> None:
        before = "card:\n\ttime_modified: 2026-01-02 10:00:00\n\tname: One\n\trule_text: Rule\n"
        after = before.replace("Rule", "Changed")
        updated = mse_content.update_time_modified_if_semantic_changed(before, after, now=datetime(2026, 5, 6, 7, 8, 9))
        self.assertIn("time_modified: 2026-05-06 07:08:09", updated)
        self.assertIn("rule_text: Changed", updated)
        self.assertIn("name: One", updated)

    def test_live_necroz_manifest_has_19_cards(self) -> None:
        cards = mse_content.load_manifest(ROOT / "cards_mse/00_drafts/12_nekroz/12_YGO_Necroz.mse-set")
        self.assertEqual(len(cards), 19)
        self.assertEqual(cards[14].name, "Nekroz - Trishula")


if __name__ == "__main__":
    unittest.main()

from __future__ import annotations

import hashlib
import re
import sys
import unittest
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
MSE_PROJECTS = REPO_ROOT / "cards_mse" / "00_drafts"
ORIGINAL_CARDS = REPO_ROOT / "original_cards"
ORIGINAL_IMAGES = REPO_ROOT / "original_images"
sys.path.insert(0, str(REPO_ROOT / ".script"))

from original_image_assets import card_filename, card_type_folder, original_image_path


class OriginalImageAssetTests(unittest.TestCase):
    def test_original_art_is_centralized_outside_mse_projects(self) -> None:
        self.assertTrue(ORIGINAL_IMAGES.is_dir())
        for project in MSE_PROJECTS.glob("*/*.mse-set"):
            with self.subTest(project=project.name):
                self.assertFalse((project / "original_images").exists())
                self.assertFalse((project / "images").exists())

    def test_library_has_no_duplicate_source_files(self) -> None:
        files = sorted(path for path in ORIGINAL_IMAGES.rglob("*") if path.is_file())
        self.assertTrue(files)
        hashes = [hashlib.sha256(path.read_bytes()).hexdigest() for path in files]
        self.assertEqual(len(hashes), len(set(hashes)))
        for path in files:
            with self.subTest(path=path):
                self.assertEqual(path.parent.parent, ORIGINAL_IMAGES)
                self.assertEqual(path.suffix.lower(), ".jpg")

    def test_library_is_grouped_by_card_type_and_official_name(self) -> None:
        self.assertTrue(
            (ORIGINAL_IMAGES / "Xyz" / "Beatrice, Lady of the Eternal.jpg").is_file()
        )
        self.assertTrue(
            (ORIGINAL_IMAGES / "Effect Monster" / "D.D. Crow.jpg").is_file()
        )
        self.assertTrue(
            (ORIGINAL_IMAGES / "Spell" / "Preparation of Rites.jpg").is_file()
        )
        self.assertTrue(
            (ORIGINAL_IMAGES / "Fusion" / "El Shaddoll Winda - variant 2.jpg").is_file()
        )

    def test_original_card_records_use_official_name_filenames(self) -> None:
        records = sorted(ORIGINAL_CARDS.rglob("*.md"))
        self.assertTrue(records)
        for path in records:
            with self.subTest(path=path):
                heading = re.search(
                    r"(?m)^# (.+)$", path.read_text(encoding="utf-8-sig")
                )
                self.assertIsNotNone(heading)
                self.assertEqual(path.parent.parent, ORIGINAL_CARDS)
                self.assertEqual(path.name, card_filename(heading.group(1), ".md"))

    def test_path_helper_uses_api_card_type_metadata(self) -> None:
        card = {"name": "D.D. Crow", "type": "Effect Monster"}
        self.assertEqual(card_type_folder(card), "Effect Monster")
        self.assertEqual(
            original_image_path(card),
            ORIGINAL_IMAGES / "Effect Monster" / "D.D. Crow.jpg",
        )
        self.assertEqual(
            original_image_path({"name": "Number 39: Utopia", "type": "XYZ Monster"}),
            ORIGINAL_IMAGES / "Xyz" / "Number 39 - Utopia.jpg",
        )
        self.assertEqual(card_filename('Maxx "C"', ".md"), "Maxx 'C'.md")

    def test_mse_cards_only_reference_project_local_images(self) -> None:
        for project in MSE_PROJECTS.glob("*/*.mse-set"):
            for card_file in project.glob("card *"):
                text = card_file.read_text(encoding="utf-8-sig", errors="replace")
                match = re.search(r"(?m)^\s*image:\s*(.*?)\s*$", text)
                if not match or not match.group(1):
                    continue
                image_value = match.group(1)
                with self.subTest(card=card_file):
                    self.assertFalse(image_value.startswith("assets/"))
                    self.assertFalse(image_value.startswith("images/"))
                    self.assertNotIn("original_images/", image_value)
                    self.assertTrue((project / image_value).is_file())


if __name__ == "__main__":
    unittest.main()

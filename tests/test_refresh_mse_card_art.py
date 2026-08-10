from __future__ import annotations

import hashlib
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

from PIL import Image


REPO_ROOT = Path(__file__).resolve().parents[1]
SCRIPT_DIR = REPO_ROOT / ".script"
sys.path.insert(0, str(SCRIPT_DIR))

import refresh_mse_card_art as refresh  # noqa: E402


class RefreshMseCardArtTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp_dir = tempfile.TemporaryDirectory()
        self.root = Path(self.temp_dir.name)
        self.project = self.root / "01_YGO_Test.mse-set"
        self.project.mkdir()
        (self.project / "mse_images").mkdir()
        self.hd_root = self.root / "original_images_hd"

    def tearDown(self) -> None:
        self.temp_dir.cleanup()

    def write_card(self, name: str = "Test Card", image: str = "mse_images/test.png") -> Path:
        card = self.project / "card test"
        card.write_text(f"\tname: {name}\n\timage: {image}\n", encoding="utf-8")
        (self.project / "set").write_text("include_file: card test\n", encoding="utf-8")
        return card

    def write_png(self, path: Path, size: tuple[int, int], color: str = "red") -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        Image.new("RGB", size, color).save(path, "PNG")

    def test_target_size_multiplies_current_dimensions(self) -> None:
        image = self.project / "mse_images/test.png"
        self.write_png(image, (316, 231))
        self.assertEqual(refresh.target_size(image, factor=4), (1264, 924))

    def test_source_for_resolves_cube_name_aliases(self) -> None:
        xyz = self.hd_root / "Xyz/Divine Arsenal AA-ZEUS - Sky Thunder.jpg"
        ritual = self.hd_root / "Ritual/Nekroz of Brionac.jpg"
        self.write_png(xyz, (1248, 1248))
        self.write_png(ritual, (1248, 1248))

        with mock.patch.object(refresh, "HD_IMAGES_ROOT", self.hd_root):
            self.assertEqual(refresh.source_for("AA-ZEUS - Sky Thunder"), xyz)
            self.assertEqual(refresh.source_for("Nekroz - Brionac"), ritual)

    def test_refresh_replaces_pixels_and_keeps_the_path(self) -> None:
        card = self.write_card()
        image = self.project / "mse_images/test.png"
        self.write_png(image, (316, 231), "red")
        source = self.hd_root / "Effect Monster/Test Card.jpg"
        self.write_png(source, (1248, 1248), "blue")
        before = card.read_bytes()

        with mock.patch.object(refresh, "HD_IMAGES_ROOT", self.hd_root):
            result = refresh.refresh_project(self.project)

        self.assertEqual(result["updated"], ["Test Card"])
        with Image.open(image) as refreshed:
            self.assertEqual(refreshed.size, (1264, 924))
        self.assertEqual(card.read_bytes(), before)
        self.assertEqual("mse_images/test.png", refresh.load_manifest(self.project)[0].image_path.relative_to(self.project).as_posix())

    def test_refresh_skips_cards_without_hd_source(self) -> None:
        self.write_card()
        image = self.project / "mse_images/test.png"
        self.write_png(image, (316, 231), "red")
        before = hashlib.sha256(image.read_bytes()).hexdigest()

        with mock.patch.object(refresh, "HD_IMAGES_ROOT", self.hd_root):
            result = refresh.refresh_project(self.project)

        self.assertEqual(result["skipped_no_hd"], ["Test Card"])
        self.assertEqual(hashlib.sha256(image.read_bytes()).hexdigest(), before)

    def test_refresh_skips_empty_image_fields(self) -> None:
        self.write_card(image="")
        with mock.patch.object(refresh, "HD_IMAGES_ROOT", self.hd_root):
            result = refresh.refresh_project(self.project)
        self.assertEqual(result["skipped_no_image"], ["Test Card"])

    def test_refresh_refuses_a_locked_package(self) -> None:
        package = self.root / "LOTA-0001-Alpha_0.1"
        package.mkdir()
        self.project = package / "01_YGO_Test.mse-set"
        self.project.mkdir()
        (self.project / "mse_images").mkdir()
        self.write_card()
        self.write_png(self.project / "mse_images/test.png", (316, 231))
        (package / "release.json").write_text(json.dumps({"status": "locked"}), encoding="utf-8")

        with self.assertRaisesRegex(ValueError, "locked"):
            refresh.refresh_project(self.project)

    def test_cli_prints_one_line(self) -> None:
        self.write_card(name="No Such HD Test Card")
        self.write_png(self.project / "mse_images/test.png", (316, 231))
        result = subprocess.run(
            [sys.executable, str(SCRIPT_DIR / "refresh_mse_card_art.py"), str(self.project), "--dry-run"],
            cwd=REPO_ROOT,
            check=True,
            capture_output=True,
            text=True,
        )
        self.assertRegex(result.stdout, r"^mse\.art .+: \d+ updated, \d+ no-HD, \d+ no-image\n$")
        self.assertEqual(result.stderr, "")


if __name__ == "__main__":
    unittest.main()

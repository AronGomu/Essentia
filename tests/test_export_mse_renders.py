from __future__ import annotations

import hashlib
import importlib.util
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
MODULE_PATH = ROOT / ".script" / "export_mse_renders.py"
sys.path.insert(0, str(MODULE_PATH.parent))
SPEC = importlib.util.spec_from_file_location("export_mse_renders", MODULE_PATH)
assert SPEC is not None and SPEC.loader is not None
export_mse_renders = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(export_mse_renders)


class WhiteCornerTransparencyTests(unittest.TestCase):
    def test_colon_in_card_name_is_sanitized_for_portable_render(self) -> None:
        export_mse_renders.validate_export_name("I:P Masquerena")
        self.assertEqual(
            export_mse_renders.render_filename("I:P Masquerena"),
            "I -P Masquerena.png",
        )

    def test_path_separators_in_card_name_remain_rejected(self) -> None:
        for name in ("folder/card", r"folder\\card"):
            with self.subTest(name=name), self.assertRaises(export_mse_renders.MSESourceError):
                export_mse_renders.validate_export_name(name)

    def make_project(self, root: Path) -> Path:
        project = root / "demo.mse-set"
        project.mkdir()
        (project / "set").write_text(
            "mse_version: 2.0.2\ngame: magic\nstylesheet: sevenhalf\n"
            "include_file: card one\n",
            encoding="utf-8",
        )
        Image.new("RGB", (4, 4), "black").save(project / "art.png")
        (project / "card one").write_text(
            "card:\n\ttime_created: 2026-01-01 10:00:00\n"
            "\ttime_modified: 2026-01-02 10:00:00\n"
            "\tname: Card One\n\timage: art.png\n\trule_text: Rule.\n",
            encoding="utf-8",
        )
        return project

    @staticmethod
    def make_opaque_render(path: Path) -> None:
        image = Image.new("RGB", (20, 28), "white")
        ImageDraw.Draw(image).rounded_rectangle((0, 0, 19, 27), radius=4, fill="black")
        image.save(path)

    @staticmethod
    def make_config(root: Path) -> export_mse_renders.MSEConfig:
        return export_mse_renders.MSEConfig(
            root=root,
            executable=root / "mse.exe",
            cli=root / "mse-cli.exe",
            data_dir=root / "data",
            fonts_dir=root / "fonts",
            projects_dir=root,
        )

    def test_only_corner_connected_white_becomes_transparent(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "card.png"
            image = Image.new("RGB", (20, 28), "white")
            draw = ImageDraw.Draw(image)
            draw.rounded_rectangle((0, 0, 19, 27), radius=4, fill="black")
            draw.rectangle((3, 3, 16, 24), fill="white")
            image.save(path)

            export_mse_renders.make_white_corners_transparent(path)

            with Image.open(path) as rendered:
                self.assertEqual(rendered.mode, "RGBA")
                alpha = rendered.getchannel("A")
                self.assertEqual(alpha.getpixel((0, 0)), 0)
                self.assertEqual(alpha.getpixel((19, 27)), 0)
                self.assertEqual(alpha.getpixel((10, 0)), 255)
                self.assertEqual(alpha.getpixel((10, 27)), 255)
                self.assertEqual(alpha.getpixel((1, 4)), 255)
                self.assertEqual(alpha.getpixel((10, 14)), 255)

    def test_existing_transparency_is_preserved(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "card.png"
            image = Image.new("RGBA", (8, 8), "white")
            image.putpixel((4, 4), (10, 20, 30, 64))
            image.save(path)

            export_mse_renders.make_white_corners_transparent(path)

            with Image.open(path) as rendered:
                self.assertEqual(rendered.getpixel((0, 0))[3], 0)
                self.assertEqual(rendered.getpixel((4, 4)), (10, 20, 30, 64))

    def test_near_white_opaque_corner_is_rejected(self) -> None:
        corners = ((0, 0), (7, 0), (0, 7), (7, 7))
        for corner in corners:
            with self.subTest(corner=corner), tempfile.TemporaryDirectory() as directory:
                path = Path(directory) / "card.png"
                image = Image.new("RGB", (8, 8), "white")
                image.putpixel(corner, (254, 254, 254))
                image.save(path)

                with self.assertRaisesRegex(
                    export_mse_renders.MSESourceError,
                    "opaque non-white corner",
                ):
                    export_mse_renders.make_white_corners_transparent(path)

    def test_export_applies_transparency_and_records_transform(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            project = self.make_project(root)
            output = root / "renders"
            config = self.make_config(root)

            def fake_run(command: list[str], **_: object) -> subprocess.CompletedProcess[str]:
                pattern = command[3]
                exported = Path(pattern.replace("{card.name}", "Card One"))
                self.make_opaque_render(exported)
                return subprocess.CompletedProcess(command, 0, "", "")

            with patch.object(export_mse_renders.subprocess, "run", side_effect=fake_run):
                provenance = export_mse_renders.export(project, output, config)

            with Image.open(output / "Card One.png") as rendered:
                self.assertEqual(rendered.mode, "RGBA")
                self.assertEqual(rendered.getpixel((0, 0))[3], 0)
                self.assertEqual(rendered.getpixel((10, 14))[3], 255)
            self.assertEqual(provenance["schemaVersion"], 2)
            self.assertEqual(
                provenance["renderTransform"],
                {"id": "transparent-white-corners", "version": 1},
            )

    def test_export_rejection_preserves_existing_output(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            project = self.make_project(root)
            output = root / "renders"
            output.mkdir()
            marker = output / "existing.txt"
            marker.write_text("keep", encoding="utf-8")

            def fake_run(command: list[str], **_: object) -> subprocess.CompletedProcess[str]:
                exported = Path(command[3].replace("{card.name}", "Card One"))
                Image.new("RGB", (20, 28), (254, 254, 254)).save(exported)
                return subprocess.CompletedProcess(command, 0, "", "")

            with patch.object(export_mse_renders.subprocess, "run", side_effect=fake_run):
                with self.assertRaisesRegex(
                    export_mse_renders.MSESourceError,
                    "opaque non-white corner",
                ):
                    export_mse_renders.export(
                        project,
                        output,
                        self.make_config(root),
                    )

            self.assertEqual(marker.read_text(encoding="utf-8"), "keep")

    def test_pixel_hash_matches_full_rgba_bytes_across_chunks(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "tall.png"
            image = Image.new("RGBA", (4, 130), (10, 20, 30, 255))
            image.putpixel((2, 100), (40, 50, 60, 128))
            image.save(path)
            expected = hashlib.sha256()
            expected.update(b"4x130:RGBA\n")
            expected.update(image.tobytes())

            original = export_mse_renders.pixel_hash(path)

            self.assertEqual(original, expected.hexdigest())
            image.putpixel((2, 100), (41, 50, 60, 128))
            image.save(path)
            self.assertNotEqual(export_mse_renders.pixel_hash(path), original)

    def test_current_provenance_detects_transform_and_render_changes(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            project = self.make_project(Path(directory))
            render_dir = project / "render"
            render_dir.mkdir()
            render = render_dir / "Card One.png"
            self.make_opaque_render(render)
            export_mse_renders.make_white_corners_transparent(render)
            card = export_mse_renders.load_manifest(project)[0]
            provenance = {
                "schemaVersion": 2,
                "project": project.name,
                "renderTransform": {
                    "id": "transparent-white-corners",
                    "version": 1,
                },
                "cards": [
                    {
                        "id": card.source_name,
                        "sourceHash": export_mse_renders.visual_source_hash(
                            project, card
                        ),
                        "renderHash": export_mse_renders.sha256_file(render),
                        "renderPixelHash": export_mse_renders.pixel_hash(render),
                    }
                ],
            }
            provenance_path = project / "render-provenance.json"
            provenance_path.write_text(json.dumps(provenance), encoding="utf-8")

            _, rows = export_mse_renders.inspect_project(project)
            self.assertFalse(rows[0]["stale"])

            provenance["renderTransform"]["version"] = 2
            provenance_path.write_text(json.dumps(provenance), encoding="utf-8")
            _, rows = export_mse_renders.inspect_project(project)
            self.assertTrue(rows[0]["stale"])

            provenance["renderTransform"]["version"] = 1
            provenance_path.write_text(json.dumps(provenance), encoding="utf-8")
            with Image.open(render) as image:
                changed = image.copy()
            changed.putpixel((10, 14), (1, 2, 3, 255))
            changed.save(render)
            _, rows = export_mse_renders.inspect_project(project)
            self.assertTrue(rows[0]["stale"])

    def test_legacy_provenance_marks_opaque_render_stale(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            project = self.make_project(Path(directory))
            render_dir = project / "render"
            render_dir.mkdir()
            self.make_opaque_render(render_dir / "Card One.png")
            card = export_mse_renders.load_manifest(project)[0]
            (project / "render-provenance.json").write_text(
                json.dumps(
                    {
                        "schemaVersion": 1,
                        "cards": [
                            {
                                "id": card.source_name,
                                "sourceHash": export_mse_renders.visual_source_hash(
                                    project, card
                                ),
                            }
                        ],
                    }
                ),
                encoding="utf-8",
            )

            _, rows = export_mse_renders.inspect_project(project)

            self.assertTrue(rows[0]["stale"])


if __name__ == "__main__":
    unittest.main()

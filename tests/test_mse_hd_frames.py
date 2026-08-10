"""Tests for reproducible staged HD frame installation."""

from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

from PIL import Image

from launcher.mse_hd_frames import (
    CAPENNA_PACK,
    HD_PACKS,
    _resize_capenna,
    install_hd_frames,
    validate_hd_inputs,
)
from launcher.mse_vendor import (
    Manifest,
    VendorError,
    install_tree,
    sha256_file,
    verify_tree,
)


class HDFrameInstallerTests(unittest.TestCase):
    def fixture(self, root: Path) -> tuple[Path, Path, Manifest]:
        source = root / "source"
        vendor = root / "MSE"
        staging = root / "frames"
        source_entries: dict[str, str] = {}
        final_entries: dict[str, str] = {}
        inputs: dict[str, str] = {}

        style = "card width: 375\ncard height: 523\n\tleft: 10\n"
        for index, pack in enumerate(HD_PACKS):
            relative = f"data/{pack}/style"
            path = source / relative
            path.parent.mkdir(parents=True)
            path.write_text(style, encoding="utf-8")
            source_entries[relative] = sha256_file(path)
            final_entries[relative] = str(index) * 64

            staged_relative = f"{pack}/frame.png"
            staged = staging / staged_relative
            staged.parent.mkdir(parents=True)
            Image.new("RGB", (20, 40), (index, 0, 0)).save(staged)
            inputs[staged_relative] = sha256_file(staged)
            final_entries[f"data/{staged_relative}"] = inputs[staged_relative]

        capenna_image = f"data/{CAPENNA_PACK}/frame.png"
        image_path = source / capenna_image
        image_path.parent.mkdir(parents=True)
        Image.new("RGB", (744, 1039), "blue").save(image_path)
        source_entries[capenna_image] = sha256_file(image_path)
        final_entries[capenna_image] = "a" * 64

        capenna_style = f"data/{CAPENNA_PACK}/style"
        style_path = source / capenna_style
        style_path.write_text(
            "card width:\t\t\t744\ncard height:\t\t1039\n\tleft: 100\n",
            encoding="utf-8",
        )
        source_entries[capenna_style] = sha256_file(style_path)
        final_entries[capenna_style] = "b" * 64

        manifest = Manifest(
            source={"name": "fixture"},
            entries=final_entries,
            source_entries=source_entries,
            hd_frames={"packs": list(HD_PACKS), "inputs": inputs},
        )
        return source, vendor, manifest

    def test_overlay_only_files_and_transforms_are_idempotent(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            source, vendor, manifest = self.fixture(Path(temporary))
            self.assertEqual(len(install_tree(source, vendor, manifest)), 6)
            self.assertIn(
                f"missing: data/{HD_PACKS[0]}/frame.png",
                verify_tree(vendor, manifest),
            )

            first = install_hd_frames(Path(temporary) / "frames", vendor, manifest)
            self.assertTrue(first)
            with Image.open(vendor / "data" / CAPENNA_PACK / "frame.png") as image:
                self.assertEqual(image.size, (750, 1046))
            for pack in HD_PACKS:
                text = (vendor / "data" / pack / "style").read_text(encoding="utf-8")
                self.assertIn("card width: 750", text)
                self.assertIn("card height: 1046", text)
                self.assertTrue((vendor / "data" / pack / "frame.png").is_file())

            final = {
                relative: sha256_file(vendor / relative)
                for relative in manifest.entries
            }
            complete = Manifest(
                source=manifest.source,
                entries=final,
                source_entries=manifest.source_entries,
                hd_frames=manifest.hd_frames,
            )
            self.assertEqual(verify_tree(vendor, complete), [])
            self.assertEqual(
                install_hd_frames(Path(temporary) / "frames", vendor, complete),
                [],
            )
            self.assertEqual(verify_tree(vendor, complete), [])

    def test_capenna_resize_rounds_then_crops_bottom_row(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            path = Path(temporary) / "capenna.png"
            source = Image.new("RGB", (744, 1039), "blue")
            source.putpixel((0, 1038), (255, 0, 0))
            source.save(path)
            expected = source.resize(
                (750, 1047), Image.Resampling.LANCZOS
            ).crop((0, 0, 750, 1046))

            _resize_capenna(path)

            with Image.open(path) as actual:
                self.assertEqual(actual.size, (750, 1046))
                self.assertEqual(actual.tobytes(), expected.tobytes())

    def test_rejects_non_allowlisted_pack(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            _, _, manifest = self.fixture(Path(temporary))
            hostile = Path(temporary) / "frames" / "..-escape.mse-style"
            hostile.mkdir()
            (hostile / "file.png").write_bytes(b"not an image")
            with self.assertRaisesRegex(VendorError, "four allowlisted"):
                validate_hd_inputs(Path(temporary) / "frames", manifest)

    def test_rejects_changed_staged_input(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            _, _, manifest = self.fixture(Path(temporary))
            target = Path(temporary) / "frames" / HD_PACKS[0] / "frame.png"
            Image.new("RGB", (20, 40), "white").save(target)
            with self.assertRaisesRegex(VendorError, "changed"):
                validate_hd_inputs(Path(temporary) / "frames", manifest)


if __name__ == "__main__":
    unittest.main()

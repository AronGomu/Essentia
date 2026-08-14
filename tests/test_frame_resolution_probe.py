"""Unit tests for the frame resolution probe."""

from __future__ import annotations

import importlib.util
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location(
    "frame_resolution_probe", ROOT / ".script" / "frame_resolution_probe.py"
)
assert SPEC and SPEC.loader
probe_module = importlib.util.module_from_spec(SPEC)
sys.modules["frame_resolution_probe"] = probe_module
SPEC.loader.exec_module(probe_module)


def checkerboard(size: int = 200, cell: int = 10) -> Image.Image:
    image = Image.new("L", (size, size), 0)
    draw = ImageDraw.Draw(image)
    for y in range(0, size, cell):
        for x in range(0, size, cell):
            if ((x // cell) + (y // cell)) % 2 == 0:
                draw.rectangle((x, y, x + cell - 1, y + cell - 1), fill=255)
    return image


class EdgeEnergyTests(unittest.TestCase):
    def test_edge_energy_ranks_sharp_above_blurred(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            directory = Path(temporary)
            sharp_path = directory / "sharp.png"
            blurred_path = directory / "blurred.png"
            sharp = checkerboard()
            sharp.save(sharp_path)
            sharp.filter(ImageFilter.GaussianBlur(3)).save(blurred_path)

            box = (0, 0, 200, 200)
            sharp_energy = probe_module.edge_energy(sharp_path, box)
            blurred_energy = probe_module.edge_energy(blurred_path, box)

        self.assertGreater(sharp_energy, blurred_energy * 1.5)

    def test_edge_energy_is_crop_scoped(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            path = Path(temporary) / "top-strip.png"
            image = Image.new("L", (200, 200), 0)
            image.paste(checkerboard(size=40, cell=4).resize((200, 40)), (0, 0))
            image.save(path)

            top = probe_module.edge_energy(path, (0, 0, 200, 20))
            bottom = probe_module.edge_energy(path, (0, 180, 200, 200))

        self.assertGreater(top, bottom)


class PackPathSafetyTests(unittest.TestCase):
    def test_api_rejects_absolute_pack_without_external_mutation(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            external = Path(temporary) / "external"
            external.mkdir()
            marker = external / "keep"
            marker.write_text("safe", encoding="utf-8")
            with self.assertRaisesRegex(RuntimeError, "unsupported frame pack"):
                probe_module.probe(str(external), "Burning Abyss - Graff")
            self.assertEqual(marker.read_text(encoding="utf-8"), "safe")

    def test_api_rejects_parent_traversal_without_external_mutation(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            marker = Path(temporary) / "keep"
            marker.write_text("safe", encoding="utf-8")
            with self.assertRaisesRegex(RuntimeError, "unsupported frame pack"):
                probe_module.probe("../outside", "Burning Abyss - Graff")
            self.assertEqual(marker.read_text(encoding="utf-8"), "safe")

    def test_cli_rejects_non_allowlisted_pack_before_probe(self) -> None:
        with mock.patch.object(sys, "argv", ["probe", "--pack", "../outside", "--card", "x"]), mock.patch.object(
            probe_module, "probe"
        ) as probe:
            with self.assertRaises(SystemExit) as raised:
                probe_module.main()
        self.assertEqual(raised.exception.code, 2)
        probe.assert_not_called()


class DirtyTreeGuardTests(unittest.TestCase):
    def test_probe_refuses_a_dirty_vendored_tree(self) -> None:
        completed = subprocess.CompletedProcess(
            args=["git", "status", "--porcelain", "MSE/manifest.json"],
            returncode=0,
            stdout=" M MSE/manifest.json\n",
            stderr="",
        )
        with mock.patch.object(
            probe_module, "validated_pack_path", return_value=Path("frame-pack")
        ), mock.patch.object(
            probe_module.subprocess, "run", return_value=completed
        ) as run:
            with self.assertRaises(RuntimeError) as raised:
                probe_module.probe("magic-sevenhalf.mse-style", "Burning Abyss - Graff")
        self.assertIn("MSE/manifest.json", str(raised.exception))
        run.assert_called_once()


class ExportIsolationTests(unittest.TestCase):
    def test_export_uses_temporary_home_and_data_tree(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            directory = Path(temporary)
            set_dir = directory / "card.mse-set"
            set_dir.mkdir()
            data_dir = directory / "data"
            data_dir.mkdir()
            workdir = directory / "work"

            def fake_export(*args, **kwargs):
                Image.new("RGB", (1500, 2092), "black").save(
                    workdir / "out" / "master.png"
                )
                return subprocess.CompletedProcess(args=args[0], returncode=0, stdout="", stderr="")

            with mock.patch.object(
                probe_module.subprocess, "run", side_effect=fake_export
            ) as run:
                master = probe_module.export_print_master(set_dir, data_dir, workdir)

            child_env = run.call_args.kwargs["env"]
            self.assertEqual(child_env["HOME"], str(workdir / "home"))
            self.assertEqual(
                (workdir / "home" / ".magicseteditor" / "data").resolve(),
                data_dir.resolve(),
            )
            self.assertEqual(master, workdir / "out" / "master.png")


class UpscalePackTests(unittest.TestCase):
    def test_upscale_pack_doubles_every_image(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            directory = Path(temporary)
            source = directory / "pack.mse-style"
            source.mkdir()
            Image.new("RGB", (10, 20), "red").save(source / "bcard.jpg")
            Image.new("RGBA", (81, 42), (0, 0, 0, 0)).save(source / "bpt.png")
            (source / "style").write_text("card width: 375\n", encoding="utf-8")

            destination = directory / "upscaled.mse-style"
            probe_module.upscale_pack(source, destination)

            self.assertEqual(
                sorted(path.name for path in destination.iterdir()),
                ["bcard.jpg", "bpt.png", "style"],
            )
            with Image.open(destination / "bcard.jpg") as card:
                self.assertEqual(card.size, (20, 40))
                self.assertEqual(card.format, "JPEG")
            with Image.open(destination / "bpt.png") as pt:
                self.assertEqual(pt.size, (162, 84))
                self.assertEqual(pt.format, "PNG")
            self.assertEqual(
                (destination / "style").read_text(encoding="utf-8"), "card width: 375\n"
            )


if __name__ == "__main__":
    unittest.main()

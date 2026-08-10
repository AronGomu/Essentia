from __future__ import annotations

import importlib.util
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
MODULE_PATH = ROOT / ".script" / "verify_hd_inputs.py"
sys.path.insert(0, str(MODULE_PATH.parent))
SPEC = importlib.util.spec_from_file_location("verify_hd_inputs", MODULE_PATH)
assert SPEC is not None and SPEC.loader is not None
verify_hd_inputs = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(verify_hd_inputs)


class FrameReportTests(unittest.TestCase):
    def test_frame_report_counts_double_size_images(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            staging = root / "staging"
            vendored = root / "vendored"
            pack = "magic-sevenhalf.mse-style"
            (staging / pack).mkdir(parents=True)
            (vendored / pack).mkdir(parents=True)
            Image.new("RGB", (10, 20)).save(vendored / pack / "a.png")
            Image.new("RGB", (20, 40)).save(staging / pack / "a.png")

            result = verify_hd_inputs.frame_report(pack, staging, vendored)

            self.assertEqual(
                result,
                {"pack": pack, "present": True, "files": 1, "double": 1, "wrong_size": []},
            )

    def test_frame_report_flags_wrong_size(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            staging = root / "staging"
            vendored = root / "vendored"
            pack = "magic-sevenhalf.mse-style"
            (staging / pack).mkdir(parents=True)
            (vendored / pack).mkdir(parents=True)
            Image.new("RGB", (10, 20)).save(vendored / pack / "a.png")
            Image.new("RGB", (15, 30)).save(staging / pack / "a.png")

            result = verify_hd_inputs.frame_report(pack, staging, vendored)

            self.assertEqual(result["wrong_size"], ["a.png"])
            self.assertEqual(result["double"], 0)

    def test_frame_report_absent_pack(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            staging = root / "staging"
            vendored = root / "vendored"
            staging.mkdir()
            vendored.mkdir()
            pack = "magic-sevenhalf.mse-style"

            result = verify_hd_inputs.frame_report(pack, staging, vendored)

            self.assertEqual(
                result,
                {"pack": pack, "present": False, "files": 0, "double": 0, "wrong_size": []},
            )


class ArtReportTests(unittest.TestCase):
    def test_art_report_lists_missing(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            sd_root = root / "sd"
            hd_root = root / "hd"
            sd_root.mkdir()
            hd_root.mkdir()
            for name in ("a.jpg", "b.jpg", "c.jpg"):
                (sd_root / name).write_bytes(b"x")
            (hd_root / "a.jpg").write_bytes(b"x")

            result = verify_hd_inputs.art_report(sd_root, hd_root)

            self.assertEqual(result["sd"], 3)
            self.assertEqual(result["hd"], 1)
            self.assertEqual(result["missing"], 2)
            self.assertEqual(result["sample"], ["b.jpg", "c.jpg"])


class MainTests(unittest.TestCase):
    def test_main_prints_one_line_per_pack(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            staging = root / "staging"
            vendored = root / "vendored"
            sd_root = root / "sd"
            hd_root = root / "hd"
            staging.mkdir()
            vendored.mkdir()
            sd_root.mkdir()
            hd_root.mkdir()

            with patch.object(verify_hd_inputs, "STAGING", staging), patch.object(
                verify_hd_inputs, "VENDORED", vendored
            ), patch.object(verify_hd_inputs, "ORIGINAL_IMAGES_ROOT", sd_root), patch.object(
                verify_hd_inputs, "ORIGINAL_IMAGES_HD_ROOT", hd_root
            ), patch("sys.stdout") as mock_stdout:
                exit_code = verify_hd_inputs.main()

            self.assertEqual(exit_code, 0)
            printed = "".join(
                call.args[0] for call in mock_stdout.write.call_args_list
            )
            lines = [line for line in printed.split("\n") if line]
            self.assertEqual(len(lines), 5)
            for line in lines:
                self.assertNotIn("\n", line)


if __name__ == "__main__":
    unittest.main()

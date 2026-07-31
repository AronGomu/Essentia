from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

from launcher.mse_config import MSEConfig, load_env_file, write_env_file
from launcher.setup_mse import configure, find_required_assets, validate_mse_root


class EnvFileTests(unittest.TestCase):
    def test_round_trip_paths_with_spaces_and_backslashes(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            env_path = Path(temporary_directory) / ".env"
            values = {
                "MSE_ROOT": r"C:\Program Files\Magic Set Editor",
                "MSE_EXECUTABLE": r"C:\Program Files\Magic Set Editor\mse.exe",
            }

            write_env_file(env_path, values)

            self.assertEqual(load_env_file(env_path), values)

    def test_config_requires_all_paths(self) -> None:
        with self.assertRaisesRegex(RuntimeError, "setup_mse.py"):
            MSEConfig.from_values({})


class MSEValidationTests(unittest.TestCase):
    def test_discovers_assets_referenced_by_project_files(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            projects = Path(temporary_directory)
            project = projects / "demo.mse-set"
            project.mkdir()
            (project / "set").write_text(
                "game: magic\nstylesheet: sevenhalf\n"
                "styling:\n\tmagic-m15:\n"
                "\t\ttext_box_mana_symbols: magic-mana-small.mse-symbol-font\n",
                encoding="utf-8",
            )
            (project / "card demo").write_text(
                "card:\n\tstylesheet: m15-sketch\n", encoding="utf-8"
            )

            assets = find_required_assets(projects)

            self.assertEqual(assets.games, {"magic"})
            self.assertEqual(assets.styles, {"magic-sevenhalf.mse-style", "magic-m15-sketch.mse-style"})
            self.assertEqual(assets.symbol_fonts, {"magic-mana-small.mse-symbol-font"})

    def test_validates_a_complete_installation(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            root = Path(temporary_directory) / "Magic Set Editor"
            data = root / "data"
            fonts = root / "Magic-Fonts"
            projects = Path(temporary_directory) / "projects"
            project = projects / "demo.mse-set"
            data.mkdir(parents=True)
            fonts.mkdir()
            project.mkdir(parents=True)
            (root / "mse.exe").touch()
            (project / "set").write_text(
                "game: magic\nstylesheet: sevenhalf\n", encoding="utf-8"
            )
            (data / "magic.mse-game").mkdir()
            (data / "magic-sevenhalf.mse-style").mkdir()
            for font_name in (
                "beleren-bold_P1.01.ttf",
                "belerensmallcaps-bold.ttf",
                "MATRIX.TTF",
                "matrixb.ttf",
                "matrixbsc.ttf",
                "mplantin.ttf",
                "mplantinit.ttf",
            ):
                (fonts / font_name).touch()

            config, errors = validate_mse_root(root, projects)

            self.assertEqual(errors, [])
            self.assertIsNotNone(config)
            assert config is not None
            self.assertEqual(config.executable, root / "mse.exe")
            self.assertEqual(config.projects_dir, projects.resolve())

            env_path = Path(temporary_directory) / ".env"
            configured = configure(root, env_path, projects)
            values = load_env_file(env_path)
            self.assertEqual(values["MSE_EXECUTABLE"], str(configured.executable))
            self.assertEqual(values["MSE_DATA_DIR"], str(configured.data_dir))
            self.assertEqual(values["MSE_FONTS_DIR"], str(configured.fonts_dir))
            self.assertEqual(values["MSE_PROJECTS_DIR"], str(projects.resolve()))

    def test_reports_all_missing_assets(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            root = Path(temporary_directory) / "incomplete"
            projects = Path(temporary_directory) / "projects"
            project = projects / "demo.mse-set"
            root.mkdir()
            project.mkdir(parents=True)
            (project / "set").write_text(
                "game: magic\nstylesheet: sevenhalf\n", encoding="utf-8"
            )

            config, errors = validate_mse_root(root, projects)

            self.assertIsNone(config)
            self.assertGreaterEqual(len(errors), 3)
            self.assertTrue(any("executable" in error.lower() for error in errors))
            self.assertTrue(any("data" in error.lower() for error in errors))
            self.assertTrue(any("font" in error.lower() for error in errors))


if __name__ == "__main__":
    unittest.main()

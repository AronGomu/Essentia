from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

from launcher.mse_config import MSEConfig, load_env_file, vendored_values, write_env_file
from launcher.mse_vendor import (
    BIN_DIR,
    DATA_DIR,
    EXECUTABLE_NAME,
    FONT_DIR,
    FONT_FILES,
    MANIFEST_VERSION,
    Manifest,
    VendorError,
    build_manifest,
    install_tree,
    link_user_packages,
    load_manifest,
    verify_tree,
    write_manifest,
)
from launcher.setup_mse import configure, find_required_assets, validate_mse_root


def _vendored_tree(root: Path) -> Path:
    """Build the minimum vendored layout the launcher accepts."""
    (root / BIN_DIR).mkdir(parents=True)
    (root / BIN_DIR / EXECUTABLE_NAME).touch()
    (root / DATA_DIR / "magic.mse-game").mkdir(parents=True)
    (root / DATA_DIR / "magic-sevenhalf.mse-style").mkdir(parents=True)
    (root / FONT_DIR).mkdir()
    for font_name in FONT_FILES:
        (root / FONT_DIR / font_name).touch()
    return root


def _demo_projects(root: Path) -> Path:
    project = root / "demo.mse-set"
    project.mkdir(parents=True)
    (project / "set").write_text("game: magic\nstylesheet: sevenhalf\n", encoding="utf-8")
    return root


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

    def test_vendored_values_describe_the_repository_tree(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            vendor_root = _vendored_tree(Path(temporary_directory) / "MSE")

            values = vendored_values(vendor_root)

            self.assertEqual(values["MSE_ROOT"], str(vendor_root))
            self.assertEqual(
                values["MSE_EXECUTABLE"], str(vendor_root / BIN_DIR / EXECUTABLE_NAME)
            )
            self.assertEqual(values["MSE_DATA_DIR"], str(vendor_root / DATA_DIR))

    def test_vendored_values_are_empty_without_a_populated_tree(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            self.assertEqual(vendored_values(Path(temporary_directory)), {})


class VendorTests(unittest.TestCase):
    def test_install_then_verify_round_trip(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            base = Path(temporary_directory)
            source = base / "Full-Magic-Pack"
            (source / "data" / "magic.mse-game").mkdir(parents=True)
            (source / "data" / "magic.mse-game" / "game").write_text("game", encoding="utf-8")
            (source / "Magic-Fonts").mkdir()
            (source / "Magic-Fonts" / FONT_FILES[0]).write_text("font", encoding="utf-8")
            (source / EXECUTABLE_NAME).write_text("binary", encoding="utf-8")
            relative_paths = [
                f"{BIN_DIR}/{EXECUTABLE_NAME}",
                f"{DATA_DIR}/magic.mse-game/game",
                f"{FONT_DIR}/{FONT_FILES[0]}",
            ]

            manifest = build_manifest(source, relative_paths, {"name": "test"})
            vendor_root = base / "MSE"
            copied = install_tree(source, vendor_root, manifest)

            self.assertEqual(sorted(copied), sorted(relative_paths))
            self.assertEqual(verify_tree(vendor_root, manifest), [])
            # Re-running copies nothing because every hash already matches.
            self.assertEqual(install_tree(source, vendor_root, manifest), [])

    def test_verify_reports_missing_and_modified_files(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            vendor_root = Path(temporary_directory) / "MSE"
            (vendor_root / DATA_DIR).mkdir(parents=True)
            (vendor_root / DATA_DIR / "kept").write_text("changed", encoding="utf-8")
            manifest = Manifest(source={}, entries={f"{DATA_DIR}/kept": "0" * 64, f"{DATA_DIR}/gone": "1" * 64})

            problems = verify_tree(vendor_root, manifest)

            self.assertIn(f"missing: {DATA_DIR}/gone", problems)
            self.assertIn(f"modified: {DATA_DIR}/kept", problems)

    def test_verify_ignores_files_outside_the_manifest(self) -> None:
        """setup installs the repo-owned export template into MSE/data."""
        with tempfile.TemporaryDirectory() as temporary_directory:
            vendor_root = Path(temporary_directory) / "MSE"
            (vendor_root / DATA_DIR).mkdir(parents=True)
            (vendor_root / DATA_DIR / "extra").write_text("extra", encoding="utf-8")

            self.assertEqual(verify_tree(vendor_root, Manifest(source={}, entries={})), [])

    def test_install_rejects_a_source_that_does_not_match(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            base = Path(temporary_directory)
            source = base / "source"
            (source / DATA_DIR).mkdir(parents=True)
            (source / DATA_DIR / "file").write_text("wrong", encoding="utf-8")
            manifest = Manifest(source={}, entries={f"{DATA_DIR}/file": "0" * 64})

            with self.assertRaisesRegex(VendorError, "does not match the manifest"):
                install_tree(source, base / "MSE", manifest)

    def test_manifest_round_trip(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            path = Path(temporary_directory) / "manifest.json"
            manifest = Manifest(source={"name": "test"}, entries={"data/a": "0" * 64})

            write_manifest(manifest, path)
            loaded = load_manifest(path)

            self.assertEqual(loaded.entries, manifest.entries)
            self.assertEqual(loaded.source_entries, manifest.entries)
            self.assertEqual(loaded.source, manifest.source)
            self.assertEqual(json.loads(path.read_text())["manifestVersion"], MANIFEST_VERSION)

    def test_install_uses_source_hashes_then_final_verify_requires_overlay(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            base = Path(temporary_directory)
            source = base / "source"
            vendor = base / "MSE"
            (source / DATA_DIR).mkdir(parents=True)
            source_file = source / DATA_DIR / "base"
            source_file.write_text("source", encoding="utf-8")
            source_hash = build_manifest(
                source, [f"{DATA_DIR}/base"], {"name": "test"}
            ).entries[f"{DATA_DIR}/base"]
            manifest = Manifest(
                source={"name": "test"},
                entries={
                    f"{DATA_DIR}/base": "f" * 64,
                    f"{DATA_DIR}/overlay-only": "e" * 64,
                },
                source_entries={f"{DATA_DIR}/base": source_hash},
                hd_frames={"packs": [], "inputs": {}},
            )

            self.assertEqual(install_tree(source, vendor, manifest), [f"{DATA_DIR}/base"])
            self.assertEqual(
                verify_tree(vendor, manifest),
                [f"modified: {DATA_DIR}/base", f"missing: {DATA_DIR}/overlay-only"],
            )

    def test_link_refuses_to_replace_a_real_directory(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            base = Path(temporary_directory)
            vendor_root = _vendored_tree(base / "MSE")
            (vendor_root / "resource").mkdir()
            config_dir = base / ".magicseteditor"
            (config_dir / DATA_DIR).mkdir(parents=True)

            with self.assertRaisesRegex(VendorError, "real directory"):
                link_user_packages(vendor_root, config_dir)

    def test_link_is_idempotent(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            base = Path(temporary_directory)
            vendor_root = _vendored_tree(base / "MSE")
            (vendor_root / "resource").mkdir()
            config_dir = base / ".magicseteditor"

            self.assertEqual(len(link_user_packages(vendor_root, config_dir)), 2)
            self.assertEqual(link_user_packages(vendor_root, config_dir), [])
            self.assertTrue((config_dir / DATA_DIR).is_dir())


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
            base = Path(temporary_directory)
            root = _vendored_tree(base / "MSE")
            projects = _demo_projects(base / "projects")

            config, errors = validate_mse_root(root, projects)

            self.assertEqual(errors, [])
            self.assertIsNotNone(config)
            assert config is not None
            self.assertEqual(config.executable, root / BIN_DIR / EXECUTABLE_NAME)
            self.assertEqual(config.projects_dir, projects.resolve())

            env_path = base / ".env"
            configured = configure(root, env_path, projects)
            values = load_env_file(env_path)
            self.assertEqual(values["MSE_EXECUTABLE"], str(configured.executable))
            self.assertEqual(values["MSE_DATA_DIR"], str(configured.data_dir))
            self.assertEqual(values["MSE_FONTS_DIR"], str(configured.fonts_dir))
            self.assertEqual(values["MSE_PROJECTS_DIR"], str(projects.resolve()))

    def test_reports_all_missing_assets(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            base = Path(temporary_directory)
            root = base / "incomplete"
            root.mkdir()
            projects = _demo_projects(base / "projects")

            config, errors = validate_mse_root(root, projects)

            self.assertIsNone(config)
            self.assertGreaterEqual(len(errors), 3)
            self.assertTrue(any("executable" in error.lower() for error in errors))
            self.assertTrue(any("data" in error.lower() for error in errors))
            self.assertTrue(any("font" in error.lower() for error in errors))


if __name__ == "__main__":
    unittest.main()

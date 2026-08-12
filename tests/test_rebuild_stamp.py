from __future__ import annotations

import json
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / ".script"))

import release_package as release  # noqa: E402


class RebuildStampTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temporary = tempfile.TemporaryDirectory()
        self.root = Path(self.temporary.name) / "cards_mse"
        for stage in release.STAGES:
            (self.root / stage).mkdir(parents=True)
        self.stamp_root = Path(self.temporary.name) / "stamp-cache"
        self._original_stamp_root = release.STAMP_ROOT
        release.STAMP_ROOT = self.stamp_root
        self.addCleanup(setattr, release, "STAMP_ROOT", self._original_stamp_root)

    def tearDown(self) -> None:
        self.temporary.cleanup()

    # --- copied fixture helpers from tests/test_release_package.py ---

    def project(
        self,
        parent: Path,
        group: str,
        name: str,
        marker: str,
        cards: list[tuple[str, str]],
    ) -> Path:
        project = parent / group / name if group else parent / name
        project.mkdir(parents=True)
        includes = []
        for source_name, display_name in cards:
            includes.append(source_name)
            (project / source_name).write_text(
                "card:\n"
                f"\tname: {display_name}\n"
                "\tsuper_type: Creature\n"
                "\trarity: common\n"
                "\trule_text:\n"
                "\t\t(1 - Static) <b>Flying</b>\n",
                encoding="utf-8",
            )
        (project / "set").write_text(
            "mse_version: 2.0.2\n"
            "game: magic\n"
            "stylesheet: sevenhalf\n"
            "set_info:\n"
            f"\ttitle: Essentia -- Test\n\tartist: {marker}\n"
            "set_language: EN\ncard_language: English\n"
            + "".join(f"include_file: {value}\n" for value in includes),
            encoding="utf-8",
        )
        return project

    def identities(self, entries: list[tuple[str, list[str]]]) -> Path:
        path = Path(self.temporary.name) / "identities.json"
        path.write_text(
            json.dumps(
                {
                    "schemaVersion": 2,
                    "cards": [
                        {
                            "stableId": stable_id,
                            "sources": sources,
                            "routeAliases": [],
                            "retired": False,
                            "withdrawn": False,
                        }
                        for stable_id, sources in entries
                    ],
                }
            ),
            encoding="utf-8",
        )
        return path

    def open_package(self, cards: list[tuple[str, str]]) -> tuple[Path, Path]:
        package = self.root / "01_alpha" / "TEST-0001-Alpha_0.1"
        project = self.project(
            package,
            "",
            "10_YGO_Test.mse-set",
            "Test Set Alpha",
            cards,
        )
        metadata = {
            "schemaVersion": 2,
            "setId": "TEST-0001",
            "setName": "Test Set",
            "version": "Alpha_0.1",
            "stage": "alpha",
            "status": "open",
            "releasedOn": "2026-07-31",
            "components": [{"group": "10_test", "project": project.name}],
            "decks": [],
            "contentPosts": [],
        }
        (package / "release.json").write_text(
            json.dumps(metadata, indent=2, sort_keys=True) + "\n", encoding="utf-8"
        )
        identity_path = self.identities(
            [
                (
                    f"card-{index}",
                    [f"{project.name}/{source_name}"],
                )
                for index, (source_name, _display_name) in enumerate(cards, 1)
            ]
        )
        return package, identity_path

    def fake_artifacts(
        self,
        package: Path,
        _aggregate: Path,
        *,
        print_masters: bool = False,
        verbose: bool = False,
    ) -> None:
        (package / "renders").mkdir(exist_ok=True)
        (package / "renders" / "Card One.png").write_bytes(b"png")
        (package / "renders_print").mkdir(exist_ok=True)
        (package / "renders_print" / "Card One.png").write_bytes(b"png-print")
        (package / "render-provenance.json").write_text("{}\n", encoding="utf-8")

    # --- tests ---

    def test_input_hash_is_stable(self) -> None:
        package, _ = self.open_package([("card one", "Card One")])
        first = release.rebuild_input_hash(package)
        second = release.rebuild_input_hash(package)
        self.assertEqual(first, second)
        self.assertEqual(len(first), 64)
        int(first, 16)

    def test_input_hash_ignores_generated_outputs(self) -> None:
        package, _ = self.open_package([("card one", "Card One")])
        before = release.rebuild_input_hash(package)

        (package / "renders").mkdir(exist_ok=True)
        (package / "renders" / "new.png").write_bytes(b"new")
        (package / f"{package.name}_all_cards.mse-set").mkdir(exist_ok=True)
        (package / f"{package.name}_all_cards.mse-set" / "card x").write_text(
            "card:\n\tname: X\n", encoding="utf-8"
        )
        staging = package / ".foo.staging"
        staging.mkdir(exist_ok=True)
        (staging / "y").write_text("y", encoding="utf-8")

        after = release.rebuild_input_hash(package)
        self.assertEqual(before, after)

    def test_input_hash_changes_when_a_card_changes(self) -> None:
        package, _ = self.open_package([("card one", "Card One")])
        before = release.rebuild_input_hash(package)
        card = package / "10_YGO_Test.mse-set" / "card one"
        card.write_text(card.read_text(encoding="utf-8") + "\n", encoding="utf-8")
        after = release.rebuild_input_hash(package)
        self.assertNotEqual(before, after)

    def test_input_hash_changes_with_vendor_manifest(self) -> None:
        package, _ = self.open_package([("card one", "Card One")])
        before = release.rebuild_input_hash(package)

        vendor = Path(self.temporary.name) / "manifest.json"
        vendor.write_text("{}", encoding="utf-8")
        original_vendor_path = release.VENDOR_MANIFEST_PATH
        release.VENDOR_MANIFEST_PATH = vendor
        try:
            after_empty = release.rebuild_input_hash(package)
            vendor.write_text('{"other": true}', encoding="utf-8")
            after_changed = release.rebuild_input_hash(package)
        finally:
            release.VENDOR_MANIFEST_PATH = original_vendor_path

        self.assertNotEqual(before, after_empty)
        self.assertNotEqual(after_empty, after_changed)

    def test_input_hash_covers_the_identity_registry(self) -> None:
        package, identities = self.open_package([("card one", "Card One")])
        before = release.rebuild_input_hash(package, identities)
        registry = json.loads(identities.read_text(encoding="utf-8"))
        registry["cards"][0]["routeAliases"] = ["card-one-alias"]
        identities.write_text(json.dumps(registry), encoding="utf-8")
        self.assertNotEqual(before, release.rebuild_input_hash(package, identities))

    def test_identity_edit_defeats_the_stamp(self) -> None:
        package, identities = self.open_package([("card one", "Card One")])
        calls = []

        def spy(package: Path, aggregate: Path, *, print_masters: bool = False, verbose: bool = False) -> None:
            calls.append(package)
            self.fake_artifacts(package, aggregate, print_masters=print_masters, verbose=verbose)

        release.rebuild(package, identities_path=identities, artifact_builder=spy)
        self.assertTrue(release.rebuild_is_current(package, identities))

        registry = json.loads(identities.read_text(encoding="utf-8"))
        registry["cards"][0]["routeAliases"] = ["card-one-alias"]
        identities.write_text(json.dumps(registry), encoding="utf-8")

        self.assertFalse(release.rebuild_is_current(package, identities))
        release.rebuild(package, identities_path=identities, artifact_builder=spy)
        self.assertEqual(len(calls), 2)

    def test_empty_render_directory_is_not_present(self) -> None:
        package, identities = self.open_package([("card one", "Card One")])
        calls = []

        def spy(package: Path, aggregate: Path, *, print_masters: bool = False, verbose: bool = False) -> None:
            calls.append(package)
            self.fake_artifacts(package, aggregate, print_masters=print_masters, verbose=verbose)

        release.rebuild(package, identities_path=identities, artifact_builder=spy)
        self.assertTrue(release.rebuild_outputs_present(package))

        for render in (package / "renders").iterdir():
            render.unlink()
        self.assertFalse(release.rebuild_outputs_present(package))

        release.rebuild(package, identities_path=identities, artifact_builder=spy)
        self.assertEqual(len(calls), 2)

    def test_rebuild_skips_on_matching_stamp(self) -> None:
        package, identities = self.open_package([("card one", "Card One")])
        calls = []

        def spy(package: Path, aggregate: Path, *, print_masters: bool = False, verbose: bool = False) -> None:
            calls.append(package)
            self.fake_artifacts(package, aggregate, print_masters=print_masters, verbose=verbose)

        release.rebuild(package, identities_path=identities, artifact_builder=spy)
        self.assertEqual(len(calls), 1)

        import io
        import contextlib

        buffer = io.StringIO()
        with contextlib.redirect_stdout(buffer):
            release.rebuild(package, identities_path=identities, artifact_builder=spy)

        self.assertEqual(len(calls), 1)
        self.assertIn("unchanged, skipped", buffer.getvalue())

    def test_force_and_missing_output_defeat_the_stamp(self) -> None:
        package, identities = self.open_package([("card one", "Card One")])
        calls = []

        def spy(package: Path, aggregate: Path, *, print_masters: bool = False, verbose: bool = False) -> None:
            calls.append(package)
            self.fake_artifacts(package, aggregate, print_masters=print_masters, verbose=verbose)

        release.rebuild(package, identities_path=identities, artifact_builder=spy)
        self.assertEqual(len(calls), 1)

        release.rebuild(package, identities_path=identities, artifact_builder=spy, force=True)
        self.assertEqual(len(calls), 2)

        (package / "render-provenance.json").unlink()
        release.rebuild(package, identities_path=identities, artifact_builder=spy)
        self.assertEqual(len(calls), 3)


if __name__ == "__main__":
    unittest.main()

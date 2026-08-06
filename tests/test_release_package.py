from __future__ import annotations

import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / ".script"))

import check_immutable_stages as immutable
import release_package as release


class ReleasePackageTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temporary = tempfile.TemporaryDirectory()
        self.root = Path(self.temporary.name) / "cards_mse"
        for stage in release.STAGES:
            (self.root / stage).mkdir(parents=True)

    def tearDown(self) -> None:
        self.temporary.cleanup()

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

    def fake_artifacts(self, package: Path, _aggregate: Path) -> None:
        (package / "renders").mkdir(exist_ok=True)
        (package / "renders" / "Card One.png").write_bytes(b"png")
        (package / "render-provenance.json").write_text("{}\n", encoding="utf-8")

    def test_release_metadata_requires_status_and_set_id(self) -> None:
        package, _ = self.open_package([("card one", "Card One")])
        path = package / "release.json"
        data = json.loads(path.read_text(encoding="utf-8"))
        del data["status"]
        path.write_text(json.dumps(data), encoding="utf-8")
        with self.assertRaisesRegex(release.LifecycleError, "invalid release metadata"):
            release.release_metadata(package)

    def test_draft_marker_mismatch_names_exact_project(self) -> None:
        project = self.project(
            self.root / "00_drafts",
            "10_test",
            "10_YGO_Test.mse-set",
            "WRONG",
            [("card one", "Card One")],
        )
        with self.assertRaisesRegex(release.LifecycleError, str(project)):
            release.validate_cards_root(self.root)

    def test_aggregate_is_deterministic_and_matches_component_union(self) -> None:
        package, identities = self.open_package(
            [("card two", "Card Two"), ("card one", "Card One")]
        )
        aggregate = release.generate_aggregate(package, identities)
        first = {
            path.relative_to(aggregate).as_posix(): path.read_bytes()
            for path in aggregate.rglob("*")
            if path.is_file()
        }
        release.generate_aggregate(package, identities)
        second = {
            path.relative_to(aggregate).as_posix(): path.read_bytes()
            for path in aggregate.rglob("*")
            if path.is_file()
        }
        self.assertEqual(first, second)
        self.assertEqual(len(release.load_manifest(aggregate)), 2)
        aggregate_set = (aggregate / "set").read_text(encoding="utf-8-sig")
        self.assertIn("title: Essentia -- Test Set Alpha", aggregate_set)
        release.validate_aggregate(package)

    def test_duplicate_stable_identity_fails_aggregate(self) -> None:
        package, _identities = self.open_package(
            [("card one", "Card One"), ("card two", "Card Two")]
        )
        project_name = "10_YGO_Test.mse-set"
        identities = self.identities(
            [
                (
                    "same-card",
                    [f"{project_name}/card one", f"{project_name}/card two"],
                )
            ]
        )
        with self.assertRaisesRegex(release.LifecycleError, "duplicate/conflicting"):
            release.generate_aggregate(package, identities)

    def test_aggregate_drift_and_package_hash_mutation_fail(self) -> None:
        package, identities = self.open_package([("card one", "Card One")])
        aggregate = release.generate_aggregate(package, identities)
        card = aggregate / "card card-1"
        card.write_text(card.read_text() + "\tflavor_text: drift\n", encoding="utf-8")
        with self.assertRaisesRegex(release.LifecycleError, "content hash mismatch"):
            release.validate_aggregate(package)
        release.generate_aggregate(package, identities)
        self.fake_artifacts(package, aggregate)
        release.write_package_hashes(package)
        release.validate_package_hashes(package)
        (package / "render-provenance.json").write_text("changed\n", encoding="utf-8")
        with self.assertRaisesRegex(release.LifecycleError, "package hash mismatch"):
            release.validate_package_hashes(package)

    def test_lock_and_advance_flow(self) -> None:
        package, identities = self.open_package([("card one", "Card One")])
        locked = release.lock(
            package,
            identities_path=identities,
            artifact_builder=self.fake_artifacts,
        )
        self.assertEqual(release.release_metadata(locked)["status"], "locked")
        release.validate_package(locked, require_artifacts=True)
        source_hashes = release.package_hashes(locked)

        target = release.advance(
            locked, "02_beta", "Beta_0.1", cards_root=self.root
        )
        self.assertEqual(target.name, "TEST-0001-Beta_0.1")
        meta = release.release_metadata(target)
        self.assertEqual(meta["status"], "open")
        self.assertEqual(meta["stage"], "beta")
        self.assertEqual(meta["version"], "Beta_0.1")
        copied = target / "10_YGO_Test.mse-set"
        self.assertTrue(copied.is_dir())
        self.assertIn("artist: Test Set Beta", (copied / "set").read_text())
        self.assertEqual(source_hashes, release.package_hashes(locked))

    def test_merge_base_guard_rejects_locked_package_mutation(self) -> None:
        repository = Path(self.temporary.name) / "repo"
        package = repository / "cards_mse" / "01_alpha" / "TEST-0001-Alpha_0.1"
        package.mkdir(parents=True)
        protected = package / "release.json"
        protected.write_text(
            json.dumps(
                {
                    "schemaVersion": 2,
                    "setId": "TEST-0001",
                    "setName": "Test Set",
                    "version": "Alpha_0.1",
                    "stage": "alpha",
                    "status": "locked",
                    "releasedOn": "2026-07-31",
                    "components": [{"group": "10_test", "project": "10_YGO_Test.mse-set"}],
                    "decks": [],
                    "contentPosts": [],
                }
            )
            + "\n",
            encoding="utf-8",
        )
        subprocess.run(["git", "init", "-q"], cwd=repository, check=True)
        subprocess.run(
            ["git", "config", "user.email", "test@example.invalid"],
            cwd=repository,
            check=True,
        )
        subprocess.run(
            ["git", "config", "user.name", "Test"], cwd=repository, check=True
        )
        subprocess.run(["git", "add", "."], cwd=repository, check=True)
        subprocess.run(
            ["git", "commit", "-qm", "base"], cwd=repository, check=True
        )
        base = subprocess.check_output(
            ["git", "rev-parse", "HEAD"], cwd=repository, text=True
        ).strip()
        protected.write_text("mutated\n", encoding="utf-8")
        with self.assertRaisesRegex(release.LifecycleError, "locked packages are immutable"):
            immutable.check_merge_base(base, repo_root=repository)

    def test_open_package_mutation_allowed_by_guard(self) -> None:
        repository = Path(self.temporary.name) / "repo"
        package = repository / "cards_mse" / "01_alpha" / "TEST-0001-Alpha_0.1"
        package.mkdir(parents=True)
        protected = package / "release.json"
        protected.write_text(
            json.dumps(
                {
                    "schemaVersion": 2,
                    "setId": "TEST-0001",
                    "setName": "Test Set",
                    "version": "Alpha_0.1",
                    "stage": "alpha",
                    "status": "open",
                    "releasedOn": "2026-07-31",
                    "components": [{"group": "10_test", "project": "10_YGO_Test.mse-set"}],
                    "decks": [],
                    "contentPosts": [],
                }
            )
            + "\n",
            encoding="utf-8",
        )
        subprocess.run(["git", "init", "-q"], cwd=repository, check=True)
        subprocess.run(
            ["git", "config", "user.email", "test@example.invalid"],
            cwd=repository,
            check=True,
        )
        subprocess.run(
            ["git", "config", "user.name", "Test"], cwd=repository, check=True
        )
        subprocess.run(["git", "add", "."], cwd=repository, check=True)
        subprocess.run(
            ["git", "commit", "-qm", "base"], cwd=repository, check=True
        )
        base = subprocess.check_output(
            ["git", "rev-parse", "HEAD"], cwd=repository, text=True
        ).strip()
        protected.write_text(
            protected.read_text(encoding="utf-8").replace('"open"', '"open"'),
            encoding="utf-8",
        )
        # actual content change
        data = json.loads(protected.read_text(encoding="utf-8"))
        data["setName"] = "Test Set Edited"
        protected.write_text(json.dumps(data) + "\n", encoding="utf-8")
        immutable.check_merge_base(base, repo_root=repository)


if __name__ == "__main__":
    unittest.main()

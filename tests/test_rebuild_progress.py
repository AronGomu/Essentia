from __future__ import annotations

import importlib.util
import io
import json
import re
import sys
import tempfile
import unittest
from contextlib import redirect_stdout
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]

EXPORT_MODULE_PATH = ROOT / ".script" / "export_mse_renders.py"
sys.path.insert(0, str(EXPORT_MODULE_PATH.parent))
EXPORT_SPEC = importlib.util.spec_from_file_location("export_mse_renders", EXPORT_MODULE_PATH)
assert EXPORT_SPEC is not None and EXPORT_SPEC.loader is not None
export_mse_renders = importlib.util.module_from_spec(EXPORT_SPEC)
EXPORT_SPEC.loader.exec_module(export_mse_renders)

sys.path.insert(0, str(ROOT / ".script"))
import release_package  # noqa: E402


PHASE_LINE_RE = re.compile(r"^rebuild (?P<stem>\S+) \[(?P<index>\d)/5\] .+( done \(\d+\.\d\ds\))?$")


class RebuildProgressTests(unittest.TestCase):
    """Duplicated fixture helpers from tests/test_release_package.py (kept separate per ticket)."""

    def setUp(self) -> None:
        self.temporary = tempfile.TemporaryDirectory()
        self.root = Path(self.temporary.name) / "cards_mse"
        for stage in release_package.STAGES:
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
        (package / "render-provenance.json").write_text("{}\n", encoding="utf-8")

    def test_rebuild_prints_five_numbered_phases(self) -> None:
        package, identities = self.open_package([("card one", "Card One")])
        buffer = io.StringIO()
        with redirect_stdout(buffer):
            release_package.rebuild(
                package,
                identities_path=identities,
                artifact_builder=self.fake_artifacts,
            )
        output = buffer.getvalue()
        for index in range(1, 6):
            self.assertIn(f"[{index}/5]", output)
        self.assertIn("[1/5] aggregate manifest", output)
        self.assertIn("[5/5] validate", output)
        for index in range(1, 6):
            self.assertRegex(output, rf"\[{index}/5\] .+ done \(\d+\.\d\ds\)")

    def test_phase_lines_carry_package_stem_and_seconds(self) -> None:
        package, identities = self.open_package([("card one", "Card One")])
        buffer = io.StringIO()
        with redirect_stdout(buffer):
            release_package.rebuild(
                package,
                identities_path=identities,
                artifact_builder=self.fake_artifacts,
            )
        output = buffer.getvalue()
        lines = [line for line in output.splitlines() if line.startswith("rebuild ")]
        self.assertTrue(lines)
        for line in lines:
            self.assertRegex(line, PHASE_LINE_RE)
            self.assertTrue(line.startswith(f"rebuild {package.name} ["))

    def test_progress_line_format(self) -> None:
        self.assertEqual(
            export_mse_renders.progress_line("mse.render", 12, 50, "burning abyss - dante"),
            "mse.render 12/50 burning abyss - dante",
        )

    def test_quiet_suppresses_per_card_lines(self) -> None:
        with patch.object(sys, "argv", ["export_mse_renders.py", "some-project", "--dry-run", "--quiet"]):
            args = export_mse_renders.parse_args()
        self.assertTrue(args.quiet)
        buffer = io.StringIO()
        with redirect_stdout(buffer):
            export_mse_renders.report_progress("mse.render", 1, 1, "card", quiet=True)
        self.assertEqual(buffer.getvalue(), "")


if __name__ == "__main__":
    unittest.main()

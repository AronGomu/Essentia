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
from types import SimpleNamespace
from unittest.mock import patch

from PIL import Image

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

    def write_png(self, path: Path, size: tuple[int, int]) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        Image.new("RGBA", size, (255, 255, 255, 255)).save(path, format="PNG")

    def stub_renderer(self, names: list[str], size: tuple[int, int]):
        """Stand in for the MSE CLI: write one PNG per card where the exporter looks."""

        def run(command, *_args, **_kwargs):  # noqa: ANN001
            if "--export-images" in command:
                directory = Path(command[-1]).parent
                for name in names:
                    self.write_png(directory / f"{name}.png", size)
            else:
                directory = Path(command[-1]).parent / "print-files"
                for name in names:
                    self.write_png(directory / f"{name}.png", size)
            return SimpleNamespace(returncode=0, stdout="", stderr="")

        return run

    def render_project(self, names: list[str]) -> Path:
        return self.project(
            self.root / "00_drafts",
            "",
            "10_YGO_Test.mse-set",
            "Test Set Draft",
            [(name.lower(), name) for name in names],
        )

    def test_export_emits_one_render_line_per_card(self) -> None:
        names = ["Card One", "Card Two", "Card Three"]
        project = self.render_project(names)
        config = SimpleNamespace(cli=Path("mse"))
        buffer = io.StringIO()
        with patch.object(export_mse_renders.subprocess, "run", self.stub_renderer(names, (30, 42))):
            with redirect_stdout(buffer):
                export_mse_renders.export(project, project / "render", config)
        lines = [line for line in buffer.getvalue().splitlines() if line.startswith("mse.render ")]
        self.assertEqual(
            lines,
            [f"mse.render {index}/3 {name}" for index, name in enumerate(names, start=1)],
        )

    def test_export_prints_nothing_when_quiet(self) -> None:
        names = ["Card One", "Card Two", "Card Three"]
        project = self.render_project(names)
        config = SimpleNamespace(cli=Path("mse"))
        buffer = io.StringIO()
        with patch.object(export_mse_renders.subprocess, "run", self.stub_renderer(names, (30, 42))):
            with redirect_stdout(buffer):
                export_mse_renders.export(project, project / "render", config, quiet=True)
        self.assertEqual(buffer.getvalue(), "")

    def test_print_masters_emit_one_line_per_card(self) -> None:
        names = ["Card One", "Card Two", "Card Three"]
        project = self.render_project(names)
        config = SimpleNamespace(cli=Path("mse"))
        size = (export_mse_renders.PRINT_WIDTH, export_mse_renders.PRINT_HEIGHT)
        output = project.parent / export_mse_renders.PRINT_DIR_NAME
        buffer = io.StringIO()
        with patch.object(export_mse_renders.subprocess, "run", self.stub_renderer(names, size)):
            with redirect_stdout(buffer):
                export_mse_renders.export_print_masters(project, output, config)
        lines = [line for line in buffer.getvalue().splitlines() if line.startswith("mse.print ")]
        self.assertEqual(
            lines,
            [f"mse.print {index}/3 {name}" for index, name in enumerate(names, start=1)],
        )

        quiet_buffer = io.StringIO()
        with patch.object(export_mse_renders.subprocess, "run", self.stub_renderer(names, size)):
            with redirect_stdout(quiet_buffer):
                export_mse_renders.export_print_masters(project, output, config, quiet=True)
        self.assertEqual(quiet_buffer.getvalue(), "")

    def test_main_forwards_quiet_to_the_exporters(self) -> None:
        project = self.render_project(["Card One"])
        output = Path(self.temporary.name) / "render-out"
        output.mkdir()
        config = SimpleNamespace(cli=Path("mse"), projects_dir=self.root)
        seen: list[tuple[str, bool]] = []

        def fake_export(_project: Path, _output: Path, _config, *, quiet: bool = False) -> dict[str, object]:
            seen.append(("render", quiet))
            return {"schemaVersion": export_mse_renders.PROVENANCE_SCHEMA, "cards": []}

        def fake_print_masters(_project: Path, _output: Path, _config, *, quiet: bool = False) -> dict[str, object]:
            seen.append(("print", quiet))
            return {"cards": []}

        argv = [
            "export_mse_renders.py",
            str(project),
            "--output",
            str(output),
            "--print-masters",
            "--quiet",
        ]
        with patch.object(sys, "argv", argv), patch.object(
            export_mse_renders, "export", fake_export
        ), patch.object(
            export_mse_renders, "export_print_masters", fake_print_masters
        ), patch.object(
            export_mse_renders.MSEConfig, "load", classmethod(lambda cls: config)
        ):
            with redirect_stdout(io.StringIO()):
                export_mse_renders.main()
        self.assertEqual(seen, [("render", True), ("print", True)])

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

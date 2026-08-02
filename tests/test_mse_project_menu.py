from __future__ import annotations

import importlib.machinery
import importlib.util
import os
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MENU_PATH = ROOT / "launcher" / "mse_project_menu.pyw"
LOADER = importlib.machinery.SourceFileLoader("mse_project_menu", str(MENU_PATH))
SPEC = importlib.util.spec_from_loader(LOADER.name, LOADER)
assert SPEC is not None
MENU = importlib.util.module_from_spec(SPEC)
LOADER.exec_module(MENU)


class MSEProjectMenuTests(unittest.TestCase):
    def test_discovers_only_top_level_menu_lifecycles(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            stages = {
                "00_drafts": "Draft",
                "01_alpha": "Alpha",
                "02_beta": "Beta",
                "03_release": "Release",
            }
            for stage in stages:
                project = root / stage / "sample" / f"{stage}.mse-set"
                project.mkdir(parents=True)
                (project / "set").write_text(
                    "set_info:\n\ttitle: Sample\ninclude_file: card sample\n",
                    encoding="utf-8",
                )

            projects = MENU.discover_projects(root)

            self.assertEqual(
                [project["lifecycle"] for project in projects],
                list(stages.values()),
            )

    def test_groups_projects_in_fixed_tab_order(self) -> None:
        projects = [
            {"lifecycle": "Release", "name": "release"},
            {"lifecycle": "Alpha", "name": "alpha"},
            {"lifecycle": "Draft", "name": "draft"},
        ]

        grouped = MENU.group_projects_by_tab(projects)

        self.assertEqual(
            MENU.TAB_NAMES,
            (
                "Draft",
                "Alpha",
                "Beta",
                "Release",
            ),
        )
        self.assertEqual(tuple(grouped), MENU.TAB_NAMES)
        self.assertEqual([item["name"] for item in grouped["Draft"]], ["draft"])
        self.assertEqual([item["name"] for item in grouped["Alpha"]], ["alpha"])
        self.assertEqual(grouped["Beta"], [])
        self.assertEqual([item["name"] for item in grouped["Release"]], ["release"])

    def test_skips_release_all_cards_aggregates(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            package = root / "01_alpha" / "LOTA-0001-Alpha_0.1"
            working = package / "01_YGO_Legend_of_the_Alpha.mse-set"
            aggregate = package / "LOTA-0001-Alpha_0.1_all_cards.mse-set"
            for project in (working, aggregate):
                project.mkdir(parents=True)
                (project / "set").write_text(
                    "set_info:\n\ttitle: Legend\ninclude_file: card sample\n",
                    encoding="utf-8",
                )

            projects = MENU.discover_projects(root)

            self.assertEqual([project["name"] for project in projects], [working.name])

    def test_mse_spawn_env_prefers_explicit_library_path(self) -> None:
        previous = os.environ.get("MSE_LIBRARY_PATH")
        previous_ld = os.environ.get("LD_LIBRARY_PATH")
        try:
            os.environ["MSE_LIBRARY_PATH"] = "/tmp/mse-libs"
            os.environ["LD_LIBRARY_PATH"] = "/tmp/other"
            env = MENU._mse_spawn_env()
            self.assertTrue(env["LD_LIBRARY_PATH"].startswith("/tmp/mse-libs"))
            self.assertIn("/tmp/other", env["LD_LIBRARY_PATH"])
        finally:
            if previous is None:
                os.environ.pop("MSE_LIBRARY_PATH", None)
            else:
                os.environ["MSE_LIBRARY_PATH"] = previous
            if previous_ld is None:
                os.environ.pop("LD_LIBRARY_PATH", None)
            else:
                os.environ["LD_LIBRARY_PATH"] = previous_ld


if __name__ == "__main__":
    unittest.main()

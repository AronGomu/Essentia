from __future__ import annotations

import importlib.machinery
import importlib.util
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
                "01_pre_alpha": "Pre-Alpha",
                "02_alpha": "Alpha",
                "03_pre_beta": "Pre-Beta",
                "04_beta": "Beta",
                "05_pre_release": "Pre-Release",
                "06_released": "Release",
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
            {"lifecycle": "Pre-Alpha", "name": "pre-alpha"},
            {"lifecycle": "Draft", "name": "draft"},
        ]

        grouped = MENU.group_projects_by_tab(projects)

        self.assertEqual(
            MENU.TAB_NAMES,
            (
                "Draft",
                "Pre-Alpha",
                "Alpha",
                "Pre-Beta",
                "Beta",
                "Pre-Release",
                "Release",
            ),
        )
        self.assertEqual(tuple(grouped), MENU.TAB_NAMES)
        self.assertEqual([item["name"] for item in grouped["Draft"]], ["draft"])
        self.assertEqual([item["name"] for item in grouped["Pre-Alpha"]], ["pre-alpha"])
        self.assertEqual(grouped["Alpha"], [])
        self.assertEqual(grouped["Pre-Beta"], [])
        self.assertEqual(grouped["Beta"], [])
        self.assertEqual(grouped["Pre-Release"], [])
        self.assertEqual([item["name"] for item in grouped["Release"]], ["release"])


if __name__ == "__main__":
    unittest.main()

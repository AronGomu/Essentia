from __future__ import annotations

import importlib.util
import json
import re
import unittest
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
DRAFTS = ROOT / "cards_mse" / "00_drafts"
INTENTIONAL_UNINCLUDED_CARDS: dict[str, set[str]] = {
    # Empty draft shell: Nekroz cards live only in active development.
    "03_YGO_Nekroz.mse-set": set(),
}
EMPTY_DRAFT_PROJECTS = {"03_YGO_Nekroz.mse-set"}
FRENCH_MARKERS = re.compile(
    r"[àâçéèêëîïôùûüÿœæ]|"
    r"\b(?:votre|depuis|ciblez|carte|cartes|créature|créatures|détruisez|"
    r"exilez|piochez|défaussez|envoyez|renvoyez|mettez|cherchez|révélez|"
    r"choisissez|contrôlez|bibliothèque|cimetière|adversaire|coût|capacité|"
    r"lorsque|sacrifiez|jusqu’à)\b",
    re.IGNORECASE,
)


def card_name(card_path: Path) -> str:
    text = card_path.read_text(encoding="utf-8-sig")
    match = re.search(r"(?m)^\tname:\s*(.+)$", text)
    assert match is not None
    return match.group(1).strip()


def render_name(name: str) -> str:
    safe = name.replace(":", " -").replace('"', "'").replace("/", " - ")
    return "".join(char for char in safe if char not in "<>|?*") + ".png"


class EnglishSourceOfTruthTests(unittest.TestCase):
    def test_requested_legacy_roots_are_absent(self) -> None:
        for relative in (
            "MSE_projects",
            "mse",
            "print",
            "rule_reviews",
            "docs/French",
            "FRENCH_ARCHIVE_SHA256SUMS",
            "website_implementation_plan.md",
            "website_validation_report.md",
            "DECKLISTS_ALPHA_0.1.md",
        ):
            self.assertFalse((ROOT / relative).exists(), relative)

    def test_five_draft_projects_are_english_and_complete(self) -> None:
        projects = sorted(DRAFTS.glob("*/*.mse-set"))
        self.assertEqual(len(projects), 5)
        for project in projects:
            with self.subTest(project=project.name):
                set_text = (project / "set").read_text(encoding="utf-8-sig")
                self.assertIn("set_language: EN", set_text)
                self.assertIn("card_language: English", set_text)
                self.assertRegex(set_text, r"(?m)^\ttitle: Essentia -- ")
                self.assertRegex(set_text, r"(?m)^\tartist: DRAFT$")
                includes = re.findall(r"(?m)^include_file:\s*(.+)$", set_text)
                self.assertEqual(len(includes), len(set(includes)))
                if project.name in EMPTY_DRAFT_PROJECTS:
                    self.assertEqual(includes, [])
                    self.assertEqual({path.name for path in project.glob("card *")}, set())
                    continue
                self.assertTrue(includes)
                for include in includes:
                    self.assertTrue((project / include).is_file(), include)
                all_cards = {path.name for path in project.glob("card *")}
                self.assertEqual(
                    all_cards - set(includes),
                    INTENTIONAL_UNINCLUDED_CARDS.get(project.name, set()),
                )
                for card_path in project.glob("card *"):
                    text = card_path.read_text(encoding="utf-8-sig")
                    self.assertNotRegex(text, FRENCH_MARKERS)
                    image = re.search(r"(?m)^\timage:\s*(.+)$", text)
                    if image and image.group(1).strip():
                        image_ref = image.group(1).strip()
                        image_path = project / image_ref
                        self.assertTrue(image_path.is_file(), image_path)
                        with Image.open(image_path) as value:
                            value.verify()
                        if project.name == "00_YGO_Non_Archetype.mse-set":
                            self.assertRegex(
                                image_ref,
                                r"^mse_images/(creatures|fusion|synchro|xyz|link|noncreatures)/(imported|embedded)/",
                            )
                render_paths = list((project / "render").glob("*.png"))
                if render_paths:
                    expected = {render_name(card_name(project / name)) for name in includes}
                    self.assertEqual(expected, {path.name for path in render_paths})

    def test_modular_docs_and_adrs_exist(self) -> None:
        required = {
            "CONTEXT.md",
            "DESIGN.md",
            "RULES.md",
            "KEYWORDS.md",
            "RELEASES.md",
            "MSE.md",
            "design/CONVERSION.md",
            "design/BALANCE.md",
            "design/FRAMES.md",
            "rules/DECK_BUILDING.md",
            "rules/ZONES.md",
            "rules/CARD_TYPES.md",
            "rules/SUMMONING.md",
            "rules/TEMPLATING.md",
            "keywords/ACTIONS.md",
            "keywords/EVENTS.md",
            "keywords/ABILITIES.md",
            "keywords/COSTS_AND_PROCEDURES.md",
            "ADR/README.md",
        }
        self.assertTrue(all((ROOT / "docs" / path).is_file() for path in required))
        self.assertTrue((ROOT / "docs" / "GLOSSARY.md").is_file())
        for archetype in ("01_burning_abyss", "02_shaddoll", "03_nekroz", "04_spellbook"):
            self.assertEqual(
                {"CONTEXT.md", "DESIGN.md", "RULES.md", "KEYWORDS.md"},
                {path.name for path in (ROOT / "docs" / archetype).glob("*.md")},
            )
            self.assertFalse((ROOT / "docs" / archetype / "CHANGELOG.md").exists())
        accepted = ROOT / "docs" / "ADR" / "accepted"
        proposed = ROOT / "docs" / "ADR" / "proposed"
        self.assertEqual(len(list(accepted.glob("000*.md"))), 5)
        self.assertTrue((proposed / "0003-nekroz-reconciliation.md").is_file())
        self.assertIn(
            "Status: AWAITING_USER",
            (proposed / "0003-nekroz-reconciliation.md").read_text(encoding="utf-8"),
        )

    def test_card_workflows_reject_immutable_stages(self) -> None:
        for skill in (
            "add-ygo-card",
            "fix-mse-cards",
            "normalize-card-formatting",
            "update-card-from-ai",
        ):
            text = (ROOT / f".agents/skills/{skill}/SKILL.md").read_text(
                encoding="utf-8-sig"
            )
            for stage in ("02_alpha", "04_beta", "06_released"):
                self.assertIn(stage, text)
            self.assertRegex(text, r"(?i)never edit|reject")

    def test_proxy_pdf_defaults_read_immutable_packages_only(self) -> None:
        script = ROOT / ".script" / "create_proxy_pdf.py"
        spec = importlib.util.spec_from_file_location("create_proxy_pdf", script)
        assert spec and spec.loader
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        folders = module.discover_render_folders([])
        self.assertTrue(
            all(path.parent.parent.name in {"02_alpha", "04_beta", "06_released"} for path in folders)
        )
        self.assertEqual(folders, [])

    def test_identity_metadata_does_not_duplicate_card_fields(self) -> None:
        data = json.loads((ROOT / "website/content/identities.json").read_text())
        self.assertEqual(data["schemaVersion"], 2)
        for identity in data["cards"]:
            self.assertNotIn("currentName", identity)
            self.assertNotIn("formerNames", identity)
            self.assertTrue(identity["sources"])
            self.assertTrue(all("/card " in source for source in identity["sources"]))


if __name__ == "__main__":
    unittest.main()

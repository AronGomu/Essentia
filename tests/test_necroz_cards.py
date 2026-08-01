from __future__ import annotations

import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DRAFT_PROJECT = ROOT / "cards_mse/00_drafts/03_nekroz/03_YGO_Nekroz.mse-set"
PROJECT = (
    ROOT
    / "cards_mse/01_alpha/LOTA-0001-Alpha_0.1/01_YGO_Legend_of_the_Alpha.mse-set"
)
DOCS = ROOT / "docs" / "03_nekroz"

INCLUDED = [
    "card herald of the arc light",
    "card manju of the ten thousand hands",
    "card nekroz - brionac",
    "card nekroz - catastor",
    "card nekroz - clausolas",
    "card nekroz - cycle",
    "card nekroz - dance princess",
    "card nekroz - decisive armor",
    "card nekroz - exa",
    "card nekroz - great sorcerer",
    "card nekroz - gungnir",
    "card nekroz - kaleidoscope",
    "card nekroz - mirror",
    "card nekroz - shurit",
    "card nekroz - trishula",
    "card nekroz - unicore",
    "card nekroz - valkyrus",
    "card preparation of rites",
    "card senju of the thousand hands",
]


class NecrozCardTests(unittest.TestCase):
    def test_draft_project_empty_while_cards_in_active_dev(self) -> None:
        set_text = (DRAFT_PROJECT / "set").read_text(encoding="utf-8-sig")
        includes = re.findall(r"(?m)^include_file:\s*(.+)$", set_text)
        self.assertEqual(includes, [])
        self.assertEqual(list(DRAFT_PROJECT.glob("card *")), [])

    def test_manifest_includes_all_active_cards(self) -> None:
        set_text = (PROJECT / "set").read_text(encoding="utf-8-sig")
        includes = re.findall(r"(?m)^include_file:\s*(.+)$", set_text)
        for filename in INCLUDED:
            self.assertIn(filename, includes)
        self.assertEqual(len(includes), 50)

    def test_included_cards_clean_and_images_resolve(self) -> None:
        stale = ("graveyard", "GYD", "library", "mana value", "error-spelling")
        for filename in INCLUDED:
            with self.subTest(filename=filename):
                text = (PROJECT / filename).read_text(encoding="utf-8-sig")
                rule = text.split("\trule_text:\n", 1)[1].split("\tflavor_text:", 1)[0]
                for term in stale:
                    self.assertNotIn(term, rule)
                self.assertNotIn("\tGY", rule)
                image = next(
                    line.split(": ", 1)[1]
                    for line in text.splitlines()
                    if line.startswith("\timage: ")
                )
                self.assertTrue((PROJECT / image).is_file(), image)

    def test_key_mechanics_present(self) -> None:
        brionac = (PROJECT / "card nekroz - brionac").read_text(encoding="utf-8-sig")
        self.assertIn("shuffle the target into its owner’s Deck", brionac)
        self.assertIn("<b>Discard</b> <i-auto>“Brionac”</i-auto>", brionac)

        catastor = (PROJECT / "card nekroz - catastor").read_text(encoding="utf-8-sig")
        self.assertIn("<b>Reanimate</b>", catastor)

        exa = (PROJECT / "card nekroz - exa").read_text(encoding="utf-8-sig")
        self.assertIn("<b>Release</b>", exa)
        self.assertIn("ignoring the restrictions of Summon", exa)

        unicore = (PROJECT / "card nekroz - unicore").read_text(encoding="utf-8-sig")
        self.assertIn("<b>Salvage</b>", unicore)

        sorcerer = (PROJECT / "card nekroz - great sorcerer").read_text(
            encoding="utf-8-sig"
        )
        self.assertIn("<b>Reclaim</b>", sorcerer)

        for name in (
            "card nekroz - cycle",
            "card nekroz - kaleidoscope",
            "card nekroz - mirror",
        ):
            text = (PROJECT / name).read_text(encoding="utf-8-sig")
            self.assertIn("<b>Ritual Summon</b>", text)
            self.assertIn("<b>Nekroz Recovery</b>", text)

    def test_archetype_docs_point_at_mse(self) -> None:
        context = (DOCS / "CONTEXT.md").read_text(encoding="utf-8-sig")
        keywords = (DOCS / "KEYWORDS.md").read_text(encoding="utf-8-sig")
        self.assertIn("cards_mse/00_drafts/03_nekroz/03_YGO_Nekroz.mse-set", context)
        self.assertIn("01_alpha", context)
        self.assertIn("**Nekroz Recovery**", keywords)
        self.assertIn("non-Creature **Ritual Summon** *“Nekroz”*", keywords)


if __name__ == "__main__":
    unittest.main()

from __future__ import annotations

import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PROJECT = ROOT / "cards_mse/00_drafts/02_shaddoll/02_YGO_Shaddoll.mse-set"
DOCS = ROOT / "docs/02_shaddoll"


class ShaddollCardsTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.set_text = (PROJECT / "set").read_text(encoding="utf-8-sig")
        cls.includes = re.findall(r"(?m)^include_file:\s*(.+)$", cls.set_text)

    def card(self, filename: str) -> str:
        return (PROJECT / filename).read_text(encoding="utf-8-sig")

    def test_set_is_complete_and_english(self) -> None:
        self.assertEqual(len(self.includes), 25)
        self.assertEqual(len(self.includes), len(set(self.includes)))
        self.assertEqual({path.name for path in PROJECT.glob("card *")}, set(self.includes))
        self.assertIn("set_language: EN", self.set_text)
        self.assertIn("card_language: English", self.set_text)

    def test_archetype_docs_keep_identity_not_card_blocks(self) -> None:
        context = (DOCS / "CONTEXT.md").read_text(encoding="utf-8-sig")
        design = (DOCS / "DESIGN.md").read_text(encoding="utf-8-sig")
        keywords = (DOCS / "KEYWORDS.md").read_text(encoding="utf-8-sig")
        self.assertIn("Card-by-card values and type lines live only in MSE", context)
        self.assertIn("Control / Value / Fusion", design)
        self.assertIn("Shaddoll Recovery", keywords)
        combined = context + design + keywords
        self.assertNotIn("#### El Shaddoll - Construct", combined)
        self.assertNotIn("## Complete card list", combined)

    def test_all_rule_text_uses_english_current_vocabulary(self) -> None:
        stale = re.compile(r"\b(?:library|graveyard|GYD|battlefield|Cimetière|Déclenchable|Résolution)\b|\?{2,}", re.I)
        for include in self.includes:
            with self.subTest(card=include):
                text = self.card(include)
                self.assertNotRegex(text, stale)
                self.assertNotIn("error-spelling", text)
                self.assertNotIn("Release</b>-", text)
                self.assertNotIn("</b></key>", text)

    def test_core_flip_and_recovery_mechanics_are_preserved(self) -> None:
        for include in (
            "card shaddoll - beast",
            "card shaddoll - dragon",
            "card shaddoll - falco",
            "card shaddoll - hedgehog",
            "card shaddoll - hound",
            "card shaddoll - squamata",
        ):
            text = self.card(include)
            self.assertIn("<b>Flip</b>", text)
            self.assertIn("<b>On Send Grave by Effect</b>", text)
        construct = self.card("card el shaddoll - construct")
        self.assertIn("<b>On Enter</b>", construct)
        self.assertIn("<b>Shaddoll Recovery</b>", construct)

    def test_anoyatyllis_and_aeon_mechanics_are_preserved(self) -> None:
        anoyatyllis = self.card("card el shaddoll - anoyatyllis")
        self.assertIn("from a Hand or a Grave", anoyatyllis)
        self.assertIn("<b>Exile</b> it instead", anoyatyllis)
        aeon = self.card("card puru shaddoll - aeon")
        self.assertIn("<b>Send</b> 1 <i-auto>“Shaddoll”</i-auto> card from your Hand to Grave", aeon)
        self.assertIn("gets +2/+2 until the end of the turn", aeon)

    def test_fusion_cards_keep_distinct_material_rules(self) -> None:
        el_fusion = self.card("card el shaddoll - fusion")
        self.assertIn("using Creatures from your Hand or Field as materials", el_fusion)
        fusion = self.card("card shaddoll - fusion")
        self.assertIn("you can also use Creatures from your Deck", fusion)
        schism = self.card("card shaddoll - schism")
        self.assertIn("by exiling the indicated materials from your Field or Grave", schism)

    def test_all_image_references_resolve(self) -> None:
        for include in self.includes:
            text = self.card(include)
            image = next(line.split(": ", 1)[1] for line in text.splitlines() if line.startswith("\timage: "))
            self.assertTrue((PROJECT / image).is_file(), image)


if __name__ == "__main__":
    unittest.main()

from __future__ import annotations

import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ACTIVE = (
    ROOT
    / "cards_mse/01_pre_alpha/01_legend_of_alpha/01_YGO_Legend_of_Alpha.mse-set"
)
TRAP_CARDS = (
    ROOT / "cards_mse/00_drafts/00_non_archetype/00_YGO_Non_Archetype.mse-set/card breakthrough skill",
    ROOT / "cards_mse/00_drafts/00_non_archetype/00_YGO_Non_Archetype.mse-set/card compulsory evacuation device",
    ACTIVE / "card karma cut",
    ROOT / "cards_mse/00_drafts/00_non_archetype/00_YGO_Non_Archetype.mse-set/card phoenix wing wind blast",
    ROOT / "cards_mse/00_drafts/00_non_archetype/00_YGO_Non_Archetype.mse-set/card torrential tribute",
    ACTIVE / "card burning abyss - fire lake",
    ACTIVE / "card burning abyss - traveler",
    ROOT / "cards_mse/00_drafts/01_burning_abyss/01_YGO_Burning_Abyss.mse-set/card fiend griefing",
)


class TrapSupertypeTests(unittest.TestCase):
    def test_trap_cards_use_supertype_without_old_keyword(self) -> None:
        for card_path in TRAP_CARDS:
            with self.subTest(card=card_path.name):
                card = card_path.read_text(encoding="utf-8-sig")
                self.assertIn("super_type: <word-list-type-en>Trap Instant</word-list-type-en>", card)
                self.assertRegex(card, r"(?m)^\tsub_type:(?: <word-list-spell></word-list-spell>)?\s*$")
                self.assertNotIn("<b>Trap</b>", card)

    def test_trap_references_use_current_english_vocabulary(self) -> None:
        rafflesia = (ROOT / "cards_mse/00_drafts/00_non_archetype/00_YGO_Non_Archetype.mse-set/card traptrix rafflesia").read_text(encoding="utf-8-sig")
        self.assertIn("<i>2 Creatures MV 1</i>", rafflesia)
        self.assertIn("<b>Send</b> 1 Trap from your Deck to Grave", rafflesia)
        self.assertNotIn("error-spelling", rafflesia)

        back_jack = (ROOT / "cards_mse/00_drafts/01_burning_abyss/01_YGO_Burning_Abyss.mse-set/card absolute king back jack").read_text(encoding="utf-8-sig")
        self.assertIn("If it is a Trap, <b>Set</b> the card face down on the Field", back_jack)
        self.assertIn("you may <b>Cast</b> it this turn", back_jack)

    def test_rules_preserve_trap_contract(self) -> None:
        rules = (ROOT / "docs/rules/CARD_TYPES.md").read_text(encoding="utf-8-sig")
        self.assertIn("## Trap", rules)
        self.assertIn("`Trap Instant`", rules)
        self.assertIn("cast from Field", rules)

        generator = (ROOT / ".script/create_archetype_projects.py").read_text(encoding="utf-8-sig")
        self.assertIn("Retired", generator)
        self.assertNotIn("shutil.copy2", generator)
        self.assertFalse((ROOT / "mse").exists())


if __name__ == "__main__":
    unittest.main()

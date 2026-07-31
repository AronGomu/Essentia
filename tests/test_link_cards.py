from __future__ import annotations

import unittest
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
PROJECT = REPO_ROOT / "cards_mse/00_drafts/08_link_staples/08_YGO_Staples_Link.mse-set"
UPDATED_CARDS = {
    "card accesscode talker": (
        "casting_cost: RRWW",
        "super_type: <word-list-type-en>Link Lvl 4 Creature</word-list-type-en>",
        "Haste",
        "<b>On Link Summon</b>",
        "power: 4",
        "toughness: 4",
    ),
    "card apollousa bow of the goddess": (
        "casting_cost: UUGG",
        "super_type: <word-list-type-en>Legendary Link Lvl 4 Creature</word-list-type-en>",
        "<b>On Link Summon</b>",
        "power: 0",
        "toughness: 0",
    ),
    "card borrelsword dragon": (
        "casting_cost: RRWW",
        "super_type: <word-list-type-en>Link Lvl 4 Creature</word-list-type-en>",
        "<b>On Blocked</b>",
        "power: 6",
        "toughness: 6",
    ),
}
CARD_CONTENT_FIELDS = (
    "casting_cost:",
    "super_type:",
    "sub_type:",
    "rarity:",
    "rule_text:",
    "flavor_text:",
    "power:",
    "toughness:",
    "card_code_text:",
    "card_code_text_2:",
    "card_code_text_3:",
)


class LinkCardContentTests(unittest.TestCase):
    def test_updated_cards_have_requested_content(self) -> None:
        for filename, expected_fragments in UPDATED_CARDS.items():
            with self.subTest(filename=filename):
                text = (PROJECT / filename).read_text(encoding="utf-8-sig")
                for fragment in expected_fragments:
                    self.assertIn(fragment, text)

    def test_cherubini_is_removed_from_link_project(self) -> None:
        set_text = (PROJECT / "set").read_text(encoding="utf-8-sig")
        self.assertNotIn("cherubini ebon angel", set_text.casefold())
        self.assertFalse((PROJECT / "card cherubini ebon angel of the burning abyss").exists())
        self.assertFalse((PROJECT / "mse_images" / "image20.png").exists())
        self.assertFalse((PROJECT / "original_images").exists())
        self.assertTrue(
            (
                REPO_ROOT
                / "original_images"
                / "Link"
                / "Cherubini, Ebon Angel of the Burning Abyss.jpg"
            ).is_file()
        )
        batch_script = (REPO_ROOT / ".script" / "add_staples_batch.py").read_text(
            encoding="utf-8-sig"
        )
        self.assertNotIn("Cherubini, Ebon Angel of the Burning Abyss", batch_script)

    def test_other_link_cards_only_keep_name_and_non_content_metadata(self) -> None:
        other_cards = [
            path for path in PROJECT.glob("card *") if path.name not in UPDATED_CARDS
        ]
        self.assertEqual(len(other_cards), 26)
        for card_path in other_cards:
            with self.subTest(card=card_path.name):
                text = card_path.read_text(encoding="utf-8-sig")
                self.assertIn("\n\tname:", text)
                for field in CARD_CONTENT_FIELDS:
                    self.assertNotIn(f"\n\t{field}", text)

    def test_link_summon_keyword_is_documented(self) -> None:
        events = (REPO_ROOT / "docs/keywords/EVENTS.md").read_text(
            encoding="utf-8-sig"
        )
        self.assertIn("**On Link Summon**", events)
        self.assertIn("Link Creature enters via own Link Summon", events)


if __name__ == "__main__":
    unittest.main()

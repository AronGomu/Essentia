from __future__ import annotations

import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PROJECT = ROOT / "cards_mse/00_drafts/00_non_archetype/00_YGO_Non_Archetype.mse-set"
ACTIVE = (
    ROOT
    / "cards_mse/01_alpha/LOTA-0001-Alpha_0.1/01_YGO_Legend_of_the_Alpha.mse-set"
)

# Hand-trap staples moved into active development with Legend of Alpha.
ACTIVE_EXPECTED_CARDS = {
    "card ash blossom  joyous spring": (
        "name: Ash Blossom & Joyous Spring",
        "casting_cost: R",
        "super_type: <word-list-type-en>Tuner Creature</word-list-type-en>",
        "sub_type: <word-list-race-en>Zombie</word-list-race-en>",
        "(1 - Activated",
        "Flash",
        "Hard)",
        "<b>Counter</b> it",
        "power: 0",
        "toughness: 4",
    ),
    "card d.d. crow": (
        "name: D.D. Crow",
        "casting_cost: B",
        "sub_type: <word-list-race-en>Bird</word-list-race-en>",
        "(1 - Activated",
        "<b>Target</b> 1 card in any Grave; <b>Exile</b> it",
    ),
    "card effect veiler": (
        "name: Effect Veiler",
        "casting_cost: W",
        "sub_type: <word-list-race-en>Wizard</word-list-race-en>",
        "it loses all abilities, and <b>Counter</b> all its abilities on Stack",
    ),
    "card maxx c": (
        "name: Maxx “C”",
        "casting_cost: G",
        "sub_type: <word-list-race-en>Insect</word-list-race-en>",
        "<b>Draw</b> 1 <b>On Opponent Creature Enter</b>",
    ),
}

DRAFT_EXPECTED_CARDS = {
    "card black rose dragon": (
        "name: Black Rose Dragon",
    ),
}


class NonArchetypeCreatureTests(unittest.TestCase):
    def test_active_dev_staples_match_english_contract(self) -> None:
        for filename, fragments in ACTIVE_EXPECTED_CARDS.items():
            with self.subTest(filename=filename):
                text = (ACTIVE / filename).read_text(encoding="utf-8-sig")
                for fragment in fragments:
                    self.assertIn(fragment, text)
                self.assertNotIn("error-spelling", text)
                self.assertFalse((PROJECT / filename).exists())

    def test_draft_non_archetype_keeps_unpromoted_cards(self) -> None:
        set_text = (PROJECT / "set").read_text(encoding="utf-8-sig")
        includes = {
            line.removeprefix("include_file: ")
            for line in set_text.splitlines()
            if line.startswith("include_file: ")
        }
        self.assertEqual(len(includes), 75)
        self.assertTrue(set(DRAFT_EXPECTED_CARDS).issubset(includes))
        self.assertTrue(set(ACTIVE_EXPECTED_CARDS).isdisjoint(includes))
        self.assertIn("set_language: EN", set_text)
        self.assertIn("card_language: English", set_text)
        for filename, fragments in DRAFT_EXPECTED_CARDS.items():
            text = (PROJECT / filename).read_text(encoding="utf-8-sig")
            for fragment in fragments:
                self.assertIn(fragment, text)

    def test_on_opponent_creature_enter_is_documented(self) -> None:
        events = (ROOT / "docs/keywords/EVENTS.md").read_text(encoding="utf-8-sig")
        self.assertIn("**On Opponent Creature Enter**", events)
        self.assertIn("opponent control", events)

    def test_retired_generator_cannot_restore_card_data(self) -> None:
        self.assertFalse((ROOT / "mse").exists())
        generator = (ROOT / ".script/create_archetype_projects.py").read_text(encoding="utf-8-sig")
        self.assertIn("Retired", generator)
        self.assertIn("Folder-form projects", generator)

    def test_all_image_references_resolve(self) -> None:
        for filename in ACTIVE_EXPECTED_CARDS:
            text = (ACTIVE / filename).read_text(encoding="utf-8-sig")
            image = next(line.split(": ", 1)[1] for line in text.splitlines() if line.startswith("\timage: "))
            self.assertTrue((ACTIVE / image).is_file(), image)


if __name__ == "__main__":
    unittest.main()

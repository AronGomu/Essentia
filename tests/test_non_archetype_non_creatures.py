from __future__ import annotations

import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PROJECT = ROOT / "cards_mse/00_drafts/00_non_archetype/00_YGO_Non_Archetype.mse-set"
ACTIVE = (
    ROOT
    / "cards_mse/01_alpha/LOTA-0001-Alpha_0.1/01_YGO_Legend_of_the_Alpha.mse-set"
)

DRAFT_EXPECTED = {
    "card allure of darkness": ("<b>Draw</b> 2 cards", "<b>Exile</b> 1 black card"),
    "card book of eclipse": ("Turn all Creatures face down",),
    "card breakthrough skill": ("Target Creature loses all its abilities", "from your Grave"),
    "card compulsory evacuation device": ("<b>Target</b> 1 nonland permanent", "<b>Bounce</b> the target"),
    "card instant fusion": ("Pay 3 LP", "MV 1 or less", "ignoring the restrictions of summon"),
    "card monster reborn": ("in 1 Grave", "<b>Reanimate</b> it"),
    "card mystical space typhoon": ("<b>Target</b> 1 nonland non-Creature permanent; <b>Destroy</b> the target",),
    "card phoenix wing wind blast": ("<b>Discard</b> 1", "<b>Target</b> 1 nonland permanent", "on top of Deck"),
    "card raigeki": ("<b>Destroy</b> all Creatures your opponents control",),
    "card super polymerization": ("<b>Fusion Summon</b>",),
    "card torrential tribute": ("<b>Cast</b> this Spell only if 1 Creature has entered", "<b>Destroy</b> all Creatures"),
    "card twin twisters": ("<b>Discard</b> 1 card", "<b>Target</b> 0–2 nonland non-Creature permanents; <b>Destroy</b> the targets"),
    "card upstart goblin": ("<b>Draw</b> 1 card", "Alternative Cost"),
}

ACTIVE_EXPECTED = {
    "card book of moon": (
        "<b>Alternative Cost</b>",
        "If you control no Creature, you may <b>Cast</b> this Spell without paying its mana cost.",
        "<b>Target</b> 1 Creature; turn the target face down.",
    ),
    "card dark hole": ("<b>Destroy</b> all Creatures",),
    "card foolish burial": ("<b>Send</b> 1 Creature from Deck to Grave",),
    "card karma cut": ("<b>Discard</b> 1", "<b>Target</b> 1 Creature", "<b>Exile</b> the target"),
}


def rule_block(text: str) -> str:
    match = re.search(r"(?ms)^\trule_text:(?:\n(?P<body>(?:\t\t.*\n)+?)|(?P<inline>.*)\n)(?=^\tflavor_text:)", text)
    if not match:
        return ""
    return match.group("body") if match.group("body") is not None else (match.group("inline") or "")


class NonArchetypeNonCreatureTests(unittest.TestCase):
    def test_manifest_references_every_noncreature_once(self) -> None:
        set_text = (PROJECT / "set").read_text(encoding="utf-8-sig")
        includes = [
            line.removeprefix("include_file: ")
            for line in set_text.splitlines()
            if line.startswith("include_file: ")
        ]
        self.assertEqual(
            [name for name in includes if name in DRAFT_EXPECTED],
            sorted(DRAFT_EXPECTED),
        )
        self.assertTrue(set(ACTIVE_EXPECTED).isdisjoint(includes))
        self.assertEqual(len(includes), len(set(includes)))

    def test_every_card_uses_english_rule_contract(self) -> None:
        stale = ("library", "graveyard", "GYD", "battlefield", "Résolution", "Déclenchable")
        for filename, fragments in DRAFT_EXPECTED.items():
            with self.subTest(filename=filename):
                text = (PROJECT / filename).read_text(encoding="utf-8-sig")
                self.assertEqual(text.count("(1 - Resolution)"), 1)
                for fragment in fragments:
                    self.assertIn(fragment, text)
                body = rule_block(text)
                self.assertTrue(body)
                for term in stale:
                    self.assertNotIn(term, body)
                self.assertNotIn("error-spelling", body)
                self.assertIn("\tsub_type: <word-list-spell></word-list-spell>", text)
        for filename, fragments in ACTIVE_EXPECTED.items():
            with self.subTest(filename=filename, stage="alpha"):
                text = (ACTIVE / filename).read_text(encoding="utf-8-sig")
                for fragment in fragments:
                    self.assertIn(fragment, text)

    def test_fusion_actions_use_current_types_and_keywords(self) -> None:
        instant = (PROJECT / "card instant fusion").read_text(encoding="utf-8-sig")
        self.assertIn("super_type: <word-list-type-en>Sorcery</word-list-type-en>", instant)
        self.assertIn("<b>Summon</b>", instant)
        self.assertIn("ignoring the restrictions of summon", instant)

        super_poly = (PROJECT / "card super polymerization").read_text(encoding="utf-8-sig")
        self.assertIn("super_type: <word-list-type-en>Fusion Summon Instant</word-list-type-en>", super_poly)
        self.assertIn("<b>Fusion Summon</b>", super_poly)

    def test_all_image_references_resolve(self) -> None:
        for filename in DRAFT_EXPECTED:
            text = (PROJECT / filename).read_text(encoding="utf-8-sig")
            image = next(
                line.split(": ", 1)[1]
                for line in text.splitlines()
                if line.startswith("\timage: ")
            )
            self.assertTrue((PROJECT / image).is_file(), image)
        for filename in ACTIVE_EXPECTED:
            text = (ACTIVE / filename).read_text(encoding="utf-8-sig")
            image = next(
                line.split(": ", 1)[1]
                for line in text.splitlines()
                if line.startswith("\timage: ")
            )
            self.assertTrue((ACTIVE / image).is_file(), image)


if __name__ == "__main__":
    unittest.main()

from __future__ import annotations

import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PROJECT = ROOT / "cards_mse/00_drafts/04_spellbook/04_YGO_Spellbook.mse-set"
DOCS = ROOT / "docs/04_spellbook"

BOOK_AFFINITY = "<b>Book Affinity</b>"
SPELL_AFFINITY = "<b>Spell Affinity</b>"

EXPECTED_RULES = {
    "card high priestess of prophecy": ("<b>Alternative Cost</b>", "<b>Reveal</b> 3 non-Creature <i-auto>“Spellbook”</i-auto> from Hand", "<b>Exile</b> 1 <i-auto>“Spellbook”</i-auto> from Hand or Grave"),
    "card justice of prophecy": ("<b>On End Step</b>", "If 1 non-Creature <i-auto>“Spellbook”</i-auto> was cast this turn", "<b>Search</b> 1 <i-auto>“Spellbook”</i-auto>"),
    "card spellbook library of the crescent": ("If you control 1 Wizard MV 2+", "<b>Reveal</b> 3 <i-auto>“Spellbook”</i-auto> from Deck", "Put the chosen card into Hand"),
    "card spellbook magician of prophecy": ("<b>Alternative Cost</b>", "If you <b>Cast</b> 1 non-Creature <i-auto>“Spellbook”</i-auto> this turn", "<b>On Enter</b>", "<b>Search</b> 1 <i-auto>“Spellbook”</i-auto>"),
    "card spellbook of eternity": ("<b>Target</b> 1 <i-auto>“Spellbook”</i-auto> from Exile", "<b>Reclaim</b> the target"),
    "card spellbook of fate": ("<b>Exile</b> 1–3 <i-auto>“Spellbook”</i-auto> from Grave", "2 — <b>Bounce</b> 1 nonland permanent", "3 — <b>Exile</b> 1 nonland permanent"),
    "card spellbook of judgment": ("<b>This turn On End Step</b>", "<b>Search</b> 0–(X−2) <i-auto>“Spellbook”</i-auto>", "non-Creature <i-auto>“Spellbook”</i-auto> cast this turn", "<b>Summon</b> 1 <i-auto>“Spellbook”</i-auto> Creature MV X or less from Deck"),
    "card spellbook of knowledge": ("<b>Sacrifice</b> 1 <i-auto>“Spellbook”</i-auto> or <b>Discard</b> 1 <i-auto>“Spellbook”</i-auto>; <b>Draw</b> 2",),
    "card spellbook of life": ("<b>Target</b> 1 Wizard Creature MV X in Grave", "choose X non-Creature <i-auto>“Spellbook”</i-auto> from Grave", "<b>Reanimate</b> it, if you do, <b>Exile</b> the chosen cards"),
    "card spellbook of miracles": ("<b>Target</b> 1 Wizard in Grave and 0–2 non-Creature <i-auto>“Spellbook”</i-auto> in Exile", "<b>Reanimate</b> the Wizard", "<b>Attach</b> the targeted <i-auto>“Spellbook”</i-auto> to it"),
    "card spellbook of power": ("<b>Target</b> 1 <i-auto>“Spellbook”</i-auto>; to end turn, the target gets +2/+2", "<b>Search</b> 1 <i-auto>“Spellbook”</i-auto>"),
    "card spellbook of secrets": ("<b>Search</b> 1 <i-auto>“Spellbook”</i-auto>",),
    "card spellbook of the master": ("<b>Reveal</b> 1 other <i-auto>“Spellbook”</i-auto> from Hand", "<b>Target</b> 1 <i-auto>“Spellbook”</i-auto> from Grave", "copy the target's Resolution effect and resolve it"),
    "card spellbook of wisdom": ("it gains <b>Protection from everything</b> to end turn",),
    "card spellbook star hall": ("<b>On Cast <i-auto>“Spellbook”</i-auto></b>", "<b>On Leave Field</b>", "<b>Search</b> 1 <i-auto>“Spellbook”</i-auto> Creature MV X or less"),
    "card the grand spellbook tower": ("<b>On Upkeep</b>", "put 1 <i-auto>“Spellbook”</i-auto> from Grave on the bottom of Deck", "<b>On Leave Field</b>", "<b>Summon</b> 1 <i-auto>“Spellbook”</i-auto> Creature from Deck"),
}

SPELL_AFFINITY_CARDS = {
    "card spellbook library of the crescent",
    "card spellbook of eternity",
    "card spellbook of fate",
    "card spellbook of knowledge",
    "card spellbook of life",
    "card spellbook of miracles",
    "card spellbook of power",
    "card spellbook of secrets",
    "card spellbook of the master",
    "card spellbook of wisdom",
}

RESOLUTION_HARD_CARDS = SPELL_AFFINITY_CARDS - {"card spellbook library of the crescent"} | {
    "card spellbook of judgment"
}


class SpellbookCardTests(unittest.TestCase):
    def test_manifest_is_sorted_complete_and_english(self) -> None:
        set_text = (PROJECT / "set").read_text(encoding="utf-8-sig")
        includes = re.findall(r"(?m)^include_file:\s*(.+)$", set_text)
        self.assertEqual(includes, sorted(EXPECTED_RULES))
        self.assertEqual(len(includes), 16)
        self.assertIn("title: Essentia -- Spellbook", set_text)
        self.assertIn("set_language: EN", set_text)
        self.assertIn("card_language: English", set_text)

    def test_every_card_uses_current_english_templating(self) -> None:
        stale = re.compile(r"\b(?:library|graveyard|mana value|Magicien|Révélez|cible|cherchez|mettez)\b|error-spelling", re.I)
        for filename, fragments in EXPECTED_RULES.items():
            with self.subTest(filename=filename):
                text = (PROJECT / filename).read_text(encoding="utf-8-sig")
                rule_text = text.split("\trule_text:\n", 1)[1].split("\tflavor_text:", 1)[0]
                for fragment in fragments:
                    self.assertIn(fragment, rule_text)
                self.assertNotRegex(rule_text, stale)
                self.assertNotIn(BOOK_AFFINITY, rule_text)
                if filename in SPELL_AFFINITY_CARDS:
                    self.assertIn(SPELL_AFFINITY, rule_text)
                else:
                    self.assertNotIn(SPELL_AFFINITY, rule_text)
                if filename in RESOLUTION_HARD_CARDS:
                    self.assertEqual(rule_text.count("(1 - Resolution Hard)"), 1)
                elif filename == "card spellbook library of the crescent":
                    self.assertEqual(rule_text.count("(1 - Resolution)"), 1)

    def test_types_and_subtypes_are_english(self) -> None:
        for filename in (
            "card high priestess of prophecy",
            "card justice of prophecy",
            "card spellbook magician of prophecy",
        ):
            text = (PROJECT / filename).read_text(encoding="utf-8-sig")
            subtype = next(line.removeprefix("\tsub_type: ") for line in text.splitlines() if line.startswith("\tsub_type: "))
            self.assertEqual(" ".join(re.sub(r"<[^>]+>", "", subtype).split()), "Wizard Spellbook")
        tower = (PROJECT / "card the grand spellbook tower").read_text(encoding="utf-8-sig")
        subtype = next(line.removeprefix("\tsub_type: ") for line in tower.splitlines() if line.startswith("\tsub_type: "))
        self.assertEqual(" ".join(re.sub(r"<[^>]+>", "", subtype).split()), "Land")

    def test_archetype_docs_keep_affinity_rules_not_card_blocks(self) -> None:
        context = (DOCS / "CONTEXT.md").read_text(encoding="utf-8-sig")
        rules = (DOCS / "RULES.md").read_text(encoding="utf-8-sig")
        keywords = (DOCS / "KEYWORDS.md").read_text(encoding="utf-8-sig")
        self.assertIn("**Book Affinity** is retired", rules)
        self.assertIn("**Alternative Cost**", rules)
        self.assertIn("**Spell Affinity**", keywords)
        self.assertIn("printed opt-in keyword", rules)
        self.assertIn("cards_mse/00_drafts/04_spellbook/04_YGO_Spellbook.mse-set", context)
        self.assertNotIn("\nCreature — Wizard Spellbook\n", context + rules + keywords)

    def test_retired_generator_cannot_overwrite_canonical_project(self) -> None:
        generator = (ROOT / ".script/create_archetype_projects.py").read_text(encoding="utf-8-sig")
        self.assertIn("Retired", generator)
        self.assertIn("Folder-form projects", generator)
        self.assertNotIn("shutil.rmtree", generator)
        self.assertFalse((ROOT / "mse").exists())

    def test_all_images_resolve(self) -> None:
        for filename in EXPECTED_RULES:
            text = (PROJECT / filename).read_text(encoding="utf-8-sig")
            image = next(line.split(": ", 1)[1] for line in text.splitlines() if line.startswith("\timage: "))
            self.assertTrue((PROJECT / image).is_file(), image)


if __name__ == "__main__":
    unittest.main()

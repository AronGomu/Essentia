from __future__ import annotations

import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PROJECT = ROOT / "cards_mse/00_drafts/01_burning_abyss/01_YGO_Burning_Abyss.mse-set"
ACTIVE = (
    ROOT
    / "cards_mse/01_alpha/LOTA-0001-Alpha_0.1/01_YGO_Legend_of_the_Alpha.mse-set"
)
DOCS = ROOT / "docs/01_burning_abyss"


class BurningAbyssCardTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.set_text = (PROJECT / "set").read_text(encoding="utf-8-sig")
        cls.includes = re.findall(r"(?m)^include_file:\s*(.+)$", cls.set_text)

    def test_manifest_has_complete_unique_card_graph(self) -> None:
        self.assertEqual(len(self.includes), 13)
        self.assertEqual(len(set(self.includes)), 13)
        self.assertEqual({path.name for path in PROJECT.glob("card *")}, set(self.includes))
        self.assertIn("title: Essentia -- Burning Abyss", self.set_text)
        self.assertIn("set_language: EN", self.set_text)
        self.assertIn("card_language: English", self.set_text)

    def test_images_and_collection_numbers_resolve(self) -> None:
        for index, include in enumerate(self.includes, 1):
            with self.subTest(card=include):
                text = (PROJECT / include).read_text(encoding="utf-8-sig")
                image_match = re.search(r"(?m)^\timage:\s*(.*)$", text)
                self.assertIsNotNone(image_match)
                if image_match and image_match.group(1).strip():
                    self.assertTrue((PROJECT / image_match.group(1).strip()).is_file())
                codes = re.findall(r"(?m)^\tcard_code_text(?:_\d+)?:\s*(.+)$", text)
                self.assertTrue(codes)
                for code in codes:
                    self.assertRegex(code, rf"^{index:03d}/013 [CURM]$")

    def test_representative_card_mechanics_are_preserved(self) -> None:
        expected = {
            "card burning abyss - cherubini": (
                "name: Burning Abyss - Cherubini",
                "super_type: <word-list-type-en>Link Lvl 2 Creature</word-list-type-en>",
                "<i>2 Creatures MV 1</i>",
                "<b>Send</b> 1 Creature with MV 1 from Deck to Grave",
            ),
            "card burning abyss - dante pilgrim": (
                "<b><kw-a><nospellcheck><key>Hexproof</key></nospellcheck></kw-a></b>",
                "<b>On Destroy</b>",
                "they <b>Discard</b> 1 at random",
            ),
            "card burning abyss - good  evil": (
                "<b>Ritual Summon</b>",
                "<b>Exile from Grave</b> and <b>Discard</b> 1 <i-auto>“Burning Abyss”</i-auto> Creature",
            ),
            "card burning abyss - terminus": (
                "<b>Fusion Summon</b>",
                "the target gains +2/+2 until the end of the opponent’s next turn",
            ),
        }
        for card, fragments in expected.items():
            text = (PROJECT / card).read_text(encoding="utf-8-sig")
            for fragment in fragments:
                with self.subTest(card=card, fragment=fragment):
                    self.assertIn(fragment, text)

    def test_active_dev_ba_mechanics_live_in_alpha_package(self) -> None:
        expected = {
            ACTIVE / "card burning abyss - dante": (
                "name: Burning Abyss - Dante",
            ),
            ACTIVE / "card burning abyss - farfa": (
                "<b>Slow Blink 1 Any Creature</b>",
            ),
            ACTIVE / "card burning abyss - draghig": (
                "<b>On Send Grave</b> — <b>Discard</b>",
            ),
            ACTIVE / "card leviair the sea dragon": (
                "<b>Target</b> 1 exiled",
                "<b>Release</b> it",
            ),
            ROOT
            / "cards_mse/00_drafts/00_non_archetype/00_YGO_Non_Archetype.mse-set"
            / "card aa zeus sky thunder": (
                "<i>2 creatures MV 4</i>",
                "Xyz Alternative Cost",
            ),
        }
        for path, fragments in expected.items():
            text = path.read_text(encoding="utf-8-sig")
            for fragment in fragments:
                with self.subTest(card=path.name, fragment=fragment):
                    self.assertIn(fragment, text)

    def test_draghig_rule_text_matches_spec(self) -> None:
        text = (ACTIVE / "card burning abyss - draghig").read_text(encoding="utf-8-sig")
        expected_lines = (
            "\t\t<i-auto>(1 - Static)</i-auto> <b>Abyssal Curse</b>",
            "\t\t<i-auto>(2 - Activated Hard Linked)</i-auto> <b>Descent</b>",
            "\t\t<i-auto>(3 - Triggered Hard Linked)</i-auto> <b>On Send Grave</b> — "
            "<b>Discard</b> <sym-auto>1</sym-auto>, then <b>Draw</b> 1.",
        )
        last_index = -1
        for line in expected_lines:
            index = text.find(line)
            self.assertGreater(index, last_index, f"line out of order or missing: {line!r}")
            last_index = index

    def test_trap_and_extra_deck_types_use_current_contract(self) -> None:
        trap = (ACTIVE / "card burning abyss - fire lake").read_text(encoding="utf-8-sig")
        self.assertIn("super_type: <word-list-type-en>Trap Instant</word-list-type-en>", trap)
        self.assertIn("sub_type:", trap)
        self.assertNotIn("sub_type: <word-list-race-en>Trap", trap)
        for name in (
            "card beatrice lady of the eternal",
            "card burning abyss - dante",
            "card downerd magician",
            "card leviair the sea dragon",
        ):
            root = PROJECT if name == "card beatrice lady of the eternal" else ACTIVE
            text = (root / name).read_text(encoding="utf-8-sig")
            self.assertIn("super_type: <word-list-type-en>Xyz Creature</word-list-type-en>", text)

    def test_accepted_general_rules_are_documented_in_english(self) -> None:
        actions = (ROOT / "docs/keywords/ACTIONS.md").read_text(encoding="utf-8-sig")
        events = (ROOT / "docs/keywords/EVENTS.md").read_text(encoding="utf-8-sig")
        context = (DOCS / "CONTEXT.md").read_text(encoding="utf-8-sig")
        design = (DOCS / "DESIGN.md").read_text(encoding="utf-8-sig")
        self.assertIn("### Summon / Hand Summon", actions)
        self.assertIn("### Salvage / Reclaim / Release", actions)
        self.assertIn("**On Opponent Creature Enter**", events)
        self.assertIn("Card-by-card values live only in MSE", context)
        self.assertIn("Aristocrats / Graveyard / Value", design)

    def test_skills_reject_illegal_summon_bypass(self) -> None:
        for relative in (
            ".agents/skills/add-ygo-card/SKILL.md",
            ".agents/skills/update-card-from-ai/SKILL.md",
            ".agents/skills/fix-mse-cards/SKILL.md",
            ".agents/skills/normalize-card-formatting/SKILL.md",
        ):
            with self.subTest(skill=relative):
                text = (ROOT / relative).read_text(encoding="utf-8-sig")
                self.assertIn("Summon", text)
                self.assertRegex(text, r"(?i)illegal|incorrect|not.*proper|does not.*proper")
                self.assertRegex(text, r"(?i)user|review|decision|confirmation")

    def test_retired_sync_cannot_overwrite_canonical_project(self) -> None:
        script = (ROOT / ".script/sync_burning_abyss_from_mse.py").read_text(encoding="utf-8-sig")
        self.assertIn("Retired", script)
        self.assertIn("canonical MSE project", script)
        self.assertNotIn("shutil.copy2", script)

    def test_render_directory_has_expected_outputs(self) -> None:
        render_dir = PROJECT / "render"
        renders = list(render_dir.glob("*.png"))
        self.assertEqual(len(renders), len(self.includes))


if __name__ == "__main__":
    unittest.main()

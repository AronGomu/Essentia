#!/usr/bin/env python3
"""Regenerate accepted keyword inventory evidence from current drafts.

Manifest-only. Orphan card files and immutable historical versions are excluded.
"""

from __future__ import annotations

import collections
import re
from pathlib import Path

import lint_mse_card_style as style

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "docs" / "ADR" / "accepted" / "0005-keyword-inventory-evidence.md"
DRAFTS_ROOT = ROOT / "cards_mse" / "00_drafts"

EVERGREEN = {
    "Flying",
    "Trample",
    "Vigilance",
    "Haste",
    "Double Strike",
    "Hexproof",
    "Indestructible",
    "Effect Indestructible",
    "Protection from everything",
    "Protection from Creatures",
}
ARCHETYPE = {
    "Abyssal Curse",
    "Descent",
    "Shaddoll Recovery",
    "Nekroz Recovery",
    "Spell Affinity",
}


def classify(keyword: str) -> str:
    if (
        keyword in style.ACTION_WORDS
        or keyword in {"Hand Summon", "Ritual Summon", "Fusion Summon", "Negate & Destroy"}
        or re.fullmatch(r"(?:Detach|Mill|Scry) (?:\d+|X|\d+–\d+)", keyword)
        or keyword.startswith("Slow Blink ")
        or (keyword.startswith("Detach ") and " and Mill " in keyword)
    ):
        return "ACTION"
    if keyword.startswith("On ") or keyword.startswith("This turn On ") or keyword == "Flip":
        return "EVENT"
    if "Alternative Cost" in keyword or keyword == "Exile from Grave" or (keyword.startswith("Exile ") and keyword.endswith(" from Grave")):
        return "COST/PROCEDURE"
    if keyword in EVERGREEN or keyword in ARCHETYPE or keyword.startswith(("Ward ", "Bounded ")):
        return "ABILITY"
    if keyword in style.KNOWN_KEYWORDS or any(pattern.fullmatch(keyword) for pattern in style.KEYWORD_PATTERNS):
        return "ABILITY"
    raise ValueError(f"unmapped keyword taxonomy: {keyword}")


def collect(projects_root: Path = DRAFTS_ROOT) -> tuple[int, collections.Counter[str], dict[str, str]]:
    counts: collections.Counter[str] = collections.Counter()
    evidence: dict[str, str] = {}
    cards = list(style.card_paths(projects_root))
    for card in cards:
        _name, rules = style.extract_rule_lines(card)
        for line_number, text in rules:
            for match in re.finditer(r"<b>(.*?)</b>", text):
                keyword = style.strip_markup(match.group(1)).strip()
                counts[keyword] += 1
                evidence.setdefault(keyword, f"{card.relative_to(ROOT).as_posix()}:{line_number}")
    return len(cards), counts, evidence


def render(card_count: int, counts: collections.Counter[str], evidence: dict[str, str]) -> str:
    lines = [
        "# Keyword inventory — canonical English MSE cards",
        "",
        f"Generated from {card_count} manifest-included draft cards under `cards_mse/00_drafts/`.",
        "",
        "Controlling rules: `docs/KEYWORDS.md` plus linked keyword modules. Enforcement: `python .script/lint_mse_card_style.py`.",
        "",
        "## Closed formatting contract",
        "",
        "- Bold only documented action, ability, event, and cost/procedure keywords.",
        "- Capitalize standalone location/type terms (`Hand`, `Field`, `Deck`, `Grave`, `Exile`, `Sideboard`, `Stack`, `Creature(s)`, `Spell(s)`) without bold.",
        "- Italicize full self-names without quotes; italicize name fragments/non-self names inside typographic quotes.",
        "- Keep ability metadata inside italic prefixes, not bold.",
        "- Bold complete atomic compounds, including required arguments/connectors.",
        "",
        "## Current bold inventory",
        "",
        "| Hits | Phrase | Class | First evidence |",
        "|---:|---|---|---|",
    ]
    for keyword, hits in counts.most_common():
        lines.append(f"| {hits} | `{keyword}` | {classify(keyword)} | `{evidence[keyword]}` |")
    lines.extend(
        [
            "",
            "## Audit result",
            "",
            f"- Unique bold phrases: {len(counts)}.",
            f"- Total bold invocations: {sum(counts.values())}.",
            "- Standalone bold zones: 0.",
            "- Unknown bold phrases: 0.",
            "- Unitalicized detected name references: 0.",
            "- Open doubtful words: 0; decisions recorded in `docs/ADR/accepted/0005-keyword-taxonomy-and-markup.md`.",
            "",
        ]
    )
    return "\n".join(lines)


def generate(projects_root: Path = DRAFTS_ROOT, output: Path = OUTPUT) -> int:
    findings = style.lint(projects_root)
    if findings:
        for finding in findings:
            print(finding.render())
        print(f"refusing inventory generation: {len(findings)} style violation(s)")
        return 1
    card_count, counts, evidence = collect(projects_root)
    output.write_text(render(card_count, counts, evidence), encoding="utf-8")
    print(f"wrote {output} ({card_count} cards, {len(counts)} phrases, {sum(counts.values())} uses)")
    return 0


def main() -> int:
    return generate()


if __name__ == "__main__":
    raise SystemExit(main())

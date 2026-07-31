#!/usr/bin/env python3
"""Lint manifest-included MSE rules-text typography across lifecycle stages.

Read-only. Mutable and immutable stages are safe inputs.
"""

from __future__ import annotations

import argparse
import re
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

ROOT = Path(__file__).resolve().parents[1]
PROJECTS_ROOT = ROOT / "cards_mse"
TAG_RE = re.compile(r"<[^>]+>")
TOKEN_RE = re.compile(r"(<[^>]+>)")
QUOTED_NAME_RE = re.compile(r"“[^“”]+”")
NAME_FRAGMENTS = ("Burning Abyss", "Shaddoll", "Nekroz", "Spellbook", "Lyrilusc")
CONJUGATED_ACTION_FORMS = {
    "Discarded": "discarded",
    "Exiled": "exiled",
    "Searched": "searched",
    "Summoned": "summoned",
    "Reanimated": "reanimated",
    "Salvaged": "salvaged",
    "Reclaimed": "reclaimed",
    "Released": "released",
    "Attached": "attached",
    "Bounced": "bounced",
    "Negated": "negated",
    "Drawn": "drawn",
    "Targeted": "targeted",
    "Countered": "countered",
    "Returned": "returned",
    "Destroyed": "destroyed",
    "Sent": "sent",
    "Sacrificed": "sacrificed",
    "Revealed": "revealed",
}
CONJUGATED_ACTION_RE = re.compile(r"\b(" + "|".join(CONJUGATED_ACTION_FORMS) + r")\b")
ACTION_ARGUMENT_RE = {
    "Discard": re.compile(r"\s+(?:\d+|X\b|this\b|that\b|the\b|your\b|a\b|an\b|up to\b|any\b|“[^”]+”|[A-Z][A-Za-z0-9.'’_-]+)"),
    "Exile": re.compile(r"\s+(?:it\b|them\b|this\b|that\b|the\b|all\b|any\b|one\b|up to\b|\d+|X\b|target\b|chosen\b|a\b|an\b|card\b|creature\b|“[^”]+”|[A-Z][A-Za-z0-9.'’_-]+)"),
    "Search": re.compile(r"\s+(?:\d+|X\b|\d+[–-]\d+|your\b|the\b)", re.I),
    "Summon": re.compile(r"\s+(?:\d+|X\b|this\b|that\b|the\b|a\b|an\b|any\b|up to\b|“[^”]+”|[A-Z][A-Za-z0-9.'’_-]+)"),
    "Reanimate": re.compile(r"\s+(?:it\b|them\b|this\b|that\b|the\b|target\b|\d+)", re.I),
    "Salvage": re.compile(r"\s+(?:it\b|them\b|this\b|that\b|the\b|target\b|\d+)", re.I),
    "Reclaim": re.compile(r"\s+(?:it\b|them\b|this\b|that\b|the\b|target\b|\d+)", re.I),
    "Release": re.compile(r"\s+(?:it\b|them\b|this\b|that\b|the\b|target\b|\d+)", re.I),
    "Attach": re.compile(r"\s+(?:it\b|them\b|this\b|that\b|the\b|target\b|destroyed\b|top\b|\d+)", re.I),
    "Bounce": re.compile(r"\s+(?:it\b|them\b|this\b|that\b|the\b|target\b|\d+)", re.I),
    "Negate": re.compile(r"\s+(?:it\b|them\b|this\b|that\b|the\b|target\b|\d+)", re.I),
    "Set": re.compile(r"\s+(?:it\b|them\b|this\b|that\b|the\b|target\b|\d+)", re.I),
    "Draw": re.compile(r"\s+(?:\d+|X\b|a\b|the\b)", re.I),
    "Target": re.compile(r"\s+(?:\d+|X\b|up to\b|\d+[–-]\d+)", re.I),
    "Counter": re.compile(r"\s+(?:it\b|them\b|this\b|that\b|the\b|all\b|any\b|one\b|up to\b|\d+|X\b|target\b|targeted\b)", re.I),
    "Return": re.compile(r"\s+(?:it\b|them\b|this\b|that\b|the\b|target\b|any\b|\d+|X\b)", re.I),
    "Destroy": re.compile(r"\s+(?:it\b|them\b|this\b|that\b|the\b|target\b|all\b|any\b|\d+|X\b)", re.I),
    "Send": re.compile(r"\s+(?:it\b|them\b|this\b|that\b|the\b|target\b|all\b|any\b|\d+|X\b|top\b)", re.I),
    "Cast": re.compile(r"\s+(?:it\b|them\b|this\b|that\b|the\b|a\b|an\b|any\b|\d+|X\b)", re.I),
    "Sacrifice": re.compile(r"\s+(?:it\b|them\b|this\b|that\b|the\b|all\b|any\b|up to\b|\d+|X\b|“[^”]+”|[A-Z][A-Za-z0-9.'’_-]+)"),
    "Reveal": re.compile(r"\s+(?:it\b|them\b|this\b|that\b|the\b|top\b|a\b|an\b|any\b|\d+|X\b)", re.I),
}

ACTION_WORDS = (
    "Discard",
    "Exile",
    "Search",
    "Summon",
    "Reanimate",
    "Salvage",
    "Reclaim",
    "Release",
    "Attach",
    "Bounce",
    "Negate",
    "Set",
    "Draw",
    "Target",
    "Counter",
    "Return",
    "Destroy",
    "Send",
    "Cast",
    "Sacrifice",
    "Reveal",
)
ACTION_RE = re.compile(r"\b(" + "|".join(ACTION_WORDS) + r")\b", re.IGNORECASE)
ZONE_WORDS = ("Hand", "Field", "Deck", "Grave", "Exile", "Sideboard", "Stack")
ZONE_FORMS = (*ZONE_WORDS, "Hands", "Fields", "Decks", "Graves", "Exiles", "Sideboards", "Stacks")
ZONE_RE = re.compile(r"\b(" + "|".join(ZONE_FORMS) + r")\b", re.IGNORECASE)
TYPE_WORDS = ("Creature", "Spell")
TYPE_FORMS = (*TYPE_WORDS, "Creatures", "Spells")
TYPE_RE = re.compile(r"\b(" + "|".join(TYPE_FORMS) + r")\b", re.IGNORECASE)
EXILE_ZONE_CONTEXT_RE = re.compile(r"(?:\bfrom|\bin|\binto|\bto|\bof)\s+(?:your\s+|their\s+|its\s+|that\s+|the\s+)?$", re.IGNORECASE)

ABILITY_METADATA = {
    "Static",
    "Triggered",
    "Activated",
    "Resolution",
    "Flash",
    "Sorcery",
    "Ritual",
    "Soft",
    "Hard",
    "Hard Linked",
}

KNOWN_KEYWORDS = {
    "Alternative Cost",
    "Attach",
    "Bounce",
    "Effect Indestructible",
    "Exile from Grave",
    "Flip",
    "Fusion Alternative Cost",
    "Fusion Summon",
    "Hand Summon",
    "Hexproof",
    "Indestructible",
    "Negate",
    "Negate & Destroy",
    "On Any Cast",
    "On Attack",
    "On Attack or Block",
    "On Block",
    "On Block or Blocked",
    "On Blocked",
    "On Creature you Control Destroy",
    "On Destroy",
    "On End Step",
    "On Enter",
    "On Enter Synchro",
    "On Enter or MV2+ Opponent Creature Enter",
    "MV2+ Opponent Creature Enter",
    "On Exile",
    "On Fusion Summon",
    "On Leave Field",
    "On Link Summon",
    "On Opponent Activation or Attack",
    "On Opponent Cast",
    "On Opponent Creature Enter",
    "On Opponent End Step",
    "On Opponent Upkeep",
    "On Opponent Summon",
    "On Sacrifice",
    "On Send Grave",
    "On Send Grave by Effect",
    "On Upkeep",
    "Reanimate",
    "Reclaim",
    "Release",
    "Ritual Summon",
    "Salvage",
    "Set",
    "Shaddoll Recovery",
    "Nekroz Recovery",
    "Spell Affinity",
    "Summon",
    "This turn On End Step",
    "Trample",
    "Vigilance",
    "Lifelink",
    "Menace",
    "Flash",
    "Flying",
    "Haste",
    "Double Strike",
    "Protection from everything",
    "Protection from Creatures",
    "Abyssal Curse",
    "Descent",
}
KNOWN_KEYWORDS.update(ACTION_WORDS)
KEYWORD_PATTERNS = (
    re.compile(r"Bounded \d+"),
    re.compile(r"Detach (?:\d+|X)"),
    re.compile(r"Mill (?:\d+|X|\d+–\d+)"),
    re.compile(r"Scry \d+"),
    re.compile(r"Ward \d+"),
    re.compile(r"Slow Blink \d+ Any Creature"),
    re.compile(r"Xyz Alternative Cost"),
    re.compile(r"Detach (?:\d+|X) and Mill (?:\d+|X|\d+–\d+)"),
    re.compile(r"Exile \d+ [A-Za-z][A-Za-z0-9 +“”'’-]* from Grave", re.I),
    re.compile(r"On (?:Any |Opponent )?Cast(?: “[^“”]+”)?(?: (?:Ritual|Fusion|Synchro|Xyz|Link|Creature|non-creature))*", re.I),
    re.compile(r"Protection from (?:everything|[A-Za-z][A-Za-z-]*)", re.I),
)

COMMON_NAME_WORDS = {
    "a",
    "an",
    "and",
    "of",
    "the",
    "effect",
    "fusion",
    "synchro",
    "xyz",
    "link",
    "ritual",
    "creature",
    "dragon",
    "fiend",
    "wizard",
    "zombie",
    "fairy",
    "warrior",
    "plant",
    "insect",
    "bird",
    "beast",
    "angel",
    "card",
    "hands",
}


@dataclass(frozen=True)
class Finding:
    path: Path
    line: int
    rule: str
    message: str
    suggestion: str

    def render(self) -> str:
        try:
            display = self.path.relative_to(ROOT)
        except ValueError:
            display = self.path
        return f"{display}:{self.line}: {self.rule}: {self.message} Fix: {self.suggestion}"


def tag_name(tag: str) -> tuple[str, bool] | None:
    match = re.match(r"<\s*(/?)\s*([\w-]+)", tag)
    if not match:
        return None
    return match.group(2).lower(), bool(match.group(1))


def markup_segments(text: str) -> Iterable[tuple[str, bool, bool]]:
    """Yield visible text with bold/italic state."""
    bold = 0
    italic = 0
    for part in TOKEN_RE.split(text):
        if not part:
            continue
        if part.startswith("<"):
            parsed = tag_name(part)
            if parsed:
                name, closing = parsed
                delta = -1 if closing else 1
                if name == "b":
                    bold = max(0, bold + delta)
                elif name in {"i", "i-auto", "i-flavor"}:
                    italic = max(0, italic + delta)
            continue
        yield part, bold > 0, italic > 0


def strip_markup(text: str) -> str:
    return TAG_RE.sub("", text)


def extract_rule_lines(path: Path) -> tuple[str, list[tuple[int, str]]]:
    lines = path.read_text(encoding="utf-8-sig").splitlines()
    name = next((line.removeprefix("\tname: ") for line in lines if line.startswith("\tname: ")), "")
    result: list[tuple[int, str]] = []
    in_rules = False
    for number, line in enumerate(lines, 1):
        if line.startswith("\trule_text:"):
            in_rules = True
            inline = line.removeprefix("\trule_text:").lstrip()
            if inline:
                result.append((number, inline))
            continue
        if in_rules and line.startswith("\tflavor_text:"):
            break
        if in_rules and line.startswith("\t\t"):
            result.append((number, line[2:]))
    return name, result


def name_aliases(name: str) -> list[str]:
    """Return plausible self-name references, longest first."""
    tokens = re.findall(r"[A-Za-z0-9]+(?:[.:'’-][A-Za-z0-9]+)*|“[^”]+”", name)
    aliases = {name}
    for token in tokens:
        if len(token) >= 3 and token.casefold() not in COMMON_NAME_WORDS:
            aliases.add(token)
        for part in re.split(r"[.:'’-]", token):
            if len(part) >= 3 and part.casefold() not in COMMON_NAME_WORDS:
                aliases.add(part)
    for size in range(len(tokens), 0, -1):
        for start in range(len(tokens) - size + 1):
            words = tokens[start : start + size]
            if all(word.casefold() in COMMON_NAME_WORDS for word in words):
                continue
            alias = " ".join(words)
            if len(alias) >= 3:
                aliases.add(alias)
    if " - " in name:
        suffix = name.rsplit(" - ", 1)[1]
        if any(word.casefold() not in COMMON_NAME_WORDS for word in suffix.split()):
            aliases.add(suffix)
    if "," in name:
        prefix = name.split(",", 1)[0]
        if any(word.casefold() not in COMMON_NAME_WORDS for word in prefix.split()):
            aliases.add(prefix)
    return sorted(aliases, key=len, reverse=True)


def is_zone_exile(segment: str, start: int) -> bool:
    return bool(EXILE_ZONE_CONTEXT_RE.search(segment[:start]))


def is_exile_action(segment: str, match: re.Match[str]) -> bool:
    return bool(ACTION_ARGUMENT_RE["Exile"].match(segment[match.end() :]))


def is_action_use(segment: str, match: re.Match[str], canonical: str) -> bool:
    """Distinguish command keywords from homonymous nouns/participles."""
    before = segment[: match.start()]
    after = segment[match.end() :]
    if canonical == "Exile":
        return is_exile_action(segment, match)
    if after.startswith("'s") or after.startswith("’s"):
        return False
    if canonical == "Cast" and (
        re.search(r"\b(?:was|been|spell|creature)\s+$", before, re.I)
        or re.match(r"\s+this turn\b", after, re.I)
    ):
        return False
    return bool(ACTION_ARGUMENT_RE[canonical].match(after))


def lint_markup_block(path: Path, rules: list[tuple[int, str]]) -> list[Finding]:
    findings: list[Finding] = []
    stack: list[tuple[str, int]] = []
    for line_number, text in rules:
        for tag in TAG_RE.findall(text):
            parsed = tag_name(tag)
            if not parsed:
                continue
            name, closing = parsed
            if name not in {"b", "i", "i-auto", "i-flavor", "kw-a", "nospellcheck", "key", "margin", "li", "bullet", "param-cost", "param-number", "sym-auto"}:
                continue
            if closing:
                if not stack or stack[-1][0] != name:
                    findings.append(Finding(path, line_number, "MSE001", f"unbalanced formatting tag {tag}", "balance and correctly nest formatting tags"))
                    return findings
                stack.pop()
            else:
                stack.append((name, line_number))
    if stack:
        names = ", ".join(name for name, _line in stack)
        findings.append(Finding(path, stack[-1][1], "MSE001", f"unclosed formatting tag(s): {names}", "close every formatting tag in rule_text"))
    return findings


def lint_bold_catalog(path: Path, line_number: int, text: str) -> list[Finding]:
    findings: list[Finding] = []
    for match in re.finditer(r"<b>(.*?)</b>", text):
        keyword = strip_markup(match.group(1)).strip()
        if keyword in ZONE_FORMS:
            continue
        if keyword in ABILITY_METADATA:
            prefix_end = text.find("</i-auto>")
            if keyword != "Flash" or (prefix_end != -1 and match.start() < prefix_end):
                findings.append(Finding(path, line_number, "MSE003", f"ability metadata '{keyword}' is bold", "keep metadata only in italic ability prefix"))
        elif keyword not in KNOWN_KEYWORDS and not any(pattern.fullmatch(keyword) for pattern in KEYWORD_PATTERNS):
            findings.append(Finding(path, line_number, "MSE004", f"unknown bold phrase '{keyword}'", "add documented keyword to catalog or remove bold"))
    return findings


def visible_text_and_format_ranges(text: str) -> tuple[str, list[tuple[int, int]], list[tuple[int, int]]]:
    visible: list[str] = []
    length = 0
    starts: dict[str, list[int]] = {"bold": [], "italic": []}
    ranges: dict[str, list[tuple[int, int]]] = {"bold": [], "italic": []}
    for part in TOKEN_RE.split(text):
        if not part:
            continue
        if part.startswith("<"):
            parsed = tag_name(part)
            if parsed:
                name, closing = parsed
                kind = "bold" if name == "b" else "italic" if name in {"i", "i-auto", "i-flavor"} else None
                if kind and closing and starts[kind]:
                    ranges[kind].append((starts[kind].pop(), length))
                elif kind and not closing:
                    starts[kind].append(length)
            continue
        visible.append(part)
        length += len(part)
    return "".join(visible), ranges["bold"], ranges["italic"]


def lint_visible_style(path: Path, line_number: int, text: str) -> list[Finding]:
    findings: list[Finding] = []
    visible, bold_ranges, italic_ranges = visible_text_and_format_ranges(text)

    def containers(match: re.Match[str]) -> list[tuple[int, int]]:
        return [item for item in bold_ranges if item[0] <= match.start() and item[1] >= match.end()]

    for match in re.finditer(r"(?<!\w)(?:graveyards?|GYD?|G\.Y\.)(?!\w)", visible, re.I):
        findings.append(Finding(path, line_number, "MSE019", f"legacy Grave term '{match.group(0)}'", "use Grave"))

    for match in ZONE_RE.finditer(visible):
        actual = match.group(0)
        if actual.casefold() == "exile" and is_exile_action(visible, match):
            continue
        if actual.casefold() == "exiles" and ACTION_ARGUMENT_RE["Exile"].match(visible[match.end() :]):
            if actual != "exiles":
                findings.append(Finding(path, line_number, "MSE011", f"conjugated action '{actual}' has keyword capitalization", "use exiles"))
            continue
        expected = next(form for form in ZONE_FORMS if form.casefold() == actual.casefold())
        if actual != expected:
            findings.append(Finding(path, line_number, "MSE005", f"zone '{actual}' has wrong case", f"use {expected}"))
        for start, end in containers(match):
            if visible[start:end].strip().casefold() == actual.casefold():
                findings.append(Finding(path, line_number, "MSE002", f"zone '{actual}' is bold", f"use plain {expected}"))
                break

    for match in re.finditer(r"\bnoncreatures?\b", visible, re.I):
        actual = match.group(0)
        expected = "non-Creatures" if actual.casefold().endswith("s") else "non-Creature"
        findings.append(Finding(path, line_number, "MSE017", f"card type '{actual}' has wrong form/case", f"use {expected}"))

    for match in TYPE_RE.finditer(visible):
        actual = match.group(0)
        expected = next(form for form in TYPE_FORMS if form.casefold() == actual.casefold())
        if actual != expected:
            findings.append(Finding(path, line_number, "MSE017", f"card type '{actual}' has wrong case", f"use {expected}"))
        for start, end in containers(match):
            if visible[start:end].strip().casefold() == actual.casefold():
                findings.append(Finding(path, line_number, "MSE018", f"card type '{actual}' is bold", f"use plain {expected}"))
                break

    for match in CONJUGATED_ACTION_RE.finditer(visible):
        before = visible[: match.start()].rstrip()
        if before and before[-1] not in ".!?—":
            actual = match.group(0)
            findings.append(Finding(path, line_number, "MSE011", f"conjugated action '{actual}' has keyword capitalization", f"use {CONJUGATED_ACTION_FORMS[actual]}"))

    for match in ACTION_RE.finditer(visible):
        actual = match.group(0)
        canonical = next(word for word in ACTION_WORDS if word.casefold() == actual.casefold())
        enclosing = containers(match)
        action_use = is_action_use(visible, match, canonical)
        if action_use and not enclosing:
            findings.append(Finding(path, line_number, "MSE006", f"action keyword '{actual}' is not bold", f"use <b>{canonical}</b>"))
        elif not action_use and any(visible[start:end].strip().casefold() == canonical.casefold() for start, end in enclosing):
            findings.append(Finding(path, line_number, "MSE009", f"'{actual}' is not an action in this context", f"use plain {actual.casefold()}"))

    required_exact = KNOWN_KEYWORDS - set(ACTION_WORDS) - ABILITY_METADATA
    checked_spans: set[tuple[int, int]] = set()
    for keyword in sorted(required_exact, key=len, reverse=True):
        for match in re.finditer(rf"(?<![\w]){re.escape(keyword)}(?![\w])", visible, re.I):
            checked_spans.add((match.start(), match.end()))
            if not containers(match):
                findings.append(Finding(path, line_number, "MSE014", f"keyword '{keyword}' is not bold", f"use <b>{keyword}</b>"))
    for pattern in KEYWORD_PATTERNS:
        for match in re.finditer(pattern.pattern, visible, pattern.flags | re.IGNORECASE):
            if (match.start(), match.end()) in checked_spans:
                continue
            if not containers(match):
                keyword = match.group(0)
                findings.append(Finding(path, line_number, "MSE014", f"keyword '{keyword}' is not bold", f"use <b>{keyword}</b>"))

    for match in re.finditer(r"\(\d+ - [^)]+\)", visible):
        if not any(start <= match.start() and end >= match.end() for start, end in italic_ranges):
            findings.append(Finding(path, line_number, "MSE015", f"ability prefix '{match.group(0)}' is not italic", "wrap the complete ability prefix in <i-auto>...</i-auto>"))
    return findings


def lint_name_style(
    path: Path,
    line_number: int,
    text: str,
    card_name: str,
    all_card_names: tuple[str, ...],
    alias_owners: dict[str, set[str]],
) -> list[Finding]:
    findings: list[Finding] = []
    for segment, bold, italic in markup_segments(text):
        if not italic:
            for quoted in QUOTED_NAME_RE.findall(segment):
                findings.append(Finding(path, line_number, "MSE007", f"name fragment {quoted} is not italic", f"use <i-auto>{quoted}</i-auto>"))
            if bold:
                continue
            for fragment in NAME_FRAGMENTS:
                if re.search(rf"(?<![\w]){re.escape(fragment)}(?![\w])", segment):
                    findings.append(Finding(path, line_number, "MSE012", f"name fragment '{fragment}' is plain", f"use <i-auto>“{fragment}”</i-auto>"))
                    break
            for alias in name_aliases(card_name):
                if re.search(rf"(?<![\w]){re.escape(alias)}(?![\w])", segment):
                    findings.append(Finding(path, line_number, "MSE008", f"self-name reference '{alias}' is not italic", f"wrap {alias} in <i-auto>...</i-auto>"))
                    break
            else:
                for alias, owners in sorted(alias_owners.items(), key=lambda item: len(item[0]), reverse=True):
                    if owners == {card_name}:
                        continue
                    if re.search(rf"(?<![\w]){re.escape(alias)}(?![\w])", segment):
                        findings.append(Finding(path, line_number, "MSE010", f"card-name reference '{alias}' is not italic", f"use <i-auto>“{alias}”</i-auto>"))
                        break

    for match in re.finditer(r"<(i|i-auto)>([^<]+)</\1>", text):
        value = match.group(2)
        if value.startswith("("):
            continue
        if value == f"“{card_name}”":
            findings.append(Finding(path, line_number, "MSE016", f"full self-name '{card_name}' must not be quoted", f"use <i-auto>{card_name}</i-auto>"))
            continue
        if QUOTED_NAME_RE.fullmatch(value):
            continue
        if value != card_name and (
            value in name_aliases(card_name)
            or value in all_card_names
            or value in NAME_FRAGMENTS
            or any(owner != card_name for owner in alias_owners.get(value, set()))
        ):
            findings.append(Finding(path, line_number, "MSE013", f"non-full-self name reference '{value}' lacks typographic quotes", f"use <i-auto>“{value}”</i-auto>"))
    return findings


def card_paths(projects_root: Path = PROJECTS_ROOT) -> Iterable[Path]:
    for manifest in sorted(projects_root.rglob("*.mse-set/set")):
        project = manifest.parent
        if any(parent.name.endswith(".mse-set") for parent in project.parents):
            continue
        for line in manifest.read_text(encoding="utf-8-sig").splitlines():
            if not line.startswith("include_file: "):
                continue
            path = project / line.removeprefix("include_file: ")
            if path.is_file():
                yield path


def lint(projects_root: Path = PROJECTS_ROOT) -> list[Finding]:
    findings: list[Finding] = []
    cards = list(card_paths(projects_root))
    parsed = {path: extract_rule_lines(path) for path in cards}
    all_card_names = tuple(name for name, _rules in parsed.values() if name)
    alias_owners: dict[str, set[str]] = {}
    for card_name in all_card_names:
        for alias in name_aliases(card_name):
            alias_owners.setdefault(alias, set()).add(card_name)
    for path in cards:
        name, rules = parsed[path]
        findings.extend(lint_markup_block(path, rules))
        for line_number, text in rules:
            findings.extend(lint_bold_catalog(path, line_number, text))
            findings.extend(lint_visible_style(path, line_number, text))
            findings.extend(lint_name_style(path, line_number, text, name, all_card_names, alias_owners))
    return findings


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--projects-root", type=Path, default=PROJECTS_ROOT)
    args = parser.parse_args()
    findings = lint(args.projects_root.resolve())
    for finding in findings:
        print(finding.render())
    if findings:
        print(f"\n{len(findings)} card-style violation(s).", file=sys.stderr)
        return 1
    print("MSE card style OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

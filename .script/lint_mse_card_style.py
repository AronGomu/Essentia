#!/usr/bin/env python3
"""Lint manifest-included MSE rules-text typography across lifecycle stages.

Read-only. Mutable and immutable stages are safe inputs.
"""

from __future__ import annotations

import argparse
import re
import sys
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import Iterable

ROOT = Path(__file__).resolve().parents[1]
PROJECTS_ROOT = ROOT / "cards_mse"
TAG_RE = re.compile(r"<[^>]+>")
TOKEN_RE = re.compile(r"(<[^>]+>)")
QUOTED_NAME_RE = re.compile(r"“[^“”]+”")


@lru_cache(maxsize=None)
def _boundary_pattern(needle: str, ignore_case: bool) -> re.Pattern[str]:
    """Compile a word-boundary pattern once. The hot loops rebuilt these per line."""
    return re.compile(rf"(?<![\w]){re.escape(needle)}(?![\w])", re.IGNORECASE if ignore_case else 0)


def boundary_search(needle: str, text: str) -> re.Match[str] | None:
    """Case-sensitive word-boundary search. The substring test is exact, so skipping
    the regex on a miss cannot change a result — and it skips it ~99% of the time."""
    if needle not in text:
        return None
    return _boundary_pattern(needle, False).search(text)


def boundary_finditer(needle: str, text: str, lowered: str) -> list[re.Match[str]]:
    """Case-insensitive word-boundary matches. `lowered` is `text.casefold()`, hoisted
    by the caller so it is computed once per line instead of once per keyword."""
    if needle.casefold() not in lowered:
        return []
    return list(_boundary_pattern(needle, True).finditer(text))


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
    "Shuffled": "shuffled",
    "Sacrificed": "sacrificed",
    "Revealed": "revealed",
}
CONJUGATED_ACTION_RE = re.compile(r"\b(" + "|".join(CONJUGATED_ACTION_FORMS) + r")\b")
ACTION_ARGUMENT_RE = {
    "Discard": re.compile(r"\s+(?:\d+|X\b|this\b|that\b|the\b|your\b|a\b|an\b|up to\b|any\b|“[^”]+”|[A-Z][A-Za-z0-9.'’_-]+)"),
    "Exile": re.compile(r"\s+(?:it\b|them\b|this\b|that\b|the\b|all\b|any\b|one\b|up to\b|\d+|X\b|target\b|chosen\b|a\b|an\b|card\b|creature\b|“[^”]+”|[A-Z][A-Za-z0-9.'’_-]+)"),
    "Search": re.compile(r"\s+(?:\d+|X\b|\d+[–-]\d+|your\b|the\b)", re.I),
    "Summon": re.compile(r"\s+(?:\d+|X\b|this\b|that\b|the\b|a\b|an\b|any\b|up to\b|“[^”]+”|[A-Z][A-Za-z0-9.'’_-]+)"),
    "Reanimate": re.compile(r"\s+(?:it\b|them\b|this\b|that\b|the\b|target\b|\d+|“[^”]+”)", re.I),
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
    "Destroy": re.compile(r"\s+(?:it\b|them\b|this\b|that\b|the\b|target\b|all\b|any\b|\d+|X\b|(?-i:[A-Z][A-Za-z0-9.'’_-]+))", re.I),
    "Send": re.compile(r"\s+(?:it\b|them\b|this\b|that\b|the\b|target\b|all\b|any\b|\d+|X\b|top\b)", re.I),
    "Shuffle": re.compile(r"\s+(?:it\b|them\b|this\b|that\b|the\b|target\b|all\b|any\b|one\b|up to\b|\d+|X\b|chosen\b|others\b|“[^”]+”|[A-Z][A-Za-z0-9.'’_-]+)"),
    "Cast": re.compile(r"\s+(?:it\b|them\b|this\b|that\b|the\b|a\b|an\b|any\b|\d+|X\b|(?-i:[A-Z][A-Za-z0-9.'’_-]+))", re.I),
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
    "Shuffle",
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
# A bold action named as an example inside a parenthesised italic enumeration —
# "(Draw, Mill X, Search, etc.)" — is a legitimate keyword invocation with no
# argument.
#
# The exemption is structural, not positional. The whole parenthesised aside
# must be a list: split it on commas and every item, once an introductory "or "
# is dropped, must be either a bold run standing on its own or the literal
# "etc." — so prose sharing the aside keeps raising MSE009. That is what the
# earlier lead-in/follower regexes only appeared to do: they accepted a comma
# anywhere before the action and a bare "or" after it, which exempted
# "(Deal 2 damage, Draw, then win.)" and "(Counter or nothing happens.)".
ENUMERATION_FILLER = {"etc", "etc."}

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
    "After Attack",
    "After Block",
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
    "Double strike",
    "Protection from everything",
    "Protection from Creatures",
    "Abyssal Curse",
    "Descent",
}
KNOWN_KEYWORDS.update(ACTION_WORDS)
# A keyword quantity is a single value or an inclusive range. Ranges accept the
# en dash and the hyphen Magic Set Editor types by default: 1–4 and 1-4 both
# stand, as do X-Y bounds.
QUANTITY = r"(?:\d+|X)(?:\s?[-–]\s?(?:\d+|X))?"
KEYWORD_PATTERNS = (
    re.compile(rf"Bounded {QUANTITY}"),
    re.compile(rf"Detach {QUANTITY}"),
    re.compile(rf"Mill {QUANTITY}"),
    re.compile(rf"Scry {QUANTITY}"),
    re.compile(rf"Ward {QUANTITY}"),
    re.compile(rf"Slow Blink {QUANTITY} Any Creature"),
    re.compile(r"Xyz Alternative Cost"),
    re.compile(r"Exile \d+ [A-Za-z][A-Za-z0-9 +“”'’-]* from Grave", re.I),
    re.compile(r"On (?:Any |Opponent )?Cast(?: “[^“”]+”)?(?: (?:Ritual|Fusion|Synchro|Xyz|Link|Creature|non-creature))*", re.I),
    re.compile(r"Protection from (?:everything|[A-Za-z][A-Za-z-]*)", re.I),
)

# Sorted by (-len, text) so the order is independent of set iteration, which
# PYTHONHASHSEED randomises per process and which used to leak into finding order.
REQUIRED_EXACT_KEYWORDS = tuple(
    sorted(KNOWN_KEYWORDS - set(ACTION_WORDS) - ABILITY_METADATA, key=lambda word: (-len(word), word))
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


@lru_cache(maxsize=None)
def name_aliases(name: str) -> tuple[str, ...]:
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
    return tuple(sorted(aliases, key=lambda alias: (-len(alias), alias)))


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
    lowered = visible.casefold()

    def containers(match: re.Match[str]) -> list[tuple[int, int]]:
        return [item for item in bold_ranges if item[0] <= match.start() and item[1] >= match.end()]

    def italic_containers(match: re.Match[str]) -> list[tuple[int, int]]:
        return [item for item in italic_ranges if item[0] <= match.start() and item[1] >= match.end()]

    def trim(start: int, end: int) -> tuple[int, int]:
        """The span with surrounding whitespace dropped."""
        while start < end and visible[start].isspace():
            start += 1
        while end > start and visible[end - 1].isspace():
            end -= 1
        return start, end

    def is_bold_run(start: int, end: int) -> bool:
        """True when visible[start:end] is exactly one bold run and nothing else."""
        return any(trim(*item) == (start, end) for item in bold_ranges)

    def enumeration_items(start: int, end: int) -> list[tuple[int, int]] | None:
        """Spans of the comma-separated items of the parenthesised aside visible[start:end].

        None when the aside is not a bare parenthesised list, or when any item
        is prose rather than a bold run standing alone or the "etc." filler.
        """
        open_paren = visible.find("(", start, end)
        # Nothing but whitespace may precede the "(". An italic run with no
        # parentheses, and one that opens with prose — "Choose one (Draw, Mill
        # X)" — are both asides rather than lists.
        if open_paren == -1 or visible[start:open_paren].strip():
            return None
        close_paren = visible.find(")", open_paren + 1)
        if close_paren == -1 or close_paren > end:
            close_paren = end

        items: list[tuple[int, int]] = []
        cursor = open_paren + 1
        while cursor <= close_paren:
            comma = visible.find(",", cursor, close_paren)
            item_start, item_end = trim(cursor, close_paren if comma == -1 else comma)
            # Drop the "or" that introduces the final item of a list.
            if visible[item_start:item_end].lower().startswith("or "):
                item_start, item_end = trim(item_start + 3, item_end)
            # An empty item — a doubled or trailing comma — is neither a bold
            # run nor the filler, so the one check below rejects it too.
            if not is_bold_run(item_start, item_end) and visible[item_start:item_end].lower() not in ENUMERATION_FILLER:
                return None
            items.append((item_start, item_end))
            if comma == -1:
                break
            cursor = comma + 1
        return items

    def is_enumerated_example(match: re.Match[str]) -> bool:
        """True for an action listed as an example in a parenthesised italic aside."""
        for start, end in italic_containers(match):
            items = enumeration_items(start, end)
            if items is None:
                continue
            # The action must *be* one of the listed items, not merely sit
            # inside the aside next to them.
            if any(
                item_start <= match.start() and item_end >= match.end() and is_bold_run(item_start, item_end)
                for item_start, item_end in items
            ):
                return True
        return False

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
            if is_enumerated_example(match):
                continue
            findings.append(Finding(path, line_number, "MSE009", f"'{actual}' is not an action in this context", f"use plain {actual.casefold()}"))

    checked_spans: set[tuple[int, int]] = set()
    for keyword in REQUIRED_EXACT_KEYWORDS:
        for match in boundary_finditer(keyword, visible, lowered):
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


def _alias_order(alias_owners: dict[str, set[str]]) -> tuple[tuple[str, frozenset[str]], ...]:
    return tuple(
        (alias, frozenset(owners))
        for alias, owners in sorted(alias_owners.items(), key=lambda item: (-len(item[0]), item[0]))
    )


def lint_name_style(
    path: Path,
    line_number: int,
    text: str,
    card_name: str,
    all_card_names: tuple[str, ...],
    alias_owners: dict[str, set[str]],
    *,
    alias_order: tuple[tuple[str, frozenset[str]], ...] | None = None,
) -> list[Finding]:
    findings: list[Finding] = []
    for segment, bold, italic in markup_segments(text):
        if not italic:
            for quoted in QUOTED_NAME_RE.findall(segment):
                findings.append(Finding(path, line_number, "MSE007", f"name fragment {quoted} is not italic", f"use <i-auto>{quoted}</i-auto>"))
            if bold:
                continue
            for fragment in NAME_FRAGMENTS:
                if boundary_search(fragment, segment):
                    findings.append(Finding(path, line_number, "MSE012", f"name fragment '{fragment}' is plain", f"use <i-auto>“{fragment}”</i-auto>"))
                    break
            for alias in name_aliases(card_name):
                if boundary_search(alias, segment):
                    findings.append(Finding(path, line_number, "MSE008", f"self-name reference '{alias}' is not italic", f"wrap {alias} in <i-auto>...</i-auto>"))
                    break
            else:
                for alias, owners in alias_order if alias_order is not None else _alias_order(alias_owners):
                    if owners == {card_name}:
                        continue
                    if boundary_search(alias, segment):
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
    alias_order = _alias_order(alias_owners)
    for path in cards:
        name, rules = parsed[path]
        findings.extend(lint_markup_block(path, rules))
        for line_number, text in rules:
            findings.extend(lint_bold_catalog(path, line_number, text))
            findings.extend(lint_visible_style(path, line_number, text))
            findings.extend(lint_name_style(path, line_number, text, name, all_card_names, alias_owners, alias_order=alias_order))
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

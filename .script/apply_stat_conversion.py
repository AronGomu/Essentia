#!/usr/bin/env python3
"""Apply YGO ATK/DEF → MTG power/toughness on MSE creature cards.

Conversion (script authority — not hard-coded per card):

    power     = floor(ATK * MTG_LP / YGO_LP)   # truncate toward 0
    toughness = max(1, floor(DEF * MTG_LP / YGO_LP))  # never 0-toughness creature

Defaults: YGO_LP=8000, MTG_LP=20
  → 2000 ATK → 5 power; 1900 ATK → 4 power; 0 DEF → 1 toughness.

Original stats come from ``original_cards/**/*.md``.
MSE targets are folder-form ``cards_mse/**/*.mse-set`` card files that already
have ``power`` / ``toughness`` fields.

Usage:
  python .script/apply_stat_conversion.py              # dry-run
  python .script/apply_stat_conversion.py --write      # apply
  python .script/apply_stat_conversion.py --write --project path/to.mse-set
"""

from __future__ import annotations

import argparse
import re
import sys
import unicodedata
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parent

ORIGINAL_ROOT = REPO_ROOT / "original_cards"
CARDS_ROOT = REPO_ROOT / "cards_mse"
TIMESTAMP_FORMAT = "%Y-%m-%d %H:%M:%S"
MAX_CARD_BYTES = 512 * 1024

YGO_STARTING_LP = 8000
MTG_STARTING_LP = 20

# Display name on MSE card → official YGO name (heading in original_cards).
# Merged from ensure_original_images / download_ygo_images maps + extras.
NAME_MAP: dict[str, str] = {
    # Burning Abyss (short MSE titles)
    "Burning Abyss - Alich": "Alich, Malebranche of the Burning Abyss",
    "Burning Abyss - Barbar": "Barbar, Malebranche of the Burning Abyss",
    "Burning Abyss - Cagna": "Cagna, Malebranche of the Burning Abyss",
    "Burning Abyss - Calcab": "Calcab, Malebranche of the Burning Abyss",
    "Burning Abyss - Cir": "Cir, Malebranche of the Burning Abyss",
    "Burning Abyss - Draghig": "Draghig, Malebranche of the Burning Abyss",
    "Burning Abyss - Farfa": "Farfa, Malebranche of the Burning Abyss",
    "Burning Abyss - Graff": "Graff, Malebranche of the Burning Abyss",
    "Burning Abyss - Libic": "Libic, Malebranche of the Burning Abyss",
    "Burning Abyss - Rubic": "Rubic, Malebranche of the Burning Abyss",
    "Burning Abyss - Scarm": "Scarm, Malebranche of the Burning Abyss",
    "Burning Abyss - Dante": "Dante, Traveler of the Burning Abyss",
    "Burning Abyss - Dante, Pilgrim": "Dante, Pilgrim of the Burning Abyss",
    "Burning Abyss - Dante Pilgrim": "Dante, Pilgrim of the Burning Abyss",
    "Burning Abyss - Virgil": "Virgil, Rock Star of the Burning Abyss",
    "Burning Abyss - Beatrice": "Beatrice, Lady of the Eternal",
    "Burning Abyss - Cherubini": "Cherubini, Ebon Angel of the Burning Abyss",
    "Burning Abyss - Fire Lake": "Fire Lake of the Burning Abyss",
    "Burning Abyss - Good & Evil": "Good & Evil in the Burning Abyss",
    "Burning Abyss - Malacoda": "Malacoda, Netherlord of the Burning Abyss",
    "Burning Abyss - Terminus": "The Terminus of the Burning Abyss",
    "Burning Abyss - Traveler": "The Traveler and the Burning Abyss",
    # Alternate BA commas
    "Alich, Burning Abyss": "Alich, Malebranche of the Burning Abyss",
    "Barbar, Burning Abyss": "Barbar, Malebranche of the Burning Abyss",
    "Cagna, Burning Abyss": "Cagna, Malebranche of the Burning Abyss",
    "Calcab, Burning Abyss": "Calcab, Malebranche of the Burning Abyss",
    "Cir, Burning Abyss": "Cir, Malebranche of the Burning Abyss",
    "Draghig, Burning Abyss": "Draghig, Malebranche of the Burning Abyss",
    "Farfa, Burning Abyss": "Farfa, Malebranche of the Burning Abyss",
    "Graff, Burning Abyss": "Graff, Malebranche of the Burning Abyss",
    "Libic, Burning Abyss": "Libic, Malebranche of the Burning Abyss",
    "Rubic, Burning Abyss": "Rubic, Malebranche of the Burning Abyss",
    "Scarm, Burning Abyss": "Scarm, Malebranche of the Burning Abyss",
    "Dante, Traveller of the Burning Abyss": "Dante, Traveler of the Burning Abyss",
    # Shaddoll
    "El Shaddoll - Anoyatyllis": "El Shaddoll Anoyatyllis",
    "El Shaddoll - Apkallone": "El Shaddoll Apkallone",
    "El Shaddoll - Construct": "El Shaddoll Construct",
    "El Shaddoll - Fusion": "El Shaddoll Fusion",
    "El Shaddoll - Grysta": "El Shaddoll Grysta",
    "El Shaddoll - Shekhinaga": "El Shaddoll Shekhinaga",
    "El Shaddoll - Wendigo": "El Shaddoll Wendigo",
    "El Shaddoll - Winda": "El Shaddoll Winda",
    "Hel Shaddoll - Hollow": "Helshaddoll Hollow",
    "Nael Shaddoll - Ariel": "Naelshaddoll Ariel",
    "Puru Shaddoll - Aeon": "Purushaddoll Aeon",
    "Qad Shaddoll - Keios": "Qadshaddoll Keios",
    "Ree Shaddoll - Wendi": "Reeshaddoll Wendi",
    "Resh Shaddoll - Incarnation": "Resh Shaddoll Incarnation",
    # Nekroz short MSE titles
    "Nekroz - Brionac": "Nekroz of Brionac",
    "Nekroz - Catastor": "Nekroz of Catastor",
    "Nekroz - Clausolas": "Nekroz of Clausolas",
    "Nekroz - Dance Princess": "Dance Princess of the Nekroz",
    "Nekroz - Decisive Armor": "Nekroz of Decisive Armor",
    "Nekroz - Exa": "Exa, Enforcer of the Nekroz",
    "Nekroz - Great Sorcerer": "Great Sorcerer of the Nekroz",
    "Nekroz - Gungnir": "Nekroz of Gungnir",
    "Nekroz - Shurit": "Shurit, Strategist of the Nekroz",
    "Nekroz - Trishula": "Nekroz of Trishula",
    "Nekroz - Unicore": "Nekroz of Unicore",
    "Nekroz - Valkyrus": "Nekroz of Valkyrus",
    # Misc display fixes
    "D.D Crow": "D.D. Crow",
    "AA-ZEUS - Sky Thunder": "Divine Arsenal AA-ZEUS - Sky Thunder",
    "Hope Harbinger Dragon": "Number 38: Hope Harbinger Dragon Titanic Galaxy",
    "Big Eye": "Number 11: Big Eye",
    "Bagooska": "Number 41: Bagooska the Terribly Tired Tapir",
    "Silent Honor ARK": "Number 101: Silent Honor ARK",
    "Stealth Kragen": "Number 4: Stealth Kragen",
    "Dugares the Timeless": "Number 60: Dugares the Timeless",
    "Bamboozling Gossip Shadow": "Number 75: Bamboozling Gossip Shadow",
}


_ATK_RE = re.compile(r"(?m)^\s*-\s*\*\*ATK:\*\*\s*(.+?)\s*$")
_DEF_RE = re.compile(r"(?m)^\s*-\s*\*\*DEF:\*\*\s*(.+?)\s*$")
_HEADING_RE = re.compile(r"(?m)^#\s+(.+?)\s*$")
_TIME_RE = re.compile(r"(?m)^\ttime_modified:\s*.*$")


def read_limited(path: Path, limit: int = MAX_CARD_BYTES) -> str:
    size = path.stat().st_size
    if size > limit:
        raise ValueError(f"{path.name} exceeds {limit} bytes")
    return path.read_text(encoding="utf-8-sig")


def field_values(text: str) -> dict[str, list[str]]:
    fields: dict[str, list[str]] = {}
    lines = text.replace("\r\n", "\n").replace("\r", "\n").splitlines()
    current: str | None = None
    buffer: list[str] = []
    for line in lines:
        match = re.match(r"^\t([^:\n]+):(?:\s?(.*))?$", line)
        if match:
            if current is not None:
                fields.setdefault(current, []).append("\n".join(buffer).rstrip())
            current = match.group(1).strip()
            buffer = [match.group(2) or ""]
        elif current is not None and line.startswith("\t\t"):
            buffer.append(line[2:])
        elif current is not None:
            fields.setdefault(current, []).append("\n".join(buffer).rstrip())
            current = None
            buffer = []
    if current is not None:
        fields.setdefault(current, []).append("\n".join(buffer).rstrip())
    return fields


def one_field(fields: dict[str, list[str]], name: str) -> str | None:
    values = fields.get(name, [])
    if len(values) > 1:
        raise ValueError(f"duplicate field: {name}")
    return values[0].strip() if values else None


def set_time_modified(text: str, value: datetime) -> str:
    stamp = value.strftime(TIMESTAMP_FORMAT)
    replacement = f"\ttime_modified: {stamp}"
    if _TIME_RE.search(text):
        return _TIME_RE.sub(replacement, text, count=1)
    marker = re.search(r"(?m)^\tname:", text)
    if not marker:
        return text
    return text[: marker.start()] + replacement + "\n" + text[marker.start() :]


@dataclass(frozen=True)
class OriginalStats:
    name: str
    path: Path
    atk: int | None  # None = non-numeric (?, variable)
    defense: int | None  # None = non-numeric (—, Link, ?)


@dataclass(frozen=True)
class ConversionResult:
    power: int | None
    toughness: int | None


def normalize_name(value: str) -> str:
    value = value.replace("«", '"').replace("»", '"').replace("’", "'").replace("“", '"').replace("”", '"')
    value = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", "", value)


def convert_stat(ygo_stat: int, *, ygo_lp: int = YGO_STARTING_LP, mtg_lp: int = MTG_STARTING_LP) -> int:
    """ATK/DEF → power/toughness via life-total ratio; truncate toward 0."""
    if ygo_lp <= 0 or mtg_lp < 0:
        raise ValueError("life totals must be positive (ygo_lp > 0, mtg_lp >= 0)")
    if ygo_stat < 0:
        raise ValueError(f"negative YGO stat: {ygo_stat}")
    # floor for non-negative: int truncation of the true ratio
    return (ygo_stat * mtg_lp) // ygo_lp


def parse_stat_token(raw: str) -> int | None:
    token = raw.strip()
    if not token or token in {"—", "-", "–", "?", "？"}:
        return None
    if re.fullmatch(r"\d+", token):
        return int(token)
    return None


def convert_pair(
    atk: int | None,
    defense: int | None,
    *,
    ygo_lp: int = YGO_STARTING_LP,
    mtg_lp: int = MTG_STARTING_LP,
    min_toughness: int = 1,
) -> ConversionResult:
    toughness = None
    if defense is not None:
        toughness = convert_stat(defense, ygo_lp=ygo_lp, mtg_lp=mtg_lp)
        if min_toughness > 0:
            toughness = max(min_toughness, toughness)
    return ConversionResult(
        power=None if atk is None else convert_stat(atk, ygo_lp=ygo_lp, mtg_lp=mtg_lp),
        toughness=toughness,
    )


def load_original_stats(root: Path = ORIGINAL_ROOT) -> dict[str, OriginalStats]:
    index: dict[str, OriginalStats] = {}
    for path in sorted(root.rglob("*.md")):
        text = path.read_text(encoding="utf-8-sig")
        heading_m = _HEADING_RE.search(text)
        atk_m = _ATK_RE.search(text)
        def_m = _DEF_RE.search(text)
        if not heading_m or not atk_m:
            continue
        name = heading_m.group(1).strip()
        stats = OriginalStats(
            name=name,
            path=path,
            atk=parse_stat_token(atk_m.group(1)),
            defense=parse_stat_token(def_m.group(1)) if def_m else None,
        )
        key = normalize_name(name)
        # first wins; duplicates should be identical sources
        index.setdefault(key, stats)
    return index


def candidate_official_names(display_name: str) -> list[str]:
    """Deterministic official-name guesses from an MSE display title."""
    names: list[str] = []
    seen: set[str] = set()

    def add(value: str) -> None:
        value = value.strip()
        if not value:
            return
        key = normalize_name(value)
        if key in seen:
            return
        seen.add(key)
        names.append(value)

    add(NAME_MAP.get(display_name, display_name))
    add(display_name)

    if " - " in display_name:
        left, right = display_name.split(" - ", 1)
        left, right = left.strip(), right.strip()
        add(f"{left} {right}")
        add(f"{left} of {right}")
        add(f"{right} of the {left}")
        add(f"{right} of {left}")
        add(f"{right}, {left}")
        # BA-style: "Burning Abyss - Cir" → already in NAME_MAP; keep generic forms
        add(f"{right}, Malebranche of the {left}")

    return names


def resolve_original(display_name: str, index: dict[str, OriginalStats]) -> OriginalStats | None:
    for guess in candidate_official_names(display_name):
        hit = index.get(normalize_name(guess))
        if hit is not None:
            return hit
    return None


def iter_mse_projects(cards_root: Path = CARDS_ROOT, only: Path | None = None) -> list[Path]:
    if only is not None:
        project = only.resolve()
        if not (project / "set").is_file():
            raise SystemExit(f"not an mse-set project: {project}")
        return [project]

    projects: list[Path] = []
    for set_path in sorted(cards_root.rglob("set")):
        project = set_path.parent
        if not project.name.endswith(".mse-set"):
            continue
        # Generated aggregates — do not edit
        if project.name.endswith("_all_cards.mse-set"):
            continue
        if "render" in project.parts:
            continue
        projects.append(project)
    return projects


def locked_package_roots(cards_root: Path = CARDS_ROOT) -> set[Path]:
    locked: set[Path] = set()
    for release in cards_root.rglob("release.json"):
        try:
            import json

            data = json.loads(release.read_text(encoding="utf-8"))
        except (OSError, ValueError):
            continue
        if data.get("status") == "locked":
            locked.add(release.parent.resolve())
    return locked


def is_under_locked(project: Path, locked_roots: set[Path]) -> bool:
    resolved = project.resolve()
    for root in locked_roots:
        try:
            resolved.relative_to(root)
            return True
        except ValueError:
            continue
    return False


def card_files_in_project(project: Path) -> list[Path]:
    set_path = project / "set"
    text = set_path.read_text(encoding="utf-8-sig")
    includes = re.findall(r"(?m)^include_file:\s*(.+?)\s*$", text)
    if includes:
        return [project / name for name in includes if (project / name).is_file()]
    return sorted(project.glob("card *"))


def replace_field_line(text: str, field: str, value: str) -> str:
    pattern = re.compile(rf"(?m)^(\t{re.escape(field)}:\s*)(.*)$")
    if not pattern.search(text):
        raise ValueError(f"missing field {field}")
    return pattern.sub(rf"\g<1>{value}", text, count=1)


def apply_to_card_text(
    text: str,
    *,
    power: int | None,
    toughness: int | None,
    now: datetime | None = None,
) -> tuple[str, list[str]]:
    """Return (new_text, change_notes). Only touches numeric targets when conversion yields a number."""
    fields = field_values(text)
    notes: list[str] = []
    after = text

    if power is not None and one_field(fields, "power") is not None:
        old = one_field(fields, "power") or ""
        new = str(power)
        if old != new:
            after = replace_field_line(after, "power", new)
            notes.append(f"power {old} → {new}")

    if toughness is not None and one_field(fields, "toughness") is not None:
        old = one_field(fields, "toughness") or ""
        new = str(toughness)
        if old != new:
            after = replace_field_line(after, "toughness", new)
            notes.append(f"toughness {old} → {new}")

    if notes:
        after = set_time_modified(after, now or datetime.now())
    return after, notes


def process_project(
    project: Path,
    index: dict[str, OriginalStats],
    *,
    write: bool,
    now: datetime | None = None,
    ygo_lp: int = YGO_STARTING_LP,
    mtg_lp: int = MTG_STARTING_LP,
) -> dict[str, int]:
    counts = {
        "cards": 0,
        "creatures": 0,
        "updated": 0,
        "unchanged": 0,
        "unmatched": 0,
        "no_stats_field": 0,
        "skipped_variable": 0,
    }
    for card_path in card_files_in_project(project):
        counts["cards"] += 1
        text = read_limited(card_path, 512 * 1024)
        fields = field_values(text)
        name = one_field(fields, "name")
        if not name:
            continue
        has_power = one_field(fields, "power") is not None
        has_tough = one_field(fields, "toughness") is not None
        if not has_power and not has_tough:
            counts["no_stats_field"] += 1
            continue
        counts["creatures"] += 1

        original = resolve_original(name, index)
        if original is None:
            # Trap/spell frames sometimes keep empty P/T; only warn if original has no monster stats.
            counts["unmatched"] += 1
            print(f"UNMATCHED | {project.relative_to(REPO_ROOT)} | {name}")
            continue

        result = convert_pair(original.atk, original.defense, ygo_lp=ygo_lp, mtg_lp=mtg_lp)
        if result.power is None and result.toughness is None:
            counts["skipped_variable"] += 1
            print(
                f"VARIABLE  | {project.relative_to(REPO_ROOT)} | {name} "
                f"← {original.name} ATK/DEF non-numeric"
            )
            continue

        new_text, notes = apply_to_card_text(
            text, power=result.power, toughness=result.toughness, now=now
        )
        atk_s = "?" if original.atk is None else str(original.atk)
        def_s = "?" if original.defense is None else str(original.defense)
        if not notes:
            counts["unchanged"] += 1
            print(
                f"OK        | {name} | {atk_s}/{def_s} → "
                f"{result.power if result.power is not None else '—'}/"
                f"{result.toughness if result.toughness is not None else '—'} (no change)"
            )
            continue

        counts["updated"] += 1
        action = "WRITE" if write else "DRY"
        print(
            f"{action:9}| {project.relative_to(REPO_ROOT)} | {name} | "
            f"{original.name} {atk_s}/{def_s} | " + ", ".join(notes)
        )
        if write:
            card_path.write_text(new_text, encoding="utf-8", newline="\n")
    return counts


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--write",
        action="store_true",
        help="persist changes (default is dry-run)",
    )
    parser.add_argument(
        "--project",
        type=Path,
        action="append",
        default=None,
        help="limit to one or more .mse-set paths (repeatable)",
    )
    parser.add_argument(
        "--ygo-lp",
        type=int,
        default=YGO_STARTING_LP,
        help=f"YGO starting life (default {YGO_STARTING_LP})",
    )
    parser.add_argument(
        "--mtg-lp",
        type=int,
        default=MTG_STARTING_LP,
        help=f"MTG starting life (default {MTG_STARTING_LP})",
    )
    parser.add_argument(
        "--strict",
        action="store_true",
        help="exit 1 when any creature with P/T cannot be matched to original_cards",
    )
    args = parser.parse_args(argv)

    index = load_original_stats()
    if not index:
        print("ERROR: no original_cards with ATK found", file=sys.stderr)
        return 2

    locked = locked_package_roots()
    if args.project:
        projects = []
        for p in args.project:
            projects.extend(iter_mse_projects(only=p))
    else:
        projects = iter_mse_projects()

    totals = {
        "cards": 0,
        "creatures": 0,
        "updated": 0,
        "unchanged": 0,
        "unmatched": 0,
        "no_stats_field": 0,
        "skipped_variable": 0,
        "skipped_locked": 0,
    }
    now = datetime.now()
    mode = "WRITE" if args.write else "DRY-RUN"
    print(
        f"{mode} | ratio floor(stat * {args.mtg_lp} / {args.ygo_lp}) | "
        f"originals={len(index)} | projects={len(projects)}"
    )

    for project in projects:
        if is_under_locked(project, locked):
            totals["skipped_locked"] += 1
            print(f"LOCKED    | skip {project.relative_to(REPO_ROOT)}")
            continue
        counts = process_project(
            project,
            index,
            write=args.write,
            now=now,
            ygo_lp=args.ygo_lp,
            mtg_lp=args.mtg_lp,
        )
        for key, value in counts.items():
            totals[key] = totals.get(key, 0) + value

    print(
        "\nSUMMARY | "
        f"creatures={totals['creatures']} updated={totals['updated']} "
        f"unchanged={totals['unchanged']} unmatched={totals['unmatched']} "
        f"variable={totals['skipped_variable']} non-creature={totals['no_stats_field']} "
        f"locked_projects={totals['skipped_locked']}"
    )
    if args.strict and totals["unmatched"]:
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

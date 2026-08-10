#!/usr/bin/env python3
"""Scale geometric values in a Magic Set Editor style file."""

from __future__ import annotations

import argparse
import math
import re
from pathlib import Path


GEOMETRIC_KEY_ENDINGS = (
    "width",
    "height",
    "left",
    "top",
    "right",
    "bottom",
    "size",
    "radius",
    "offset",
)
KEY_VALUE_RE = re.compile(r"^(?P<indent>[ \t]*)(?P<key>[^:\r\n]+?)(?P<separator>[ \t]*:[ \t]*)(?P<value>.*?)(?P<newline>\r?\n)?$")
NUMBER_RE = re.compile(r"(?<![\w.])[-+]?(?:\d+\.\d*|\.\d+|\d+)(?![\w.])")
SCRIPT_HEADER_RE = re.compile(r"^(?P<indent>[ \t]*)(?:init script|script)[ \t]*:[ \t]*(?:\r?\n)?$")


def _indent_width(indent: str) -> int:
    return len(indent.expandtabs(8))


def _scale_number(match: re.Match[str], factor: float) -> str:
    literal = match.group(0)
    scaled = float(literal) * factor
    if "." in literal:
        return f"{scaled:.2f}"
    return str(round(scaled))


def scale_style_text(text: str, factor: float) -> str:
    """Return style text with geometric numeric literals multiplied by factor."""
    if not math.isfinite(factor) or factor <= 0:
        raise ValueError("factor must be a positive finite number")

    output: list[str] = []
    script_indent: int | None = None

    for line in text.splitlines(keepends=True):
        stripped = line.strip()
        indent = line[: len(line) - len(line.lstrip(" \t"))]
        indent_width = _indent_width(indent)

        if script_indent is not None:
            if not stripped or indent_width > script_indent:
                output.append(line)
                continue
            script_indent = None

        script_header = SCRIPT_HEADER_RE.match(line)
        if script_header is not None:
            script_indent = _indent_width(script_header.group("indent"))
            output.append(line)
            continue

        key_value = KEY_VALUE_RE.match(line)
        if key_value is None:
            output.append(line)
            continue

        key = key_value.group("key").strip().lower()
        if not key.endswith(GEOMETRIC_KEY_ENDINGS):
            output.append(line)
            continue

        value = NUMBER_RE.sub(
            lambda match: _scale_number(match, factor),
            key_value.group("value"),
        )
        output.append(
            key_value.group("indent")
            + key_value.group("key")
            + key_value.group("separator")
            + value
            + (key_value.group("newline") or "")
        )

    return "".join(output)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("style", type=Path, help="MSE style file to update")
    parser.add_argument("--factor", type=float, required=True, help="positive scale factor")
    args = parser.parse_args()

    text = args.style.read_text(encoding="utf-8")
    scaled = scale_style_text(text, args.factor)
    args.style.write_text(scaled, encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

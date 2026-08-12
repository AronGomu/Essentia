#!/usr/bin/env python3
"""Rebuild every open public-stage package: aggregate, renders, hashes.

Run after editing cards in Magic Set Editor so the exported renders and
`package-sha256.json` match the MSE source again. Locked packages are
immutable and are skipped.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / ".script"))

from release_package import (  # noqa: E402
    CARDS_ROOT,
    PUBLIC_STAGES,
    LifecycleError,
    package_is_locked,
    rebuild,
)


def open_packages(cards_root: Path = CARDS_ROOT) -> list[Path]:
    found: list[Path] = []
    for stage_key in sorted(PUBLIC_STAGES):
        root = cards_root / stage_key
        if not root.is_dir():
            continue
        for child in sorted(root.iterdir()):
            if not child.is_dir() or child.name.startswith("."):
                continue
            if not (child / "release.json").is_file():
                continue
            if package_is_locked(child):
                print(f"skipping locked package: {child}")
                continue
            found.append(child)
    return found


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--verbose", action="store_true", help="print the full per-card render plan and completion JSON")
    parser.add_argument("--force", action="store_true", help="rebuild even when the stamp says nothing changed")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    packages = open_packages()
    if not packages:
        print("no open packages to rebuild")
        return 0
    for package in packages:
        rebuild(package, verbose=args.verbose, force=args.force)
    print(
        f"rebuild: {len(packages)} package rebuilt"
        if len(packages) == 1
        else f"rebuild: {len(packages)} packages rebuilt"
    )
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except LifecycleError as exc:
        print(f"rebuild error: {exc}", file=sys.stderr)
        raise SystemExit(1) from exc

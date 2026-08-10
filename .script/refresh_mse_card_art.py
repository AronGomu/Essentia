#!/usr/bin/env python3
"""Regenerate project-local MSE card art from canonical HD originals."""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image

from ensure_original_images import NAME_MAP
from fix_mse_project_images import resize_cover
from mse_content import load_manifest
from original_image_assets import REPO_ROOT, card_filename, card_type_folder
from release_package import package_is_locked

HD_IMAGES_ROOT = REPO_ROOT / "original_images_hd"
_CARD_TYPES = (
    "Effect Monster",
    "Normal Monster",
    "Fusion Monster",
    "Link Monster",
    "Ritual Monster",
    "Synchro Monster",
    "Xyz Monster",
    "Spell Card",
    "Trap Card",
)


def target_size(path: Path, factor: int = 4) -> tuple[int, int]:
    """Return current PNG dimensions multiplied by factor."""
    with Image.open(path) as image:
        width, height = image.size
    return width * factor, height * factor


def source_for(card_name: str) -> Path | None:
    """Return HD source matching cube name through canonical naming rules."""
    official_name = NAME_MAP.get(card_name, card_name)
    filename = card_filename(official_name, ".jpg")
    for card_type in _CARD_TYPES:
        candidate = HD_IMAGES_ROOT / card_type_folder({"type": card_type}) / filename
        if candidate.is_file():
            return candidate
    return None


def _locked_package(project: Path) -> Path | None:
    for parent in (project, *project.parents):
        if (parent / "release.json").is_file() and package_is_locked(parent):
            return parent
    return None


def refresh_project(project: Path, factor: int = 4, dry_run: bool = False) -> dict:
    """Refresh included card art, preserving card files and image paths."""
    project = project.resolve()
    locked = _locked_package(project)
    if locked:
        raise ValueError(f"locked package cannot be modified: {locked}")

    result = {"updated": [], "skipped_no_hd": [], "skipped_no_image": []}
    for card in load_manifest(project, allow_empty=True):
        if card.image_path is None:
            result["skipped_no_image"].append(card.name)
            continue
        source = source_for(card.name)
        if source is None:
            result["skipped_no_hd"].append(card.name)
            continue
        width, height = target_size(card.image_path, factor)
        if not dry_run:
            resize_cover(source, card.image_path, width, height)
        result["updated"].append(card.name)
    return result


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("project", type=Path)
    parser.add_argument("--factor", type=int, default=4)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    result = refresh_project(args.project, factor=args.factor, dry_run=args.dry_run)
    print(
        f"mse.art {args.project.stem}: {len(result['updated'])} updated, "
        f"{len(result['skipped_no_hd'])} no-HD, "
        f"{len(result['skipped_no_image'])} no-image"
    )


if __name__ == "__main__":
    main()

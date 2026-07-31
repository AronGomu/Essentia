#!/usr/bin/env python3
"""Create package-local print PDF plus auditable copy manifest."""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import re
from pathlib import Path

from PIL import Image, ImageDraw, ImageOps

REPO = Path(__file__).resolve().parents[1]
CARDS_ROOT = REPO / "cards_mse"
IMMUTABLE_STAGES = ("02_alpha", "04_beta", "06_released")
IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tif", ".tiff"}
PAGE_SIZES_IN = {"a4": (8.27, 11.69), "letter": (8.5, 11.0)}


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def natural_key(path: Path) -> list[object]:
    return [
        int(part) if part.isdigit() else part.casefold()
        for part in re.split(r"(\d+)", path.name)
    ]


def render_filename(name: str) -> str:
    safe = (
        name.replace(":", " -")
        .replace('"', "'")
        .replace("/", " - ")
        .replace("\\", " - ")
    )
    safe = "".join(char for char in safe if char not in "<>|?*").rstrip(". ")
    return f"{safe}.png"


def discover_render_folders(inputs: list[Path]) -> list[Path]:
    if inputs:
        return [
            (path if path.is_absolute() else REPO / path).resolve() for path in inputs
        ]
    return sorted(
        package / "renders"
        for stage in IMMUTABLE_STAGES
        for package in (CARDS_ROOT / stage).iterdir()
        if package.is_dir() and (package / "renders").is_dir()
    )


def collect_images(render_folders: list[Path]) -> list[Path]:
    images: list[Path] = []
    for folder in render_folders:
        if not folder.is_dir():
            raise FileNotFoundError(f"Render folder not found: {folder}")
        images.extend(
            sorted(
                (
                    path
                    for path in folder.iterdir()
                    if path.is_file() and path.suffix.casefold() in IMAGE_EXTENSIONS
                ),
                key=natural_key,
            )
        )
    return images


def _release_copy_counts(render_folder: Path) -> tuple[dict[str, int], dict[str, str]] | None:
    package = render_folder.parent
    release_path = package / "release.json"
    aggregate_path = package / "aggregate-manifest.json"
    if not release_path.is_file() or not aggregate_path.is_file():
        return None
    release = json.loads(release_path.read_text(encoding="utf-8"))
    aggregate = json.loads(aggregate_path.read_text(encoding="utf-8"))
    cards = aggregate.get("cards", [])
    name_by_id = {
        item["stableId"]: item["name"]
        for item in cards
        if isinstance(item, dict)
        and isinstance(item.get("stableId"), str)
        and isinstance(item.get("name"), str)
    }
    stable_by_render = {
        render_filename(name): stable_id for stable_id, name in name_by_id.items()
    }
    decks = release.get("decks", [])
    if not decks:
        return ({stable_id: 3 for stable_id in name_by_id}, stable_by_render)
    counts = {stable_id: 0 for stable_id in name_by_id}
    for deck in decks:
        if not isinstance(deck, dict) or not isinstance(deck.get("cards"), list):
            raise ValueError(f"Invalid deck metadata in {release_path}")
        distinct = set(deck["cards"])
        unknown = sorted(distinct - name_by_id.keys())
        if unknown:
            raise ValueError(f"Unknown deck card IDs in {release_path}: {unknown}")
        for stable_id in distinct:
            counts[stable_id] += 3
    return counts, stable_by_render


def copy_plan(images: list[Path], default_copies: int) -> list[dict[str, object]]:
    release_plan = None
    if images and len({path.parent for path in images}) == 1:
        release_plan = _release_copy_counts(images[0].parent)
    counts, stable_by_render = release_plan or ({}, {})
    plan: list[dict[str, object]] = []
    for image in images:
        stable_id = stable_by_render.get(image.name)
        copies = counts.get(stable_id, default_copies) if release_plan else default_copies
        if copies < 1:
            continue
        plan.append(
            {
                "image": image,
                "stableId": stable_id,
                "copies": copies,
                "sha256": sha256_file(image),
            }
        )
    return plan


def paste_card(page: Image.Image, image_path: Path, box: tuple[int, int, int, int]) -> None:
    left, top, width, height = box
    with Image.open(image_path) as raw:
        card = ImageOps.fit(
            raw.convert("RGB"),
            (width, height),
            method=Image.Resampling.LANCZOS,
            centering=(0.5, 0.5),
        )
        page.paste(card, (left, top))


def make_pdf(
    plan: list[dict[str, object]],
    output: Path,
    dpi: int,
    page_size: str,
    card_width_in: float,
    card_height_in: float,
    separator_px: int,
) -> int:
    page_width_in, page_height_in = PAGE_SIZES_IN[page_size]
    page_w, page_h = round(page_width_in * dpi), round(page_height_in * dpi)
    card_w, card_h = round(card_width_in * dpi), round(card_height_in * dpi)
    cols = max(1, math.floor((page_w + separator_px) / (card_w + separator_px)))
    rows = max(1, math.floor((page_h + separator_px) / (card_h + separator_px)))
    per_page = cols * rows
    used_w = cols * card_w + (cols - 1) * separator_px
    used_h = rows * card_h + (rows - 1) * separator_px
    margin_x, margin_y = (page_w - used_w) // 2, (page_h - used_h) // 2
    expanded = [
        item["image"] for item in plan for _ in range(int(item["copies"]))
    ]
    pages: list[Image.Image] = []
    for start in range(0, len(expanded), per_page):
        page = Image.new("RGB", (page_w, page_h), "white")
        draw = ImageDraw.Draw(page)
        batch = expanded[start : start + per_page]
        for index, image_path in enumerate(batch):
            row, col = divmod(index, cols)
            left = margin_x + col * (card_w + separator_px)
            top = margin_y + row * (card_h + separator_px)
            paste_card(page, image_path, (left, top, card_w, card_h))
        if separator_px:
            separator = (160, 160, 160)
            for index in range(1, len(batch)):
                row, col = divmod(index, cols)
                if col:
                    x = margin_x + col * card_w + (col - 1) * separator_px
                    draw.rectangle(
                        [x, margin_y, x + separator_px - 1, margin_y + used_h - 1],
                        fill=separator,
                    )
                if col == 0:
                    y = margin_y + row * card_h + (row - 1) * separator_px
                    draw.rectangle(
                        [margin_x, y, margin_x + used_w - 1, y + separator_px - 1],
                        fill=separator,
                    )
        pages.append(page)
    if not pages:
        raise RuntimeError("No pages generated; no selected render images were found.")
    output.parent.mkdir(parents=True, exist_ok=True)
    pages[0].save(
        output,
        "PDF",
        resolution=dpi,
        save_all=True,
        append_images=pages[1:],
    )
    return len(pages)


def write_manifest(
    manifest: Path,
    plan: list[dict[str, object]],
    output: Path,
    pages: int,
) -> None:
    root = manifest.parent
    entries = []
    for item in plan:
        image = Path(item["image"])
        try:
            display = image.relative_to(root).as_posix()
        except ValueError:
            display = str(image)
        entries.append(
            {
                "stableId": item["stableId"],
                "render": display,
                "sha256": item["sha256"],
                "copies": item["copies"],
            }
        )
    try:
        pdf = output.relative_to(root).as_posix()
    except ValueError:
        pdf = str(output)
    manifest.write_text(
        json.dumps(
            {
                "schemaVersion": 1,
                "copyRule": "3 copies per distinct card per deck; gameplay quantity ignored",
                "pdf": pdf,
                "pages": pages,
                "totalCards": sum(int(item["copies"]) for item in plan),
                "cards": entries,
            },
            indent=2,
            sort_keys=True,
        )
        + "\n",
        encoding="utf-8",
    )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", "-i", action="append", type=Path)
    parser.add_argument("--output", "-o", type=Path)
    parser.add_argument("--manifest", type=Path)
    parser.add_argument("--copies", "-c", type=int, default=3)
    parser.add_argument("--dpi", type=int, default=300)
    parser.add_argument("--page-size", choices=sorted(PAGE_SIZES_IN), default="a4")
    parser.add_argument("--card-width", type=float, default=2.5)
    parser.add_argument("--card-height", type=float, default=3.5)
    parser.add_argument("--separator-px", type=int, default=1)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    if args.copies < 1:
        raise ValueError("--copies must be at least 1")
    folders = discover_render_folders(args.input or [])
    images = collect_images(folders)
    if not images:
        raise RuntimeError(f"No render images found. Searched: {folders}")
    if args.output:
        output = args.output if args.output.is_absolute() else REPO / args.output
    elif len(folders) == 1:
        output = folders[0].parent / f"{folders[0].parent.name}_print.pdf"
    else:
        raise ValueError("--output is required for multiple immutable packages")
    manifest = args.manifest or output.with_name("print-manifest.json")
    manifest = manifest if manifest.is_absolute() else REPO / manifest
    plan = copy_plan(images, args.copies)
    pages = make_pdf(
        plan,
        output,
        args.dpi,
        args.page_size,
        args.card_width,
        args.card_height,
        args.separator_px,
    )
    write_manifest(manifest, plan, output, pages)
    print(f"Created: {output}")
    print(f"Manifest: {manifest}")
    print(f"Distinct renders: {len(plan)}; proxy cards: {sum(int(item['copies']) for item in plan)}; pages: {pages}")


if __name__ == "__main__":
    main()

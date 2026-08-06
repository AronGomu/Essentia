#!/usr/bin/env python3
"""Generate print-ready PDFs from package renders.

Standalone one-off print tool. Not part of `release_package.py`; packages never
store PDFs. Default run prints every public-stage package, two copies per card:

    python .script/generate_print_pdfs.py

Per-card exceptions use repeatable `--copies-for "Card Name=N"`. `N` of 0 drops
the card. Unknown names fail loudly instead of printing the wrong sheet.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import re
import unicodedata
from pathlib import Path

from PIL import Image, ImageDraw, ImageOps

REPO = Path(__file__).resolve().parents[1]
CARDS_ROOT = REPO / "cards_mse"
DEFAULT_OUTPUT_DIR = REPO / "print"
PUBLIC_STAGES = ("01_alpha", "02_beta", "03_release")
IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tif", ".tiff"}
PAGE_SIZES_IN = {"a4": (8.27, 11.69), "letter": (8.5, 11.0)}
DEFAULT_COPIES = 2


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


def card_key(value: str) -> str:
    """Match user-supplied card names against render filenames."""
    return "".join(
        character.casefold()
        for character in unicodedata.normalize("NFKD", value)
        if character.isalnum()
    )


def parse_copy_override(value: str) -> tuple[str, int]:
    name, separator, count = value.rpartition("=")
    if not separator or not name.strip():
        raise argparse.ArgumentTypeError(
            f"--copies-for expects 'Card Name=N', got {value!r}"
        )
    try:
        copies = int(count)
    except ValueError:
        raise argparse.ArgumentTypeError(
            f"--copies-for count must be an integer, got {count!r}"
        ) from None
    if copies < 0:
        raise argparse.ArgumentTypeError("--copies-for count cannot be negative")
    return name.strip(), copies


def discover_render_folders(inputs: list[Path]) -> list[Path]:
    if inputs:
        return [
            (path if path.is_absolute() else REPO / path).resolve() for path in inputs
        ]
    return sorted(
        package / "renders"
        for stage in PUBLIC_STAGES
        if (CARDS_ROOT / stage).is_dir()
        for package in (CARDS_ROOT / stage).iterdir()
        if package.is_dir() and (package / "renders").is_dir()
    )


def collect_images(folder: Path) -> list[Path]:
    if not folder.is_dir():
        raise FileNotFoundError(f"Render folder not found: {folder}")
    return sorted(
        (
            path
            for path in folder.iterdir()
            if path.is_file() and path.suffix.casefold() in IMAGE_EXTENSIONS
        ),
        key=natural_key,
    )


def copy_plan(
    images: list[Path],
    default_copies: int,
    overrides: dict[str, int],
) -> tuple[list[dict[str, object]], set[str]]:
    """Return per-image copy counts plus the override keys that matched."""
    plan: list[dict[str, object]] = []
    matched: set[str] = set()
    for image in images:
        key = card_key(image.stem)
        copies = overrides.get(key, default_copies)
        if key in overrides:
            matched.add(key)
        if copies < 1:
            continue
        plan.append(
            {
                "image": image,
                "card": image.stem,
                "copies": copies,
                "sha256": sha256_file(image),
            }
        )
    return plan, matched


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
    expanded = [item["image"] for item in plan for _ in range(int(item["copies"]))]
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
    renders: Path,
    output: Path,
    default_copies: int,
    pages: int,
) -> None:
    def display(path: Path) -> str:
        try:
            return path.relative_to(REPO).as_posix()
        except ValueError:
            return str(path)

    manifest.parent.mkdir(parents=True, exist_ok=True)
    manifest.write_text(
        json.dumps(
            {
                "schemaVersion": 2,
                "copyRule": f"{default_copies} copies per card unless overridden",
                "renders": display(renders),
                "pdf": display(output),
                "pages": pages,
                "totalCards": sum(int(item["copies"]) for item in plan),
                "cards": [
                    {
                        "card": item["card"],
                        "render": Path(item["image"]).name,
                        "sha256": item["sha256"],
                        "copies": item["copies"],
                    }
                    for item in plan
                ],
            },
            indent=2,
            sort_keys=True,
        )
        + "\n",
        encoding="utf-8",
    )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument(
        "--input",
        "-i",
        action="append",
        type=Path,
        help="render folder; repeatable. Default: every public-stage package.",
    )
    parser.add_argument(
        "--output-dir",
        "-o",
        type=Path,
        default=DEFAULT_OUTPUT_DIR,
        help="directory receiving PDFs and manifests (default: print/)",
    )
    parser.add_argument(
        "--copies",
        "-c",
        type=int,
        default=DEFAULT_COPIES,
        help=f"copies of every card (default: {DEFAULT_COPIES})",
    )
    parser.add_argument(
        "--copies-for",
        action="append",
        type=parse_copy_override,
        default=[],
        metavar="NAME=N",
        help="override copies for one card; repeatable",
    )
    parser.add_argument("--dpi", type=int, default=300)
    parser.add_argument("--page-size", choices=sorted(PAGE_SIZES_IN), default="a4")
    parser.add_argument("--card-width", type=float, default=2.5)
    parser.add_argument("--card-height", type=float, default=3.5)
    parser.add_argument("--separator-px", type=int, default=1)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    if args.copies < 0:
        raise ValueError("--copies cannot be negative")
    overrides = {card_key(name): count for name, count in args.copies_for}
    if len(overrides) != len(args.copies_for):
        raise ValueError("--copies-for names must be distinct")
    folders = discover_render_folders(args.input or [])
    if not folders:
        raise RuntimeError(f"No render folders found under {CARDS_ROOT}")
    output_dir = (
        args.output_dir if args.output_dir.is_absolute() else REPO / args.output_dir
    )
    matched: set[str] = set()
    for folder in folders:
        images = collect_images(folder)
        if not images:
            raise RuntimeError(f"No render images found in {folder}")
        plan, folder_matched = copy_plan(images, args.copies, overrides)
        matched |= folder_matched
        if not plan:
            raise RuntimeError(f"Every card was dropped to zero copies in {folder}")
        stem = folder.parent.name
        output = output_dir / f"{stem}_print.pdf"
        manifest = output_dir / f"{stem}_print-manifest.json"
        pages = make_pdf(
            plan,
            output,
            args.dpi,
            args.page_size,
            args.card_width,
            args.card_height,
            args.separator_px,
        )
        write_manifest(manifest, plan, folder, output, args.copies, pages)
        total = sum(int(item["copies"]) for item in plan)
        print(f"Created: {output}")
        print(f"Manifest: {manifest}")
        print(f"Distinct cards: {len(plan)}; printed cards: {total}; pages: {pages}")
    unmatched = sorted(
        name for name, _ in args.copies_for if card_key(name) not in matched
    )
    if unmatched:
        raise RuntimeError(f"--copies-for matched no render: {', '.join(unmatched)}")


if __name__ == "__main__":
    main()

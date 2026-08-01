#!/usr/bin/env python3
"""Validate and export canonical Magic Set Editor renders.

Limits: set 2 MiB, card 512 KiB, 500 cards/project, encoded image 64 MiB,
12,000 px/axis, 80 million decoded pixels. Linked, absolute, UNC,
drive-relative, and project-escaping source paths are rejected.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import traceback
import unicodedata
from datetime import datetime, timezone
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from launcher.mse_config import MSEConfig  # noqa: E402
from mse_content import (  # noqa: E402
    MAX_DECODED_PIXELS,
    MAX_IMAGE_BYTES,
    MAX_IMAGE_HEIGHT,
    MAX_IMAGE_WIDTH,
    MSESourceError,
    load_manifest,
    set_time_modified,
    sha256_file,
    visual_source_hash,
)

PROVENANCE_SCHEMA = 2
SUPPORTED_PROVENANCE_SCHEMAS = {1, PROVENANCE_SCHEMA}
RENDER_TRANSFORM = {"id": "transparent-white-corners", "version": 1}
CORNER_SCAN_DIVISOR = 10
PIXEL_HASH_CHUNK_ROWS = 64
UNSAFE_FILENAME = re.compile(r'[<>:"/\\|?*]')


def render_filename(name: str) -> str:
    safe = (
        name.replace(":", " -")
        .replace('"', "'")
        .replace("/", " - ")
        .replace("\\", " - ")
    )
    safe = "".join(char for char in safe if char not in "<>|?*").rstrip(". ")
    if not safe or safe in {".", ".."}:
        raise MSESourceError(f"card name cannot produce a portable render filename: {name}")
    return f"{safe}.png"


def validate_export_name(name: str) -> None:
    if (
        not name
        or name in {".", ".."}
        or "/" in name
        or "\\" in name
        or any(ord(character) < 32 for character in name)
    ):
        raise MSESourceError(f"unsafe card name for MSE export: {name!r}")


def filename_key(value: str) -> str:
    return "".join(
        character.casefold()
        for character in unicodedata.normalize("NFKD", value)
        if character.isalnum()
    )


def decode_png(path: Path) -> tuple[int, int]:
    size = path.stat().st_size
    if size > MAX_IMAGE_BYTES:
        raise MSESourceError(f"render exceeds {MAX_IMAGE_BYTES} bytes: {path.name}")
    Image.MAX_IMAGE_PIXELS = MAX_DECODED_PIXELS
    with Image.open(path) as image:
        if image.format != "PNG":
            raise MSESourceError(f"render is not PNG: {path.name}")
        width, height = image.size
        if width > MAX_IMAGE_WIDTH or height > MAX_IMAGE_HEIGHT:
            raise MSESourceError(f"render dimensions exceed limits: {path.name}")
        if width * height > MAX_DECODED_PIXELS:
            raise MSESourceError(f"render decoded pixels exceed limit: {path.name}")
        image.verify()
    return width, height


def make_white_corners_transparent(path: Path) -> None:
    """Remove pure-white outer corner runs while preserving enclosed card whites."""
    Image.MAX_IMAGE_PIXELS = MAX_DECODED_PIXELS
    with Image.open(path) as source:
        rgba = source.convert("RGBA")

    pixels = rgba.load()
    span = max(1, min(rgba.size) // CORNER_SCAN_DIVISOR)
    rows = (*range(span), *range(rgba.height - span, rgba.height))

    def clear_white_run(y: int, start: int, step: int) -> None:
        x = start
        for _ in range(span):
            pixel = pixels[x, y]
            if pixel[3] != 0 and pixel[:3] != (255, 255, 255):
                break
            pixels[x, y] = (*pixel[:3], 0)
            x += step

    for y in rows:
        clear_white_run(y, 0, 1)
        clear_white_run(y, rgba.width - 1, -1)
    corners = (
        (0, 0),
        (rgba.width - 1, 0),
        (0, rgba.height - 1),
        (rgba.width - 1, rgba.height - 1),
    )
    if any(rgba.getpixel(corner)[3] != 0 for corner in corners):
        raise MSESourceError(f"render has opaque non-white corner: {path.name}")
    rgba.save(path, format="PNG")


def pixel_hash(path: Path) -> str:
    size = path.stat().st_size
    if size > MAX_IMAGE_BYTES:
        raise MSESourceError(f"render exceeds {MAX_IMAGE_BYTES} bytes: {path.name}")
    Image.MAX_IMAGE_PIXELS = MAX_DECODED_PIXELS
    with Image.open(path) as image:
        if image.format != "PNG":
            raise MSESourceError(f"render is not PNG: {path.name}")
        width, height = image.size
        if width > MAX_IMAGE_WIDTH or height > MAX_IMAGE_HEIGHT:
            raise MSESourceError(f"render dimensions exceed limits: {path.name}")
        if width * height > MAX_DECODED_PIXELS:
            raise MSESourceError(f"render decoded pixels exceed limit: {path.name}")
        normalized = image.convert("RGBA")
        digest = hashlib.sha256()
        digest.update(f"{width}x{height}:RGBA\n".encode())
        for top in range(0, height, PIXEL_HASH_CHUNK_ROWS):
            bottom = min(top + PIXEL_HASH_CHUNK_ROWS, height)
            digest.update(normalized.crop((0, top, width, bottom)).tobytes())
        return digest.hexdigest()


def load_provenance(path: Path) -> dict[str, object] | None:
    if not path.is_file():
        return None
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise MSESourceError(f"invalid existing render provenance: {path}") from exc
    if (
        not isinstance(value, dict)
        or value.get("schemaVersion") not in SUPPORTED_PROVENANCE_SCHEMAS
        or not isinstance(value.get("cards"), list)
    ):
        raise MSESourceError(f"invalid existing render provenance schema: {path}")
    return value


def build_provenance(project: Path, cards: list, render_dir: Path, config: MSEConfig) -> dict[str, object]:
    set_text = (project / "set").read_text(encoding="utf-8-sig")
    mse_version = re.search(r"(?m)^mse_version:\s*(.+)$", set_text)
    game = re.search(r"(?m)^game:\s*(.+)$", set_text)
    stylesheet = re.search(r"(?m)^stylesheet:\s*(.+)$", set_text)
    return {
        "schemaVersion": PROVENANCE_SCHEMA,
        "project": project.name,
        "exportedAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "mse": {
            "version": mse_version.group(1).strip() if mse_version else "unknown",
            "game": game.group(1).strip() if game else "unknown",
            "stylesheet": stylesheet.group(1).strip() if stylesheet else "unknown",
            "cli": config.cli.name,
        },
        "renderTransform": RENDER_TRANSFORM,
        "cards": [
            {
                "id": card.source_name,
                "name": card.name,
                "manifestIndex": card.index,
                "sourceHash": visual_source_hash(project, card),
                "artworkHash": sha256_file(card.image_path) if card.image_path else None,
                "render": render_filename(card.name),
                "renderHash": sha256_file(render_dir / render_filename(card.name)),
                "renderPixelHash": pixel_hash(render_dir / render_filename(card.name)),
            }
            for card in cards
        ],
    }


def inspect_project(project: Path) -> tuple[list, list[dict[str, object]]]:
    cards = load_manifest(project)
    provenance = load_provenance(project / "render-provenance.json")
    old_by_id = {
        item.get("id"): item
        for item in (provenance or {}).get("cards", [])  # type: ignore[union-attr]
        if isinstance(item, dict)
    }
    canonical = project / "render"
    provenance_current = bool(
        provenance
        and provenance.get("schemaVersion") == PROVENANCE_SCHEMA
        and provenance.get("renderTransform") == RENDER_TRANSFORM
    )
    rows: list[dict[str, object]] = []
    expected: set[str] = set()
    for card in cards:
        filename = render_filename(card.name)
        expected.add(filename)
        render = canonical / filename
        source_hash = visual_source_hash(project, card)
        prior = old_by_id.get(card.source_name, {})
        missing = not render.is_file()
        render_matches = not missing
        if render_matches and provenance_current:
            render_matches = (
                prior.get("renderHash") == sha256_file(render)
                and prior.get("renderPixelHash") == pixel_hash(render)
            )
        stale = (
            missing
            or not provenance_current
            or prior.get("sourceHash") != source_hash
            or not render_matches
        )
        rows.append(
            {
                "index": card.index,
                "source": card.source_name,
                "name": card.name,
                "created": card.created,
                "modified": card.modified,
                "artwork": str(card.image_path.relative_to(project)) if card.image_path else None,
                "render": str(render),
                "missing": missing,
                "stale": stale,
            }
        )
    extras = sorted(path.name for path in canonical.glob("*.png") if path.name not in expected)
    if extras:
        raise MSESourceError(f"stale extra canonical renders: {', '.join(extras)}")
    return cards, rows


def export(project: Path, output: Path, config: MSEConfig) -> dict[str, object]:
    cards, _ = inspect_project(project)
    output.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="mse-render-export-") as temporary:
        for card in cards:
            validate_export_name(card.name)
        temporary_path = Path(temporary)
        pattern = str(temporary_path / "{card.name}.png")
        result = subprocess.run(
            [str(config.cli), "--export-images", str(project), pattern],
            capture_output=True,
            text=True,
            timeout=300,
            check=False,
        )
        if result.returncode != 0:
            raise RuntimeError(
                f"MSE export failed ({result.returncode})\nstdout={result.stdout}\nstderr={result.stderr}"
            )
        exports = sorted(temporary_path.glob("*.png"))
        if len(exports) != len(cards):
            raise MSESourceError(f"MSE exported {len(exports)} PNGs; expected {len(cards)}")
        actual_by_key: dict[str, Path] = {}
        for exported in exports:
            key = filename_key(exported.stem)
            if key in actual_by_key:
                raise MSESourceError(f"MSE export filename collision: {exported.name}")
            actual_by_key[key] = exported
            decode_png(exported)
            make_white_corners_transparent(exported)
            decode_png(exported)
        expected_by_key: dict[str, object] = {}
        for card in cards:
            key = filename_key(card.name)
            if key in expected_by_key:
                raise MSESourceError(f"card filename collision: {card.name}")
            expected_by_key[key] = card
        if actual_by_key.keys() != expected_by_key.keys():
            raise MSESourceError(
                f"MSE export names differ: missing={sorted(expected_by_key.keys() - actual_by_key.keys())} extra={sorted(actual_by_key.keys() - expected_by_key.keys())}"
            )

        staging = output.parent / f".{output.name}.staging"
        if staging.exists():
            shutil.rmtree(staging)
        staging.mkdir(parents=True)
        provenance_temp: Path | None = None
        try:
            for key, card in expected_by_key.items():
                destination = staging / render_filename(card.name)
                if destination.resolve().parent != staging.resolve():
                    raise MSESourceError(
                        f"render filename escapes staging: {card.name}"
                    )
                shutil.copyfile(actual_by_key[key], destination)
            provenance = build_provenance(project, cards, staging, config)
            canonical = output == project / "render"
            if canonical:
                provenance_temp = project / ".render-provenance.json.staging"
                provenance_temp.write_text(
                    json.dumps(provenance, indent=2) + "\n", encoding="utf-8"
                )
            backup = output.parent / f".{output.name}.previous"
            if backup.exists():
                shutil.rmtree(backup)
            if output.exists():
                output.replace(backup)
            try:
                staging.replace(output)
                if provenance_temp:
                    provenance_temp.replace(project / "render-provenance.json")
            except BaseException:
                if output.exists():
                    shutil.rmtree(output)
                if backup.exists():
                    backup.replace(output)
                raise
            if backup.exists():
                shutil.rmtree(backup)
        finally:
            if staging.exists():
                shutil.rmtree(staging)
            if provenance_temp and provenance_temp.exists():
                provenance_temp.unlink()
    return provenance


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("project", type=Path, help="one folder-form .mse-set below configured projects root")
    target = parser.add_mutually_exclusive_group()
    target.add_argument("--output", type=Path, help="explicit external output directory")
    target.add_argument("--canonical", action="store_true", help="atomically update project render/ + provenance")
    target.add_argument(
        "--attest-canonical",
        action="store_true",
        help="fresh-export to a temporary directory, verify pixel equality, then write canonical provenance",
    )
    parser.add_argument("--dry-run", action="store_true", help="validate sources and print planned JSON without exporting")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    config = MSEConfig.load()
    projects_root = Path(os.path.realpath(config.projects_dir))
    project = Path(os.path.realpath(args.project if args.project.is_absolute() else ROOT / args.project))
    try:
        project.relative_to(projects_root)
    except ValueError as exc:
        raise MSESourceError(f"project must be below configured projects root: {project}") from exc
    if project.is_symlink() or (hasattr(os.path, "isjunction") and os.path.isjunction(project)):
        raise MSESourceError("project links are forbidden")
    cards, rows = inspect_project(project)
    output = project / "render" if args.canonical else args.output
    if output is not None and not output.is_absolute():
        output = (ROOT / output).resolve()
    print(json.dumps({"event": "mse.render.plan", "project": project.name, "count": len(cards), "output": str(output) if output else None, "cards": rows}, indent=2))
    if args.dry_run:
        return 0
    if args.attest_canonical:
        with tempfile.TemporaryDirectory(prefix="mse-canonical-attestation-") as temporary:
            fresh = export(project, Path(temporary) / "render", config)
            canonical = build_provenance(project, cards, project / "render", config)
            fresh_by_id = {item["id"]: item for item in fresh["cards"]}
            for item in canonical["cards"]:
                exported = fresh_by_id.get(item["id"])
                if not exported or exported["renderPixelHash"] != item["renderPixelHash"]:
                    raise MSESourceError(
                        f"canonical render differs from fresh export: {item['name']}"
                    )
            provenance_path = project / "render-provenance.json"
            provenance_path.write_text(
                json.dumps(canonical, indent=2) + "\n", encoding="utf-8"
            )
        print(
            json.dumps(
                {
                    "event": "mse.render.attested",
                    "project": project.name,
                    "count": len(cards),
                }
            )
        )
        return 0
    if output is None:
        raise MSESourceError("choose --output or --canonical unless using --dry-run")
    if not args.canonical:
        output_real = Path(os.path.realpath(output))
        try:
            output_real.relative_to(Path(os.path.realpath(project)))
        except ValueError:
            pass
        else:
            raise MSESourceError("external --output must be outside active .mse-set")
    prior_provenance = (
        load_provenance(project / "render-provenance.json") if args.canonical else None
    )
    provenance = export(project, output, config)
    timestamp_updates: list[str] = []
    if prior_provenance:
        prior_cards = {
            item.get("id"): item
            for item in prior_provenance.get("cards", [])
            if isinstance(item, dict)
        }
        current_cards = {
            item.get("id"): item
            for item in provenance.get("cards", [])
            if isinstance(item, dict)
        }
        for card in cards:
            prior = prior_cards.get(card.source_name)
            current = current_cards.get(card.source_name)
            if not prior or not current:
                continue
            artwork_changed = prior.get("artworkHash") != current.get("artworkHash")
            render_changed = (
                prior.get("renderPixelHash") != current.get("renderPixelHash")
            )
            if artwork_changed and render_changed:
                raw = card.source_path.read_bytes()
                had_bom = raw.startswith(b"\xef\xbb\xbf")
                text = raw.decode("utf-8-sig")
                updated = set_time_modified(text, datetime.now())
                card.source_path.write_text(
                    updated,
                    encoding="utf-8-sig" if had_bom else "utf-8",
                    newline="\n",
                )
                timestamp_updates.append(card.source_name)
    if not args.canonical:
        provenance_path = output / "render-provenance.json"
        provenance_path.write_text(
            json.dumps(provenance, indent=2) + "\n", encoding="utf-8"
        )
    print(json.dumps({"event": "mse.render.complete", "project": project.name, "count": len(cards), "output": str(output), "timestampUpdates": timestamp_updates}))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (MSESourceError, OSError, RuntimeError, subprocess.TimeoutExpired) as error:
        print(
            json.dumps(
                {
                    "event": "mse.render.error",
                    "errorType": type(error).__name__,
                    "error": str(error),
                    "traceback": traceback.format_exc(),
                }
            ),
            file=sys.stderr,
        )
        raise SystemExit(1)

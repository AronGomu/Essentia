"""Shared safe helpers for canonical MSE card sources.

Website builds and render exports treat folder-form ``.mse-set`` projects as
read-only input.  This module owns path containment, manifest parsing, source
fingerprints, and meaningful ``time_modified`` updates.
"""

from __future__ import annotations

import hashlib
import os
import re
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path, PureWindowsPath
from typing import Iterable

from PIL import Image, UnidentifiedImageError

MAX_SET_BYTES = 2 * 1024 * 1024
MAX_CARD_BYTES = 512 * 1024
MAX_CARDS = 500
MAX_IMAGE_BYTES = 64 * 1024 * 1024
MAX_IMAGE_WIDTH = 12_000
MAX_IMAGE_HEIGHT = 12_000
MAX_DECODED_PIXELS = 80_000_000
TIMESTAMP_FORMAT = "%Y-%m-%d %H:%M:%S"

_INCLUDE_RE = re.compile(r"(?m)^include_file:\s*(.+?)\s*$")
_FIELD_RE = re.compile(r"(?m)^\t([^:\n]+):(?:\s?(.*))?$")
_TIME_RE = re.compile(r"(?m)^\ttime_modified:\s*.*$")


class MSESourceError(ValueError):
    """Source input violates publication or containment rules."""


@dataclass(frozen=True)
class ManifestCard:
    index: int
    source_path: Path
    source_name: str
    name: str
    image_path: Path | None
    created: str | None
    modified: str | None


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def validate_image(path: Path) -> None:
    size = path.stat().st_size
    if size > MAX_IMAGE_BYTES:
        raise MSESourceError(f"image exceeds {MAX_IMAGE_BYTES} bytes: {path.name}")
    Image.MAX_IMAGE_PIXELS = MAX_DECODED_PIXELS
    try:
        with Image.open(path) as image:
            width, height = image.size
            if width > MAX_IMAGE_WIDTH or height > MAX_IMAGE_HEIGHT:
                raise MSESourceError(f"image dimensions exceed limits: {path.name}")
            if width * height > MAX_DECODED_PIXELS:
                raise MSESourceError(f"image decoded pixels exceed limit: {path.name}")
            image.verify()
    except (OSError, UnidentifiedImageError) as exc:
        raise MSESourceError(f"invalid image: {path.name}") from exc


def _reject_windows_variant(raw: str) -> None:
    win = PureWindowsPath(raw)
    if raw.startswith(("\\\\", "//")):
        raise MSESourceError(f"UNC paths are forbidden: {raw}")
    if win.drive and not win.root:
        raise MSESourceError(f"drive-relative paths are forbidden: {raw}")
    if win.is_absolute() or Path(raw).is_absolute():
        raise MSESourceError(f"absolute paths are forbidden: {raw}")


def _contains_link(path: Path, stop: Path) -> bool:
    cursor = path
    while True:
        if cursor.is_symlink() or (hasattr(os.path, "isjunction") and os.path.isjunction(cursor)):
            return True
        if cursor == stop or cursor.parent == cursor:
            return False
        cursor = cursor.parent


def contained_path(root: Path, raw: str, *, must_exist: bool = True) -> Path:
    """Resolve a relative path below root; reject links and Windows escapes."""
    _reject_windows_variant(raw)
    root_real = Path(os.path.realpath(root))
    if _contains_link(root, root):
        raise MSESourceError(f"source root cannot be a link: {root}")
    candidate = root / raw.replace("\\", "/")
    if _contains_link(candidate, root):
        raise MSESourceError(f"linked paths are forbidden: {raw}")
    resolved = Path(os.path.realpath(candidate))
    try:
        resolved.relative_to(root_real)
    except ValueError as exc:
        raise MSESourceError(f"path escapes source root: {raw}") from exc
    if must_exist and not resolved.is_file():
        raise MSESourceError(f"source file is missing: {raw}")
    return resolved


def read_limited(path: Path, limit: int) -> str:
    size = path.stat().st_size
    if size > limit:
        raise MSESourceError(f"{path.name} exceeds {limit} bytes")
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
        raise MSESourceError(f"duplicate field: {name}")
    return values[0].strip() if values else None


def load_manifest(project: Path, *, allow_empty: bool = False) -> list[ManifestCard]:
    project = Path(os.path.realpath(project))
    set_path = contained_path(project, "set")
    set_text = read_limited(set_path, MAX_SET_BYTES)
    includes = _INCLUDE_RE.findall(set_text)
    if not includes:
        if allow_empty:
            return []
        raise MSESourceError("manifest contains no cards")
    if len(includes) > MAX_CARDS:
        raise MSESourceError(f"manifest exceeds {MAX_CARDS} cards")
    if len(includes) != len(set(includes)):
        raise MSESourceError("manifest contains duplicate include_file entries")

    result: list[ManifestCard] = []
    seen_names: set[str] = set()
    for index, source_name in enumerate(includes):
        card_path = contained_path(project, source_name)
        text = read_limited(card_path, MAX_CARD_BYTES)
        fields = field_values(text)
        name = one_field(fields, "name")
        if not name:
            raise MSESourceError(f"missing card name: {source_name}")
        folded = name.casefold()
        if folded in seen_names:
            raise MSESourceError(f"duplicate included display name: {name}")
        seen_names.add(folded)
        image_raw = one_field(fields, "image")
        image_path = contained_path(project, image_raw) if image_raw else None
        if image_path:
            validate_image(image_path)
        result.append(
            ManifestCard(
                index=index,
                source_path=card_path,
                source_name=source_name,
                name=name,
                image_path=image_path,
                created=one_field(fields, "time_created"),
                modified=one_field(fields, "time_modified"),
            )
        )
    return result


def _normalized_lines(text: str, excluded: Iterable[str]) -> bytes:
    excluded_set = set(excluded)
    fields = field_values(text)
    lines: list[str] = []
    for key in sorted(fields):
        if key in excluded_set:
            continue
        for value in fields[key]:
            normalized = "\n".join(part.rstrip() for part in value.splitlines()).strip()
            lines.append(f"{key}:{normalized}")
    return ("\n".join(lines) + "\n").encode("utf-8")


def semantic_fingerprint(card_path: Path) -> str:
    text = read_limited(card_path, MAX_CARD_BYTES)
    payload = _normalized_lines(
        text,
        {
            "notes",
            "time_created",
            "time_modified",
            "image",
            "image_2",
            "mainframe_image",
            "mainframe_image_2",
            "card_code_text",
            "card_code_text_2",
            "card_code_text_3",
        },
    )
    return sha256_bytes(payload)


def visual_source_hash(project: Path, card: ManifestCard) -> str:
    set_text = read_limited(project / "set", MAX_SET_BYTES)
    set_visual = "\n".join(
        line.rstrip()
        for line in set_text.replace("\r\n", "\n").replace("\r", "\n").splitlines()
        if not line.lstrip().startswith(("description:", "artist:", "copyright:"))
    )
    card_text = read_limited(card.source_path, MAX_CARD_BYTES)
    card_visual = _normalized_lines(card_text, {"notes", "time_created", "time_modified"})
    art_hash = sha256_file(card.image_path) if card.image_path else ""
    payload = (
        f"manifest-index:{card.index}\n{set_visual}\nart:{art_hash}\n".encode("utf-8")
        + card_visual
    )
    return sha256_bytes(payload)


def set_time_modified(text: str, value: datetime) -> str:
    stamp = value.strftime(TIMESTAMP_FORMAT)
    replacement = f"\ttime_modified: {stamp}"
    if _TIME_RE.search(text):
        return _TIME_RE.sub(replacement, text, count=1)
    marker = re.search(r"(?m)^\tname:", text)
    if not marker:
        raise MSESourceError("cannot insert time_modified without card name")
    return text[: marker.start()] + replacement + "\n" + text[marker.start() :]


def update_time_modified_if_semantic_changed(
    before: str, after: str, *, now: datetime | None = None
) -> str:
    """Advance timestamp only when visible non-art card fields changed."""
    before_fp = sha256_bytes(
        _normalized_lines(before, {"notes", "time_created", "time_modified", "image", "image_2", "mainframe_image", "mainframe_image_2", "card_code_text", "card_code_text_2", "card_code_text_3"})
    )
    after_fp = sha256_bytes(
        _normalized_lines(after, {"notes", "time_created", "time_modified", "image", "image_2", "mainframe_image", "mainframe_image_2", "card_code_text", "card_code_text_2", "card_code_text_3"})
    )
    if before_fp == after_fp:
        prior = _TIME_RE.search(before)
        if prior and _TIME_RE.search(after):
            return _TIME_RE.sub(prior.group(0), after, count=1)
        return after
    return set_time_modified(after, now or datetime.now())

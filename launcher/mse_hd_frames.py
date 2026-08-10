"""Install user-staged HD frame overlays into the vendored MSE tree."""

from __future__ import annotations

import re
import shutil
import sys
from pathlib import Path

from PIL import Image

from launcher.mse_vendor import Manifest, VendorError, sha256_file

REPO_ROOT = Path(__file__).resolve().parents[1]
SCRIPT_DIR = REPO_ROOT / ".script"
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

from scale_mse_style import scale_style_text

HD_PACKS = (
    "magic-sevenhalf.mse-style",
    "magic-m15-spellbook.mse-style",
    "magic-m15-sketch.mse-style",
    "magic-m15-showcase-praetor.mse-style",
)
CAPENNA_PACK = "magic-m15-showcase-capenna-art-deco.mse-style"
IMAGE_SUFFIXES = (".png", ".jpg", ".jpeg")
CAPENNA_SOURCE_WIDTH = 744
CAPENNA_FINAL_SIZE = (750, 1046)
CAPENNA_RESIZE_SIZE = (750, 1047)


def _contained(root: Path, relative: str) -> Path:
    root = root.resolve()
    target = (root / relative).resolve()
    if target == root or root not in target.parents:
        raise VendorError(f"HD frame path escapes its root: {relative}")
    return target


def _set_card_size(text: str, width: int, height: int) -> str:
    text = re.sub(
        r"(?m)^(card width:[ \t]*)[^\r\n]+",
        lambda match: f"{match.group(1)}{width}",
        text,
    )
    return re.sub(
        r"(?m)^(card height:[ \t]*)[^\r\n]+",
        lambda match: f"{match.group(1)}{height}",
        text,
    )


def _write_scaled_style(path: Path, factor: float, width: int, height: int) -> None:
    text = path.read_text(encoding="utf-8")
    path.write_text(
        _set_card_size(scale_style_text(text, factor), width, height),
        encoding="utf-8",
    )


def _resize_capenna(path: Path) -> None:
    with Image.open(path) as image:
        image.load()
        image_format = image.format
        resized = image.resize(CAPENNA_RESIZE_SIZE, Image.Resampling.LANCZOS)
        cropped = resized.crop((0, 0, *CAPENNA_FINAL_SIZE))
    cropped.save(path, format=image_format)


def _require_source_or_final(
    path: Path,
    relative: str,
    manifest: Manifest,
    transform,
) -> bool:
    """Transform source state once; return whether file changed."""
    if not path.is_file():
        raise VendorError(f"HD frame install target missing: {relative}")
    actual = sha256_file(path)
    final = manifest.entries.get(relative)
    source_entries = manifest.source_entries or {}
    source = source_entries.get(relative)
    if actual == final:
        return False
    if source is None or actual != source:
        raise VendorError(
            f"HD frame install target is neither source nor final: {relative} (sha256 {actual})"
        )
    transform(path)
    return True


def validate_hd_inputs(staging: Path, manifest: Manifest) -> dict[str, Path]:
    """Validate exact allowlisted pack names, paths, hashes, regular files."""
    staging = staging.expanduser().resolve()
    if not staging.is_dir():
        raise VendorError(f"HD frame staging directory is not a directory: {staging}")
    contract = manifest.hd_frames or {}
    packs = tuple(contract.get("packs", ()))
    if packs != HD_PACKS:
        raise VendorError(f"MSE manifest HD pack allowlist does not match installer: {packs!r}")
    top_level = {
        entry.name for entry in staging.iterdir() if entry.name != ".gitkeep"
    }
    if top_level != set(HD_PACKS) or any(
        not (staging / pack).is_dir() or (staging / pack).is_symlink()
        for pack in HD_PACKS
    ):
        raise VendorError("HD frame staging must contain exactly the four allowlisted pack directories")
    inputs = contract.get("inputs", {})
    expected = set(inputs)
    actual: set[str] = set()
    resolved: dict[str, Path] = {}
    for path in staging.rglob("*"):
        if path.is_symlink():
            raise VendorError(f"HD frame staging contains a symlink: {path}")
        if not path.is_file() or path.name == ".gitkeep":
            continue
        relative = path.relative_to(staging).as_posix()
        if relative.split("/", 1)[0] not in HD_PACKS:
            raise VendorError(f"HD frame staging contains a non-allowlisted pack: {relative}")
        safe = _contained(staging, relative)
        actual.add(relative)
        resolved[relative] = safe
    missing = sorted(expected - actual)
    extra = sorted(actual - expected)
    changed = sorted(
        relative
        for relative in expected & actual
        if sha256_file(resolved[relative]) != inputs[relative]
    )
    if missing or extra or changed:
        raise VendorError(
            "HD frame staging does not match the manifest: "
            f"{len(missing)} missing, {len(extra)} extra, {len(changed)} changed"
        )
    return resolved


def install_hd_frames(staging: Path, vendor_root: Path, manifest: Manifest) -> list[str]:
    """Copy staged images, scale four styles once, rescale/crop Capenna once."""
    vendor_root = vendor_root.expanduser().resolve()
    inputs = validate_hd_inputs(staging, manifest)
    changed: list[str] = []

    for relative, origin in sorted(inputs.items()):
        target_relative = f"data/{relative}"
        if target_relative not in manifest.entries:
            raise VendorError(f"HD frame input has no final manifest entry: {relative}")
        target = _contained(vendor_root, target_relative)
        if target.is_file() and sha256_file(target) == sha256_file(origin):
            continue
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(origin, target)
        changed.append(target_relative)

    for pack in HD_PACKS:
        relative = f"data/{pack}/style"
        target = _contained(vendor_root, relative)
        if _require_source_or_final(
            target,
            relative,
            manifest,
            lambda path: _write_scaled_style(path, 2, 750, 1046),
        ):
            changed.append(relative)

    capenna_prefix = f"data/{CAPENNA_PACK}/"
    source_entries = manifest.source_entries or {}
    for relative in sorted(source_entries):
        if not relative.startswith(capenna_prefix) or Path(relative).suffix.lower() not in IMAGE_SUFFIXES:
            continue
        target = _contained(vendor_root, relative)
        if _require_source_or_final(target, relative, manifest, _resize_capenna):
            changed.append(relative)

    capenna_style = f"data/{CAPENNA_PACK}/style"
    target = _contained(vendor_root, capenna_style)
    if _require_source_or_final(
        target,
        capenna_style,
        manifest,
        lambda path: _write_scaled_style(
            path,
            750 / CAPENNA_SOURCE_WIDTH,
            *CAPENNA_FINAL_SIZE,
        ),
    ):
        changed.append(capenna_style)

    return changed

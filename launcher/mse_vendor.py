"""Vendored Magic Set Editor tree under ``MSE/``.

Essentia pins upstream inputs, local HD overlay inputs, and exact final MSE files in
tracked ``MSE/manifest.json`` schema v2. Payload stays untracked because it contains
Wizards of the Coast frame art and proprietary fonts this CC0 repository cannot
redistribute. Deterministic installer reconstructs final tree without bundling assets.
"""

from __future__ import annotations

import hashlib
import json
import os
import re
import shutil
import subprocess
from dataclasses import dataclass
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
VENDOR_ROOT = REPO_ROOT / "MSE"
MANIFEST_PATH = VENDOR_ROOT / "manifest.json"
MANIFEST_VERSION = 2

# Layout inside MSE/. `data` and `resource` are what MSE itself loads; `bin` holds
# the executable and `fonts` the typefaces the frames call for by family name.
BIN_DIR = "bin"
DATA_DIR = "data"
FONT_DIR = "fonts"
RESOURCE_DIR = "resource"
EXECUTABLE_NAME = "magicseteditor"

# Every font the canonical renders were produced with. Seven are opened during a
# full render; matrixbsc.ttf completes the Matrix family for style variants the
# current cards do not exercise.
#
# MATRIX.TTF is deliberately absent. It ships with the Full Magic Pack, but making
# it visible to fontconfig changes the "Matrix" family resolution and alters 38 of
# the 50 tracked alpha renders. Do not add it back without re-attesting every
# package's renders.
FONT_FILES = (
    "beleren-bold_P1.01.ttf",
    "belerensmallcaps-bold.ttf",
    "matrixb.ttf",
    "matrixbsc.ttf",
    "ModMatrix.ttf",
    "mplantin.ttf",
    "mplantinit.ttf",
    "relay-medium.ttf",
)

# MSE resolves packages through ~/.magicseteditor and typefaces through fontconfig,
# neither of which can be pointed elsewhere by configuration.
USER_CONFIG_DIR = Path.home() / ".magicseteditor"
USER_LINKED_DIRS = (DATA_DIR, RESOURCE_DIR)
USER_FONT_DIR = Path.home() / ".local" / "share" / "fonts" / "Magic-Set-Editor"


# A Full Magic Pack checkout keeps the executable at its root and the typefaces in a
# space-separated directory, so vendored paths are not source paths.
SOURCE_LAYOUT = {
    f"{BIN_DIR}/{EXECUTABLE_NAME}": (EXECUTABLE_NAME, "mse"),
    FONT_DIR: ("Magic-Fonts", "Magic - Fonts", "fonts", "Fonts"),
}


class VendorError(RuntimeError):
    """A vendored tree cannot be built, verified, or wired to the host."""


@dataclass(frozen=True)
class Manifest:
    source: dict[str, str]
    entries: dict[str, str]
    source_entries: dict[str, str] | None = None
    hd_frames: dict | None = None

    def paths(self) -> list[str]:
        return sorted(self.entries)

    def source_paths(self) -> list[str]:
        return sorted(self.source_entries if self.source_entries is not None else self.entries)


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1 << 20), b""):
            digest.update(block)
    return digest.hexdigest()


def source_path(source_root: Path, relative: str) -> Path | None:
    """Translate a vendored path to its location in a Full Magic Pack checkout."""
    for candidate in SOURCE_LAYOUT.get(relative, ()):
        origin = source_root / candidate
        if origin.is_file():
            return origin
    head, _, tail = relative.partition("/")
    for candidate in SOURCE_LAYOUT.get(head, ()):
        origin = source_root / candidate / tail
        if origin.is_file():
            return origin
    origin = source_root / relative
    return origin if origin.is_file() else None


def _validate_hash_map(value: object, label: str, path: Path, *, allow_empty: bool = False) -> dict[str, str]:
    if not isinstance(value, dict) or (not value and not allow_empty):
        raise VendorError(f"MSE manifest lists no {label}: {path}")
    entries: dict[str, str] = {}
    for relative, digest in value.items():
        if (
            not isinstance(relative, str)
            or not relative
            or Path(relative).is_absolute()
            or ".." in Path(relative).parts
            or not isinstance(digest, str)
            or not re.fullmatch(r"[0-9a-f]{64}", digest)
        ):
            raise VendorError(f"MSE manifest has invalid {label} entry {relative!r}: {path}")
        entries[relative] = digest
    return entries


def load_manifest(path: Path = MANIFEST_PATH) -> Manifest:
    if not path.is_file():
        raise VendorError(f"MSE manifest missing: {path}")
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise VendorError(f"MSE manifest is not valid JSON: {path}") from exc
    version = payload.get("manifestVersion")
    if version != MANIFEST_VERSION:
        raise VendorError(
            f"Unsupported MSE manifest version {version!r} (expected {MANIFEST_VERSION}): {path}"
        )
    entries = _validate_hash_map(payload.get("files"), "final files", path)
    source_entries = _validate_hash_map(payload.get("sourceFiles"), "source files", path)
    if not source_entries.keys() <= entries.keys():
        raise VendorError(f"MSE manifest source files are not a subset of final files: {path}")
    hd_frames = payload.get("hdFrames")
    if not isinstance(hd_frames, dict):
        raise VendorError(f"MSE manifest has no HD frame overlay contract: {path}")
    packs = hd_frames.get("packs")
    inputs = _validate_hash_map(hd_frames.get("inputs"), "HD frame inputs", path, allow_empty=True)
    if not isinstance(packs, list) or any(not isinstance(pack, str) for pack in packs):
        raise VendorError(f"MSE manifest has invalid HD frame pack list: {path}")
    return Manifest(
        source=dict(payload.get("source", {})),
        entries=entries,
        source_entries=source_entries,
        hd_frames={"packs": packs, "inputs": inputs},
    )


def write_manifest(manifest: Manifest, path: Path = MANIFEST_PATH) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    source_entries = manifest.source_entries if manifest.source_entries is not None else manifest.entries
    hd_frames = manifest.hd_frames or {"packs": [], "inputs": {}}
    payload = {
        "manifestVersion": MANIFEST_VERSION,
        "source": manifest.source,
        "sourceFiles": {key: source_entries[key] for key in sorted(source_entries)},
        "hdFrames": {
            "packs": list(hd_frames.get("packs", [])),
            "inputs": {key: hd_frames.get("inputs", {})[key] for key in sorted(hd_frames.get("inputs", {}))},
        },
        "files": {key: manifest.entries[key] for key in manifest.paths()},
    }
    path.write_text(json.dumps(payload, indent=2, sort_keys=False) + "\n", encoding="utf-8")


def build_manifest(source_root: Path, relative_paths: list[str], source: dict[str, str]) -> Manifest:
    """Hash `relative_paths` under `source_root` into a manifest."""
    entries: dict[str, str] = {}
    missing: list[str] = []
    for relative in sorted(set(relative_paths)):
        candidate = source_path(source_root, relative)
        if candidate is None:
            missing.append(relative)
            continue
        entries[relative] = sha256_file(candidate)
    if missing:
        raise VendorError("Source files missing:\n  - " + "\n  - ".join(missing))
    return Manifest(
        source=source,
        entries=entries,
        source_entries=dict(entries),
        hd_frames={"packs": [], "inputs": {}},
    )


def verify_tree(vendor_root: Path = VENDOR_ROOT, manifest: Manifest | None = None) -> list[str]:
    """Report vendored files that are absent or no longer match the manifest.

    Unlisted files are ignored on purpose: setup installs the repo-owned export
    template into MSE/data, and that package is built from tracked source instead.
    """
    manifest = manifest or load_manifest()
    problems: list[str] = []
    for relative, expected in sorted(manifest.entries.items()):
        target = vendor_root / relative
        if not target.is_file():
            problems.append(f"missing: {relative}")
        elif sha256_file(target) != expected:
            problems.append(f"modified: {relative}")
    return problems


def install_tree(
    source_root: Path,
    vendor_root: Path = VENDOR_ROOT,
    manifest: Manifest | None = None,
) -> list[str]:
    """Copy every manifest file from `source_root` into `vendor_root`.

    Files already present with the right hash are left alone, so re-running is cheap.
    """
    manifest = manifest or load_manifest()
    source_root = source_root.expanduser().resolve()
    if not source_root.is_dir():
        raise VendorError(f"MSE source root is not a directory: {source_root}")

    copied: list[str] = []
    missing: list[str] = []
    source_entries = manifest.source_entries if manifest.source_entries is not None else manifest.entries
    for relative, expected in sorted(source_entries.items()):
        origin = source_path(source_root, relative)
        if origin is None:
            missing.append(relative)
            continue
        target = vendor_root / relative
        if target.is_file() and sha256_file(target) == expected:
            continue
        actual = sha256_file(origin)
        if actual != expected:
            missing.append(f"{relative} (sha256 {actual}, expected {expected})")
            continue
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(origin, target)
        shutil.copymode(origin, target)
        copied.append(relative)

    if missing:
        raise VendorError(
            f"Source tree does not match the manifest ({source_root}):\n  - "
            + "\n  - ".join(missing)
        )
    executable = vendor_root / BIN_DIR / EXECUTABLE_NAME
    if executable.is_file():
        executable.chmod(executable.stat().st_mode | 0o111)
    return copied


def link_user_packages(vendor_root: Path = VENDOR_ROOT, config_dir: Path = USER_CONFIG_DIR) -> list[str]:
    """Point ~/.magicseteditor at the vendored tree.

    MSE hardcodes this location, so it is the only way to make the editor load the
    repository's packages. Real directories are never removed; a pre-existing
    installation must be moved aside by hand.
    """
    linked: list[str] = []
    config_dir.mkdir(parents=True, exist_ok=True)
    for name in USER_LINKED_DIRS:
        target = (vendor_root / name).resolve()
        if not target.is_dir():
            raise VendorError(f"Vendored directory missing: {target}")
        link = config_dir / name
        if link.is_symlink():
            if Path(os.readlink(link)) == target:
                continue
            link.unlink()
        elif link.exists():
            raise VendorError(
                f"{link} is a real directory, not a symlink. Move it aside, then re-run setup."
            )
        link.symlink_to(target, target_is_directory=True)
        linked.append(f"{link} -> {target}")
    return linked


def install_user_fonts(vendor_root: Path = VENDOR_ROOT, font_dir: Path = USER_FONT_DIR) -> list[str]:
    """Publish the vendored fonts where fontconfig will find them."""
    installed: list[str] = []
    font_dir.mkdir(parents=True, exist_ok=True)
    for name in FONT_FILES:
        origin = vendor_root / FONT_DIR / name
        if not origin.is_file():
            raise VendorError(f"Vendored font missing: {origin}")
        target = font_dir / name
        if target.is_file() and sha256_file(target) == sha256_file(origin):
            continue
        shutil.copyfile(origin, target)
        installed.append(name)
    if installed and shutil.which("fc-cache"):
        subprocess.run(["fc-cache", "-f", str(font_dir)], check=False, capture_output=True)
    return installed

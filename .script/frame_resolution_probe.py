#!/usr/bin/env python3
"""Measure whether 2x frame art sharpens a 1500x2092 print master.

MSE draws each frame image into an element rect at the output resolution. If it
resamples from the source file, dropping 2x art into a 375-space stylesheet is
enough; if it rasterises in style space first, the extra pixels are thrown away
and the stylesheet has to be rewritten to 750-space. ADR 0030 branches on that,
so this probe exports the same card twice -- once with the vendored pack, once
with a Pillow-upscaled copy of it -- and compares FIND_EDGES energy over the
outer frame ring, a crop that holds frame art and neither illustration nor text.

The vendored tree is only ever read. MSE resolves packages through
``~/.magicseteditor`` (see ``launcher/mse_vendor.link_user_packages``) and has no
data-directory flag, so each export runs against a temporary ``HOME`` whose
``.magicseteditor/data`` is a throwaway copy of ``MSE/data``. Nothing this script
produces is committed as an asset.
"""

from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import sys
import tempfile
import unicodedata
from pathlib import Path

from PIL import Image, ImageFilter, ImageStat

REPO_ROOT = Path(__file__).resolve().parents[1]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from launcher.mse_hd_frames import HD_PACKS
VENDOR_ROOT = REPO_ROOT / "MSE"
VENDOR_DATA = VENDOR_ROOT / "data"
VENDOR_RESOURCE = VENDOR_ROOT / "resource"
MSE_CLI = VENDOR_ROOT / "bin" / "magicseteditor"
MANIFEST_RELATIVE = "MSE/manifest.json"
PROJECTS_DIR = REPO_ROOT / "cards_mse"

PRINT_TEMPLATE = "essentia-print.mse-export-template"
PRINT_WIDTH = 1500
PRINT_HEIGHT = 2092
# The outer border ring of the print master: frame art only, above the title bar
# and clear of both the illustration and every text box.
FRAME_BOX = (0, 0, 1500, 120)
# A Fusion card, the one stylesheet that already ships 750px art, exported with
# the vendored tree: the number an upscaled 375-space pack has to approach.
CONTROL_CARD = "Panzer Dragon"
UPSCALE_FACTOR = 2
VERDICT_THRESHOLD = 1.30
IMAGE_SUFFIXES = (".png", ".jpg", ".jpeg")


def edge_energy(path: Path, box: tuple[int, int, int, int]) -> float:
    """Mean FIND_EDGES response over `box` of the greyscale image at `path`."""
    with Image.open(path) as image:
        crop = image.convert("L").crop(box)
    return ImageStat.Stat(crop.filter(ImageFilter.FIND_EDGES)).mean[0]


def upscale_pack(source: Path, destination: Path, factor: int = UPSCALE_FACTOR) -> list[Path]:
    """Copy a style package, resampling every image up by `factor`."""
    shutil.copytree(source, destination)
    upscaled: list[Path] = []
    for path in sorted(destination.rglob("*")):
        if not path.is_file() or path.suffix.lower() not in IMAGE_SUFFIXES:
            continue
        with Image.open(path) as image:
            image.load()
            fmt = image.format
            resized = image.resize(
                (image.width * factor, image.height * factor), Image.LANCZOS
            )
        resized.save(path, format=fmt)
        upscaled.append(path)
    return upscaled


def assert_clean_vendored_tree() -> None:
    """Refuse to run while the pinned vendored tree has uncommitted changes."""
    result = subprocess.run(
        ["git", "status", "--porcelain", MANIFEST_RELATIVE],
        cwd=REPO_ROOT,
        capture_output=True,
        text=True,
        check=False,
    )
    if result.stdout.strip():
        raise RuntimeError(
            f"refusing to probe: {MANIFEST_RELATIVE} is dirty "
            f"({result.stdout.strip()}); commit or restore it first"
        )


def card_key(value: str) -> str:
    return "".join(
        character.casefold()
        for character in unicodedata.normalize("NFKD", value)
        if character.isalnum()
    )


def find_card(card_name: str, projects_dir: Path = PROJECTS_DIR) -> tuple[Path, Path]:
    """Locate `(project, card file)` for a card name below `projects_dir`."""
    wanted = card_key(card_name)
    # Aggregates are derived copies of the same cards, so they would double every
    # match; probe the authored project.
    matches = [
        path
        for path in sorted(projects_dir.rglob("card *"))
        if path.is_file()
        and not path.parent.name.endswith("_all_cards.mse-set")
        and card_key(path.name.removeprefix("card ")) == wanted
    ]
    if not matches:
        raise RuntimeError(f"no card file found for: {card_name}")
    if len(matches) > 1:
        raise RuntimeError(
            f"card name is ambiguous: {card_name} -> {[str(path) for path in matches]}"
        )
    return matches[0].parent, matches[0]


def single_card_set(card_file: Path, destination: Path) -> Path:
    """Copy the card's project to `destination`, keeping only that one card."""
    project = card_file.parent
    shutil.copytree(
        project,
        destination,
        ignore=shutil.ignore_patterns("render", "renders_print", "render-provenance.json"),
    )
    for path in destination.glob("card *"):
        if path.name != card_file.name:
            path.unlink()
    set_path = destination / "set"
    raw = set_path.read_bytes()
    text = raw.decode("utf-8-sig")
    kept = [
        line
        for line in text.splitlines(keepends=True)
        if not line.startswith("include_file: card ")
        or line.strip() == f"include_file: {card_file.name}"
    ]
    set_path.write_text(
        "".join(kept), encoding="utf-8-sig" if raw.startswith(b"\xef\xbb\xbf") else "utf-8"
    )
    return destination


def export_print_master(set_dir: Path, data_dir: Path, workdir: Path) -> Path:
    """Export one 1500x2092 print master, with MSE reading `data_dir`."""
    home = workdir / "home"
    (home / ".magicseteditor").mkdir(parents=True)
    (home / ".magicseteditor" / "data").symlink_to(data_dir)
    (home / ".magicseteditor" / "resource").symlink_to(VENDOR_RESOURCE)
    child = os.environ.copy()
    child["HOME"] = str(home)
    # Frames call typefaces by family name through fontconfig, which follows
    # HOME; keep the host's installed Magic fonts visible to the child.
    child["XDG_DATA_HOME"] = str(Path.home() / ".local" / "share")
    output = workdir / "out"
    output.mkdir()
    result = subprocess.run(
        [str(MSE_CLI), "--export", PRINT_TEMPLATE, str(set_dir), str(output / "print.txt")],
        capture_output=True,
        text=True,
        timeout=900,
        check=False,
        env=child,
    )
    exports = sorted(output.rglob("*.png"))
    if result.returncode != 0 or len(exports) != 1:
        raise RuntimeError(
            f"MSE print export failed ({result.returncode}), {len(exports)} PNGs\n"
            f"stdout={result.stdout[-2000:]}\nstderr={result.stderr[-2000:]}"
        )
    master = exports[0]
    with Image.open(master) as image:
        size = image.size
    if size != (PRINT_WIDTH, PRINT_HEIGHT):
        raise RuntimeError(
            f"print master is {size[0]}x{size[1]}, expected {PRINT_WIDTH}x{PRINT_HEIGHT}"
        )
    return master


def validated_pack_path(pack: str, data_root: Path = VENDOR_DATA) -> Path:
    """Resolve one known pack below `data_root`; reject traversal before mutation."""
    if pack not in HD_PACKS:
        raise RuntimeError(f"unsupported frame pack: {pack}")
    root = data_root.resolve()
    path = (root / pack).resolve()
    if root not in path.parents:
        raise RuntimeError(f"frame pack escapes MSE data: {pack}")
    if not path.is_dir():
        raise RuntimeError(f"frame pack is not installed: {pack}")
    return path


def probe(pack: str, card_name: str, control_card: str = CONTROL_CARD) -> dict:
    """Export the card with the vendored pack and with a 2x copy; measure both."""
    source_pack = validated_pack_path(pack)
    assert_clean_vendored_tree()
    _, card_file = find_card(card_name)
    _, control_file = find_card(control_card)
    with tempfile.TemporaryDirectory(prefix="frame-resolution-probe-") as temporary:
        root = Path(temporary)
        vendored_data = root / "data-sd"
        shutil.copytree(VENDOR_DATA, vendored_data, symlinks=True)
        upscaled_data = root / "data-hd"
        shutil.copytree(VENDOR_DATA, upscaled_data, symlinks=True)
        destination_pack = validated_pack_path(pack, upscaled_data)
        shutil.rmtree(destination_pack)
        upscale_pack(source_pack, destination_pack)

        card_set = single_card_set(card_file, root / "card.mse-set")
        control_set = single_card_set(control_file, root / "control.mse-set")

        sd_master = export_print_master(card_set, vendored_data, _workdir(root / "sd"))
        hd_master = export_print_master(card_set, upscaled_data, _workdir(root / "hd"))
        control_master = export_print_master(
            control_set, vendored_data, _workdir(root / "control")
        )

        sd = edge_energy(sd_master, FRAME_BOX)
        hd = edge_energy(hd_master, FRAME_BOX)
        control = edge_energy(control_master, FRAME_BOX)
    return {"sd": sd, "hd": hd, "ratio": hd / sd, "control": control}


def _workdir(path: Path) -> Path:
    path.mkdir(parents=True)
    return path


def verdict(ratio: float) -> str:
    return "art-swap-only" if ratio >= VERDICT_THRESHOLD else "rescale-to-750-space"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument(
        "--pack",
        required=True,
        choices=HD_PACKS,
        help="allowlisted style package under MSE/data",
    )
    parser.add_argument("--card", required=True, help="card name to export, e.g. 'Burning Abyss - Graff'")
    parser.add_argument("--control-card", default=CONTROL_CARD, help="Fusion-frame control card")
    args = parser.parse_args()

    result = probe(args.pack, args.card, args.control_card)
    print(
        json.dumps(
            {
                "event": "frame.resolution.probe",
                "pack": args.pack,
                "card": args.card,
                "controlCard": args.control_card,
                "box": list(FRAME_BOX),
                **{key: round(value, 4) for key, value in result.items()},
                "threshold": VERDICT_THRESHOLD,
                "verdict": verdict(result["ratio"]),
            },
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except RuntimeError as error:
        print(json.dumps({"event": "frame.resolution.probe.error", "error": str(error)}), file=sys.stderr)
        raise SystemExit(1)

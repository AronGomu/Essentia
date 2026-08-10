"""Report which HD frame packs and HD card arts are staged, and what's missing.

This is a report command only — it never modifies anything and always exits 0.
Run it any time to see how close `hd_inputs/` is to complete before phase B
(raising every MSE frame and card art to HD) can start.
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image

REPO_ROOT = Path(__file__).resolve().parents[1]
STAGING = REPO_ROOT / "hd_inputs" / "frames"
VENDORED = REPO_ROOT / "MSE" / "data"
ORIGINAL_IMAGES_ROOT = REPO_ROOT / "original_images"
ORIGINAL_IMAGES_HD_ROOT = REPO_ROOT / "original_images_hd"

PACKS = (
    "magic-sevenhalf.mse-style",
    "magic-m15-spellbook.mse-style",
    "magic-m15-sketch.mse-style",
    "magic-m15-showcase-praetor.mse-style",
)

IMAGE_SUFFIXES = (".png", ".jpg")


def frame_report(pack: str, staging: Path, vendored: Path) -> dict:
    """Compare a staged frame pack to its vendored SD counterpart."""
    pack_dir = staging / pack
    if not pack_dir.is_dir():
        return {"pack": pack, "present": False, "files": 0, "double": 0, "wrong_size": []}

    files = sorted(
        p for p in pack_dir.rglob("*") if p.is_file() and p.suffix.lower() in IMAGE_SUFFIXES
    )
    double = 0
    wrong_size = []
    for path in files:
        rel = path.relative_to(pack_dir)
        vendored_path = vendored / pack / rel
        with Image.open(path) as staged_image:
            staged_size = staged_image.size
        if vendored_path.is_file():
            with Image.open(vendored_path) as vendored_image:
                vendored_size = vendored_image.size
            expected = (vendored_size[0] * 2, vendored_size[1] * 2)
            if staged_size == expected:
                double += 1
            else:
                wrong_size.append(str(rel))
        else:
            wrong_size.append(str(rel))

    return {
        "pack": pack,
        "present": True,
        "files": len(files),
        "double": double,
        "wrong_size": wrong_size,
    }


def art_report(sd_root: Path, hd_root: Path) -> dict:
    """Compare original_images/ to original_images_hd/ by relative path."""
    sd_files = {
        p.relative_to(sd_root) for p in sd_root.rglob("*") if p.is_file()
    } if sd_root.is_dir() else set()
    hd_files = {
        p.relative_to(hd_root) for p in hd_root.rglob("*") if p.is_file()
    } if hd_root.is_dir() else set()

    missing = sd_files - hd_files
    sample = sorted(str(p) for p in missing)[:5]

    return {
        "sd": len(sd_files),
        "hd": len(hd_files),
        "missing": len(missing),
        "sample": sample,
    }


def main() -> int:
    for pack in PACKS:
        report = frame_report(pack, STAGING, VENDORED)
        present = "yes" if report["present"] else "no"
        print(
            f"hd.frames {report['pack']}: present={present} files={report['files']} "
            f"double={report['double']} wrong-size={len(report['wrong_size'])}"
        )

    art = art_report(ORIGINAL_IMAGES_ROOT, ORIGINAL_IMAGES_HD_ROOT)
    sample = ", ".join(art["sample"])
    print(f"hd.art: sd={art['sd']} hd={art['hd']} missing={art['missing']} e.g. {sample}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())

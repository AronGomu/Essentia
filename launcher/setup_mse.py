#!/usr/bin/env python3
"""Verify the vendored Magic Set Editor tree, wire it to this host, write .env."""

from __future__ import annotations

import argparse
import filecmp
import re
import shutil
import sys
from dataclasses import dataclass
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from launcher.mse_config import DEFAULT_ENV_PATH, MSEConfig, write_env_file
from launcher.mse_hd_frames import install_hd_frames
from launcher.mse_vendor import (
    FONT_FILES,
    VENDOR_ROOT,
    VendorError,
    install_tree,
    install_user_fonts,
    link_user_packages,
    load_manifest,
    verify_tree,
)

PROJECTS_DIR = REPO_ROOT / "cards_mse"
MSE_PACKAGES_DIR = REPO_ROOT / "mse_packages"
# MSE only loads packages from its own data directories, so repo-owned packages
# must be copied in. Print masters depend on this template being present and
# current; a stale copy silently exports at the wrong resolution.
#
# `magic.mse-game` is different in kind: it overwrites files the manifest also
# pins, because the set-symbol variations Essentia needs (a common symbol drawn
# in black on a transparent plate) can only be declared in the game package --
# the same block in a stylesheet is ignored. Files listed here are exempted from
# the manifest check in `main`; everything else in the package stays upstream.
REPO_PACKAGES = ("essentia-print.mse-export-template", "magic.mse-game")
EXECUTABLE_CANDIDATES = ("bin/magicseteditor", "bin/mse")
CLI_CANDIDATES = ("bin/magicseteditor", "bin/mse")
FONT_DIR_CANDIDATES = ("fonts",)
REQUIRED_FONT_FILES = FONT_FILES


@dataclass(frozen=True)
class RequiredAssets:
    games: set[str]
    styles: set[str]
    symbol_fonts: set[str]


def _mse_files(projects_dir: Path) -> list[Path]:
    files: list[Path] = []
    for project in projects_dir.rglob("*.mse-set"):
        if not project.is_dir() or any(
            parent.name.endswith(".mse-set") for parent in project.parents if parent != projects_dir
        ):
            continue
        files.extend(
            path
            for path in project.iterdir()
            if path.is_file() and (path.name == "set" or path.name.startswith("card "))
        )
    return files


def find_required_assets(projects_dir: Path = PROJECTS_DIR) -> RequiredAssets:
    """Derive required MSE packages from every checked-in project and card."""
    games: set[str] = set()
    stylesheet_names: set[str] = set()
    symbol_fonts: set[str] = set()

    for path in _mse_files(projects_dir):
        text = path.read_text(encoding="utf-8-sig", errors="replace")
        if path.name == "set":
            games.update(re.findall(r"^game:\s*(\S.*?)\s*$", text, re.MULTILINE))
        stylesheet_names.update(
            re.findall(r"^\s*stylesheet:\s*(\S.*?)\s*$", text, re.MULTILINE)
        )
        symbol_fonts.update(re.findall(r"([\w.-]+\.mse-symbol-font)", text))

    # MSE style package names are qualified by the game name.
    game = next(iter(games), "magic")
    styles = {
        name if name.endswith(".mse-style") else f"{game}-{name}.mse-style"
        for name in stylesheet_names
    }
    return RequiredAssets(games, styles, symbol_fonts)


def _package_files(package: Path) -> list[Path]:
    return sorted(path for path in package.rglob("*") if path.is_file())


def repo_package_status(data_dir: Path, packages_dir: Path = MSE_PACKAGES_DIR) -> list[str]:
    """Report repo-owned MSE packages that are missing or stale in the data dir."""
    problems: list[str] = []
    for name in REPO_PACKAGES:
        source = packages_dir / name
        if not source.is_dir():
            problems.append(f"repository package missing: {source}")
            continue
        installed = data_dir / name
        if not installed.is_dir():
            problems.append(f"not installed in MSE data directory: {name}")
            continue
        for path in _package_files(source):
            relative = path.relative_to(source)
            target = installed / relative
            if not target.is_file() or not filecmp.cmp(path, target, shallow=False):
                problems.append(f"stale in MSE data directory: {name}/{relative}")
    return problems


def install_repo_packages(data_dir: Path, packages_dir: Path = MSE_PACKAGES_DIR) -> list[str]:
    """Copy repo-owned MSE packages into the data dir, refreshing stale files."""
    installed: list[str] = []
    for name in REPO_PACKAGES:
        source = packages_dir / name
        if not source.is_dir():
            raise ValueError(f"repository MSE package missing: {source}")
        target = data_dir / name
        for path in _package_files(source):
            relative = path.relative_to(source)
            destination = target / relative
            if destination.is_file() and filecmp.cmp(path, destination, shallow=False):
                continue
            destination.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(path, destination)
            installed.append(f"{name}/{relative}")
    return installed


def _find_first(root: Path, candidates: tuple[str, ...]) -> Path | None:
    return next((root / candidate for candidate in candidates if (root / candidate).is_file()), None)


def _find_font_dir(root: Path) -> Path | None:
    return next((root / candidate for candidate in FONT_DIR_CANDIDATES if (root / candidate).is_dir()), None)


def validate_mse_root(
    root: Path = VENDOR_ROOT,
    projects_dir: Path = PROJECTS_DIR,
) -> tuple[MSEConfig | None, list[str]]:
    """Return a complete config or every actionable installation error."""
    root = root.expanduser().resolve()
    projects_dir = projects_dir.resolve()
    errors: list[str] = []
    if not root.is_dir():
        return None, [f"Vendored MSE tree is not a directory: {root}"]

    executable = _find_first(root, EXECUTABLE_CANDIDATES)
    if executable is None:
        errors.append(
            "MSE executable not found (expected one of: " + ", ".join(EXECUTABLE_CANDIDATES) + ")"
        )

    data_dir = root / "data"
    if not data_dir.is_dir():
        errors.append(f"MSE data directory not found: {data_dir}")

    font_dir = _find_font_dir(root)
    if font_dir is None:
        errors.append(
            f"MSE font directory not found (expected one of: {', '.join(FONT_DIR_CANDIDATES)})"
        )

    if not projects_dir.is_dir():
        errors.append(f"Repository MSE projects directory not found: {projects_dir}")

    assets = find_required_assets(projects_dir)
    if data_dir.is_dir():
        required_packages = (
            {f"{game}.mse-game" for game in assets.games}
            | assets.styles
            | assets.symbol_fonts
        )
        missing_packages = sorted(
            package for package in required_packages if not (data_dir / package).exists()
        )
        if missing_packages:
            errors.append("Missing MSE frame/data packages: " + ", ".join(missing_packages))

    if font_dir is not None:
        available_fonts = {path.name.casefold() for path in font_dir.iterdir() if path.is_file()}
        missing_fonts = [name for name in REQUIRED_FONT_FILES if name.casefold() not in available_fonts]
        if missing_fonts:
            errors.append("Missing Magic font files: " + ", ".join(missing_fonts))

    if errors or executable is None or font_dir is None:
        return None, errors

    cli = _find_first(root, CLI_CANDIDATES) or executable
    return (
        MSEConfig(
            root=root,
            executable=executable.resolve(),
            cli=cli.resolve(),
            data_dir=data_dir.resolve(),
            fonts_dir=font_dir.resolve(),
            projects_dir=projects_dir,
        ),
        [],
    )


def configure(
    root: Path = VENDOR_ROOT,
    env_path: Path = DEFAULT_ENV_PATH,
    projects_dir: Path = PROJECTS_DIR,
) -> MSEConfig:
    config, errors = validate_mse_root(root, projects_dir)
    if errors or config is None:
        detail = "\n  - ".join(errors)
        raise ValueError(f"Invalid Magic Set Editor installation:\n  - {detail}")

    # Install/refresh repo-owned packages, then re-verify. Setup fails rather
    # than leaving a stale export template that would produce wrong-size masters.
    for entry in install_repo_packages(config.data_dir):
        print(f"event=config.mse.package.installed file={entry}")
    remaining = repo_package_status(config.data_dir)
    if remaining:
        detail = "\n  - ".join(remaining)
        raise ValueError(f"Repository MSE packages are not installed cleanly:\n  - {detail}")

    write_env_file(
        env_path,
        {
            "MSE_ROOT": str(config.root),
            "MSE_EXECUTABLE": str(config.executable),
            "MSE_CLI": str(config.cli),
            "MSE_DATA_DIR": str(config.data_dir),
            "MSE_FONTS_DIR": str(config.fonts_dir),
            "MSE_PROJECTS_DIR": str(config.projects_dir),
        },
    )
    return config


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Verify the vendored Magic Set Editor tree and generate this repository's .env file."
    )
    parser.add_argument(
        "--source",
        type=Path,
        help=(
            "Populate MSE/ from a Full Magic Pack checkout. Required the first time, "
            "because the payload is untracked."
        ),
    )
    parser.add_argument(
        "--hd-frames",
        type=Path,
        help="Install four user-staged HD frame packs after copying the upstream source.",
    )
    parser.add_argument(
        "--verify",
        action="store_true",
        help="Only check MSE/ against MSE/manifest.json; change nothing.",
    )
    parser.add_argument("--env-file", type=Path, default=DEFAULT_ENV_PATH, help=argparse.SUPPRESS)
    args = parser.parse_args()
    if args.verify and (args.source is not None or args.hd_frames is not None):
        parser.error("--verify cannot be combined with --source or --hd-frames")
    if args.source is not None and args.hd_frames is None:
        parser.error("--source requires --hd-frames for the reproducible final HD tree")

    try:
        manifest = load_manifest()
        if args.source is not None:
            copied = install_tree(args.source, manifest=manifest)
            print(f"event=config.mse.vendored files={len(copied)} source={args.source}")
        if args.hd_frames is not None:
            installed = install_hd_frames(args.hd_frames, VENDOR_ROOT, manifest)
            print(f"event=config.mse.hd-frames files={len(installed)} source={args.hd_frames}")
        if not args.verify:
            for entry in install_repo_packages(VENDOR_ROOT / "data"):
                print(f"event=config.mse.package.installed file={entry}")
        problems = verify_tree(manifest=manifest)
    except VendorError as exc:
        parser.error(str(exc))

    if problems:
        detail = "\n  - ".join(problems[:20])
        extra = "" if len(problems) <= 20 else f"\n  ... and {len(problems) - 20} more"
        parser.error(
            f"Vendored MSE tree does not match MSE/manifest.json:\n  - {detail}{extra}\n"
            "Re-run with --source /path/to/Full-Magic-Pack --hd-frames hd_inputs/frames "
            "to reproduce the final tree."
        )

    if args.verify:
        print(f"event=config.mse.verified files={len(manifest.entries)} root={VENDOR_ROOT}")
        return 0

    try:
        config = configure(VENDOR_ROOT, args.env_file)
        for entry in link_user_packages():
            print(f"event=config.mse.linked link={entry}")
        for name in install_user_fonts():
            print(f"event=config.mse.font.installed file={name}")
    except (ValueError, VendorError) as exc:
        parser.error(str(exc))

    print(f"event=config.mse.written path={args.env_file.resolve()}")
    print(f"Magic Set Editor configuration written to: {args.env_file.resolve()}")
    print(f"  executable: {config.executable}")
    print(f"  data:       {config.data_dir}")
    print(f"  fonts:      {config.fonts_dir}")
    print(f"  projects:   {config.projects_dir}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

#!/usr/bin/env python3
"""Validate a Magic Set Editor installation and generate the local .env file."""

from __future__ import annotations

import argparse
import filecmp
import os
import re
import shutil
import sys
from dataclasses import dataclass
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from launcher.mse_config import DEFAULT_ENV_PATH, MSEConfig, write_env_file

PROJECTS_DIR = REPO_ROOT / "cards_mse"
MSE_PACKAGES_DIR = REPO_ROOT / "mse_packages"
# MSE only loads packages from its own data directories, so repo-owned packages
# must be copied in. Print masters depend on this template being present and
# current; a stale copy silently exports at the wrong resolution.
REPO_PACKAGES = ("essentia-print.mse-export-template",)
EXECUTABLE_CANDIDATES = (
    "mse.exe",
    "magicseteditor.exe",
    "mse",
    "magicseteditor",
    "Magic Set Editor.app/Contents/MacOS/mse",
    "Magic Set Editor.app/Contents/MacOS/Magic Set Editor",
)
CLI_CANDIDATES = ("mse.com", "magicseteditor.com", "mse", "magicseteditor")
FONT_DIR_CANDIDATES = ("Magic-Fonts", "fonts", "Fonts")
# These fonts are used by the Magic frames shipped with the reference full MSE bundle.
REQUIRED_FONT_FILES = (
    "beleren-bold_P1.01.ttf",
    "belerensmallcaps-bold.ttf",
    "MATRIX.TTF",
    "matrixb.ttf",
    "matrixbsc.ttf",
    "mplantin.ttf",
    "mplantinit.ttf",
)


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
    root: Path,
    projects_dir: Path = PROJECTS_DIR,
) -> tuple[MSEConfig | None, list[str]]:
    """Return a complete config or every actionable installation error."""
    root = root.expanduser().resolve()
    projects_dir = projects_dir.resolve()
    errors: list[str] = []
    if not root.is_dir():
        return None, [f"MSE root is not a directory: {root}"]

    executable = _find_first(root, EXECUTABLE_CANDIDATES)
    if executable is None:
        errors.append(
            "MSE executable not found (expected one of: "
            + ", ".join(EXECUTABLE_CANDIDATES)
            + ")"
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
    root: Path,
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


def _prompt_for_root() -> Path:
    while True:
        raw_path = input("Path to the Magic Set Editor root: ").strip().strip('"')
        if not raw_path:
            print("Please enter a path.", file=sys.stderr)
            continue
        root = Path(os.path.expandvars(raw_path)).expanduser()
        config, errors = validate_mse_root(root)
        if config is not None:
            return root
        print("This installation is not ready for Essentia:", file=sys.stderr)
        for error in errors:
            print(f"  - {error}", file=sys.stderr)
        print("Try another path.\n", file=sys.stderr)


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Validate Magic Set Editor and generate this repository's .env file."
    )
    parser.add_argument(
        "--mse-root",
        type=Path,
        help="MSE installation root. If omitted, the script prompts until a valid path is provided.",
    )
    parser.add_argument("--env-file", type=Path, default=DEFAULT_ENV_PATH, help=argparse.SUPPRESS)
    args = parser.parse_args()

    root = args.mse_root or _prompt_for_root()
    try:
        config = configure(root, args.env_file)
    except ValueError as exc:
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

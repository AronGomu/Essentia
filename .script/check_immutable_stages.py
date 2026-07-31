#!/usr/bin/env python3
"""Reject changes inside committed ALPHA, BETA, or Release packages."""

from __future__ import annotations

import argparse
import os
import subprocess
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parent
sys.path.insert(0, str(SCRIPT_DIR))

from release_package import (  # noqa: E402
    CARDS_ROOT,
    IMMUTABLE_STAGES,
    LifecycleError,
    validate_package,
)


def git(*args: str, repo_root: Path = REPO_ROOT) -> str:
    return subprocess.check_output(
        ["git", *args], cwd=repo_root, text=True, stderr=subprocess.STDOUT
    ).strip()


def existing_packages(
    base: str, stage: str, *, repo_root: Path = REPO_ROOT
) -> list[str]:
    prefix = f"cards_mse/{stage}"
    try:
        output = git(
            "ls-tree", "-d", "--name-only", f"{base}:{prefix}", repo_root=repo_root
        )
    except subprocess.CalledProcessError as exc:
        message = exc.output.casefold()
        if "not a valid object name" in message or "does not exist" in message:
            return []
        raise LifecycleError(f"unable to inspect immutable stage at {base}: {prefix}") from exc
    return [line for line in output.splitlines() if line]


def check_merge_base(base: str, *, repo_root: Path = REPO_ROOT) -> None:
    violations: list[str] = []
    for stage in sorted(IMMUTABLE_STAGES):
        for package in existing_packages(base, stage, repo_root=repo_root):
            path = f"cards_mse/{stage}/{package}"
            changed = git("diff", "--name-status", base, "--", path, repo_root=repo_root)
            if changed:
                violations.append(f"{path}:\n{changed}")
    if violations:
        raise LifecycleError(
            "committed lifecycle packages are immutable:\n" + "\n".join(violations)
        )


def validate_current_packages() -> None:
    for stage in sorted(IMMUTABLE_STAGES):
        root = CARDS_ROOT / stage
        if not root.is_dir():
            raise LifecycleError(f"missing immutable stage: {root}")
        for package in sorted(path for path in root.iterdir() if path.is_dir()):
            validate_package(package)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base", default=os.environ.get("BASE_SHA"))
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    if args.base and not set(args.base) == {"0"}:
        check_merge_base(args.base)
    validate_current_packages()
    print("immutable lifecycle stages OK")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (LifecycleError, OSError, subprocess.CalledProcessError) as exc:
        print(f"immutability error: {exc}", file=sys.stderr)
        raise SystemExit(1)

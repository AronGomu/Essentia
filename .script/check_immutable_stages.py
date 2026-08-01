#!/usr/bin/env python3
"""Reject changes inside committed locked lifecycle packages."""

from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parent
sys.path.insert(0, str(SCRIPT_DIR))

from release_package import (  # noqa: E402
    CARDS_ROOT,
    PUBLIC_STAGES,
    LifecycleError,
    locked_packages,
    validate_package,
)


def git(*args: str, repo_root: Path = REPO_ROOT) -> str:
    return subprocess.check_output(
        ["git", *args], cwd=repo_root, text=True, stderr=subprocess.STDOUT
    ).strip()


def package_status_at(base: str, package_git_path: str, *, repo_root: Path) -> str | None:
    try:
        raw = git("show", f"{base}:{package_git_path}/release.json", repo_root=repo_root)
    except subprocess.CalledProcessError as exc:
        message = exc.output.casefold()
        if "does not exist" in message or "exists on disk" in message or "not a valid object" in message:
            return None
        raise LifecycleError(
            f"unable to read release.json at {base}:{package_git_path}"
        ) from exc
    try:
        data = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise LifecycleError(f"invalid release.json at {base}:{package_git_path}") from exc
    status = data.get("status")
    return status if isinstance(status, str) else None


def existing_packages(base: str, stage: str, *, repo_root: Path = REPO_ROOT) -> list[str]:
    prefix = f"cards_mse/{stage}"
    try:
        output = git(
            "ls-tree", "-d", "--name-only", f"{base}:{prefix}", repo_root=repo_root
        )
    except subprocess.CalledProcessError as exc:
        message = exc.output.casefold()
        if "not a valid object name" in message or "does not exist" in message:
            return []
        raise LifecycleError(f"unable to inspect stage at {base}: {prefix}") from exc
    return [line for line in output.splitlines() if line]


def check_merge_base(base: str, *, repo_root: Path = REPO_ROOT) -> None:
    violations: list[str] = []
    for stage in sorted(PUBLIC_STAGES):
        for package in existing_packages(base, stage, repo_root=repo_root):
            path = f"cards_mse/{stage}/{package}"
            if package_status_at(base, path, repo_root=repo_root) != "locked":
                continue
            changed = git("diff", "--name-status", base, "--", path, repo_root=repo_root)
            if changed:
                violations.append(f"{path}:\n{changed}")
    if violations:
        raise LifecycleError(
            "committed locked packages are immutable:\n" + "\n".join(violations)
        )


def validate_current_packages() -> None:
    for stage in sorted(PUBLIC_STAGES):
        root = CARDS_ROOT / stage
        if not root.is_dir():
            raise LifecycleError(f"missing public stage: {root}")
    for package in locked_packages():
        validate_package(package, require_artifacts=True)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base", default=os.environ.get("BASE_SHA"))
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    if args.base and not set(args.base) == {"0"}:
        check_merge_base(args.base)
    validate_current_packages()
    print("locked lifecycle packages OK")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (LifecycleError, OSError, subprocess.CalledProcessError) as exc:
        print(f"immutability error: {exc}", file=sys.stderr)
        raise SystemExit(1)
